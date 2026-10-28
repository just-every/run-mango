import {retainedPrincipal} from '../agent-door/custody';
import {nativeAgent} from '../agent-door/native-context';
import {attributeContent,currentPreparer} from '../agent-door/outbound';
import type {Platform,DeliveryRequest} from '@/core/shared/platform';
import {ProviderTransportError} from '@/core/shared/platform';
import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
import {recordActivity} from '@/core/features/auth/activity-record';
import {configuredFrom} from '@/core/features/sender-verification/identity';
import {prepareHandoffCost,cancelHandoffCost,settleHandoffCost,settleHandoffFailure} from './cost-handoff';
import {findSavedReport,readSavedReport} from './saved-report-read';
import {reportAuthority} from './report-authority';
import {followingReportTime,reportSchedulePeriod,reportTitle,type SavedReportData} from './saved-report-model';
type Schedule={id:string;report_id:string;cadence:'weekly'|'monthly';recipients_json:string;next_at:number;enabled:number;authority_binding:string;created_by:string};
type Delivery={id:string;schedule_id:string;due_at:number;recipient_id:string;report_json:string};
export function createReportScheduler(platform:Platform,clock=Date.now) {
  const db=platform.database.$client;
  async function send(schedule:Schedule,delivery:Delivery) {
    if(!nativeAgent.getStore()){
      const principal=await retainedPrincipal(db,'report',schedule.id);
      if(principal){
        if(!platform.agentDoor)throw new Error('Native report agent door is not composed.');
        await platform.agentDoor.invoke('mango.reports.dispatch',{id:delivery.id,idempotency_key:`report-send:${delivery.id}`},principal);
        return;
      }
    }
    const now=clock(),authority=await reportAuthority(platform.database,schedule.created_by);
    let reason=!schedule.enabled?'schedule-paused':authority?.binding!==schedule.authority_binding?'schedule-authority-changed':undefined;
    const recipient=await db.prepare("SELECT email FROM oa_operators WHERE id=? AND status='active'").bind(delivery.recipient_id).first<{email:string}>();
    if(!recipient)reason='recipient-no-longer-active';
    if(reason){await finish('refused',reason);return;}
    const report=JSON.parse(delivery.report_json) as SavedReportData;
    const request:DeliveryRequest={recipientStepId:`scheduled-report:${delivery.id}`,idempotencyKey:`scheduled-report:${schedule.id}:${delivery.due_at}:${delivery.recipient_id}`,handoffStartedAt:new Date(now),to:recipient!.email,sender:configuredFrom(platform.config),callbackUrl:platform.config.publicBaseUrl.origin,
      content:{subject:`Mango scheduled report: ${report.title}`,text:[`${report.title} · ${report.from} to ${report.to} (UTC)`,report.note,'',JSON.stringify(report,null,2),'','Manage this operator-only report schedule in Insights.',new URL('/app/insights',platform.config.publicBaseUrl).toString()].join('\n')}};
    request.content=attributeContent(request.content,currentPreparer());
    const provider=(await platform.mailer.capabilities()).provider??platform.config.mailProvider??'unreported',cost={key:request.idempotencyKey,provider,operation:'provider-handoff' as const};
    try {
      await prepareHandoffCost(platform.database,platform.mailer,request,cost);
      // Re-read activation immediately before the existing mail door; a revoked
      // operator or restored profile has no outbound authority.
      const live=await db.prepare('SELECT enabled,authority_binding,created_by FROM insight_report_schedules WHERE id=?').bind(schedule.id).first<{enabled:number;authority_binding:string;created_by:string}>();
      if(!live?.enabled||(await reportAuthority(platform.database,live.created_by))?.binding!==live.authority_binding){await cancelHandoffCost(platform.database,cost.key);await finish('refused','schedule-authority-changed');return;}
      const currentRecipient=await db.prepare("SELECT email FROM oa_operators WHERE id=? AND status='active'").bind(delivery.recipient_id).first<{email:string}>();
      if(currentRecipient?.email!==recipient!.email){await cancelHandoffCost(platform.database,cost.key);await finish('refused','recipient-no-longer-active');return;}
      const sent=await platform.mailer.send(request);await settleHandoffCost(platform.database,platform.mailer,request,cost,sent).catch(()=>{});
      if(sent.disposition!=='accepted'){await finish('uncertain','handoff-unconfirmed');return;}
      await db.prepare("UPDATE insight_report_deliveries SET state='accepted',provider_message_id=?,updated_at=? WHERE id=?").bind(sent.providerMessageId,clock(),delivery.id).run();
      await audit('accepted');
    } catch(error) {
      if(error instanceof ProviderDeferredError){await cancelHandoffCost(platform.database,cost.key);await db.prepare("UPDATE insight_report_deliveries SET state='deferred',reason=?,next_at=?,updated_at=? WHERE id=?").bind(error.code,error.retryAt.getTime(),clock(),delivery.id).run();await audit('deferred',error.code);}
      else {await settleHandoffFailure(platform.database,platform.mailer,request,cost,error).catch(()=>{});await finish(error instanceof ProviderTransportError?'refused':'uncertain',error instanceof ProviderTransportError?'provider-refused':'handoff-unconfirmed');}
    }
    async function audit(state:string,detail?:string){await recordActivity(db,{key:`report-delivery:${delivery.id}:${state}`,action:`report-delivery.${state}`,entityType:'report-schedule',entityId:schedule.id,actorId:'scheduled-reports',actorType:'system',at:clock(),detail:{dueAt:delivery.due_at,recipientId:delivery.recipient_id,...(detail?{reason:detail}:{})}});}
    async function finish(state:'refused'|'uncertain',reason:string){await db.prepare('UPDATE insight_report_deliveries SET state=?,reason=?,updated_at=? WHERE id=?').bind(state,reason,clock(),delivery.id).run();await audit(state,reason);}
  }
  async function run(scheduledTime=clock()) {
    const now=clock(),tick=Math.min(scheduledTime,now);
    const deferred=(await db.prepare("SELECT * FROM insight_report_deliveries WHERE state='deferred' AND next_at<=? ORDER BY next_at,id LIMIT 20").bind(now).all<Delivery>()).results;
    for(const delivery of deferred){const schedule=await db.prepare('SELECT * FROM insight_report_schedules WHERE id=?').bind(delivery.schedule_id).first<Schedule>();if(!schedule)continue;
      const claim=await db.prepare("UPDATE insight_report_deliveries SET state='prepared',next_at=NULL,reason=NULL,updated_at=? WHERE id=? AND state='deferred' AND next_at<=? RETURNING id").bind(now,delivery.id,now).first();if(claim)await send(schedule,delivery);}
    const due=(await db.prepare('SELECT * FROM insight_report_schedules WHERE enabled=1 AND next_at<=? ORDER BY next_at,id LIMIT 10').bind(tick).all<Schedule>()).results;
    for(const schedule of due){
      const definition=await findSavedReport(platform.database,schedule.report_id),prior=await db.prepare('SELECT report_json FROM insight_report_deliveries WHERE schedule_id=? AND due_at=? LIMIT 1').bind(schedule.id,schedule.next_at).first<{report_json:string}>();
      if(!definition){await db.prepare('UPDATE insight_report_schedules SET enabled=0,updated_at=? WHERE id=?').bind(now,schedule.id).run();await recordActivity(db,{key:`report-missing:${schedule.id}:${schedule.next_at}`,action:'report-delivery.refused',entityType:'report-schedule',entityId:schedule.id,actorId:'scheduled-reports',actorType:'system',at:now,detail:{reason:'report-not-found'}});continue;}
      const authority=await reportAuthority(platform.database,schedule.created_by),period=reportSchedulePeriod(schedule.cadence,schedule.next_at);
      const reportJson=prior?.report_json??JSON.stringify(authority?.binding===schedule.authority_binding?await readSavedReport(platform.database,definition,period):{title:reportTitle(definition),...period,dayBoundary:'UTC',rows:[],note:'Report not read: native schedule authority changed.'});
      const recipients=JSON.parse(schedule.recipients_json) as string[];
      for(const recipient of recipients){const delivery:Delivery={id:crypto.randomUUID(),schedule_id:schedule.id,due_at:schedule.next_at,recipient_id:recipient,report_json:reportJson};
        const claim=await db.prepare(`INSERT INTO insight_report_deliveries(id,schedule_id,due_at,recipient_id,report_json,state,created_at,updated_at) SELECT ?,?,?,?,?,'prepared',?,? WHERE EXISTS(SELECT 1 FROM insight_report_schedules WHERE id=? AND enabled=1 AND next_at=?) ON CONFLICT(schedule_id,due_at,recipient_id) DO NOTHING RETURNING id`).bind(delivery.id,schedule.id,schedule.next_at,recipient,reportJson,now,now,schedule.id,schedule.next_at).first();
        if(claim)await send(schedule,delivery);
      }
      await db.prepare('UPDATE insight_report_schedules SET next_at=?,updated_at=? WHERE id=? AND next_at=?').bind(followingReportTime(schedule.cadence,schedule.next_at),now,schedule.id,schedule.next_at).run();
    }
  }
  return {run,async dispatch(id:string){
    const delivery=await db.prepare("SELECT * FROM insight_report_deliveries WHERE id=? AND state IN ('prepared','deferred')").bind(id).first<Delivery>();
    if(!delivery)return {status:'unavailable'};
    const schedule=await db.prepare('SELECT * FROM insight_report_schedules WHERE id=?').bind(delivery.schedule_id).first<Schedule>();
    if(!schedule)return {status:'unavailable'};
    await send(schedule,delivery);return {status:'processed',id};
  }};
}

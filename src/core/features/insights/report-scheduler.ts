import {ToolRefusal} from '@/vendor/base/agent-door/index.ts';
import {assertAgentHandoff} from '../settings/sender-authority';
import {admitWork} from '../agent-door/custody';
import {agentAction,agentAttribution} from '../agent-door/context';
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
const claimLeaseMs=5*60*1000;
export function createReportScheduler(platform:Platform,clock=Date.now) {
  const db=platform.database.$client;
  async function send(schedule:Schedule,delivery:Delivery) {
    if(!agentAction.getStore()&&await db.prepare("SELECT 1 FROM mango_agent_work WHERE kind='report' AND target_id=?").bind(schedule.id).first()){
      await admitWork(db,platform.agentDoor,'report',schedule.id,{deliveryId:delivery.id},()=>send(schedule,delivery));return;
    }
    // A recoverable claim precedes provider work. Only its token may cross
    // the sending boundary; an expired claimant cannot resume and send.
    const claimToken=crypto.randomUUID();
    const claim=await db.prepare("UPDATE insight_report_deliveries SET state='claimed',claim_token=?,updated_at=? WHERE id=? AND state='prepared'").bind(claimToken,clock(),delivery.id).run();
    if(!claim.meta.changes)return false;
    const now=clock(),authority=await reportAuthority(platform.database,schedule.created_by);
    let reason=!schedule.enabled?'schedule-paused':authority?.binding!==schedule.authority_binding?'schedule-authority-changed':undefined;
    const recipient=await db.prepare("SELECT email FROM oa_operators WHERE id=? AND status='active'").bind(delivery.recipient_id).first<{email:string}>();
    if(!recipient)reason='recipient-no-longer-active';
    if(reason){await finish('refused',reason);return;}
    const report=JSON.parse(delivery.report_json) as SavedReportData;
    const request:DeliveryRequest={recipientStepId:`scheduled-report:${delivery.id}`,idempotencyKey:`scheduled-report:${schedule.id}:${delivery.due_at}:${delivery.recipient_id}`,handoffStartedAt:new Date(now),to:recipient!.email,sender:configuredFrom(platform.config),callbackUrl:platform.config.publicBaseUrl.origin,
      content:{subject:`Mango scheduled report: ${report.title}`,text:[`${report.title} · ${report.from} to ${report.to} (UTC)`,report.note,'',JSON.stringify(report,null,2),'','Manage this operator-only report schedule in Insights.',new URL('/app/insights',platform.config.publicBaseUrl).toString()].join('\n')}};
    const attribution=agentAttribution();if(attribution)request.content.text+='\n\nPrepared by '+attribution.label;
    const provider=(await platform.mailer.capabilities()).provider??platform.config.mailProvider??'unreported',cost={key:request.idempotencyKey,provider,operation:'provider-handoff' as const};
    try {
      await prepareHandoffCost(platform.database,platform.mailer,request,cost);
      // Re-read activation immediately before the existing mail door; a revoked
      // operator or restored profile has no outbound authority.
      const live=await db.prepare('SELECT enabled,authority_binding,created_by FROM insight_report_schedules WHERE id=?').bind(schedule.id).first<{enabled:number;authority_binding:string;created_by:string}>();
      if(!live?.enabled||(await reportAuthority(platform.database,live.created_by))?.binding!==live.authority_binding){await cancelHandoffCost(platform.database,cost.key);await finish('refused','schedule-authority-changed');return;}
      const currentRecipient=await db.prepare("SELECT email FROM oa_operators WHERE id=? AND status='active'").bind(delivery.recipient_id).first<{email:string}>();
      if(currentRecipient?.email!==recipient!.email){await cancelHandoffCost(platform.database,cost.key);await finish('refused','recipient-no-longer-active');return;}
      await assertAgentHandoff(platform);
      const sending=await db.prepare("UPDATE insight_report_deliveries SET state='sending',updated_at=? WHERE id=? AND state='claimed' AND claim_token=?").bind(clock(),delivery.id,claimToken).run();
      if(!sending.meta.changes)return false;
      const sent=await platform.mailer.send(request);await settleHandoffCost(platform.database,platform.mailer,request,cost,sent).catch(()=>{});
      if(sent.disposition!=='accepted'){await finish('uncertain','handoff-unconfirmed');return;}
      await db.prepare("UPDATE insight_report_deliveries SET state='accepted',reason=NULL,provider_message_id=?,updated_at=? WHERE id=? AND claim_token=?").bind(sent.providerMessageId,clock(),delivery.id,claimToken).run();
      await audit('accepted');
    } catch(error) {
      if(error instanceof ToolRefusal){await cancelHandoffCost(platform.database,cost.key);await finish('refused',error.code);}
      else if(error instanceof ProviderDeferredError){await cancelHandoffCost(platform.database,cost.key);await db.prepare("UPDATE insight_report_deliveries SET state='deferred',reason=?,next_at=?,updated_at=? WHERE id=? AND claim_token=?").bind(error.code,error.retryAt.getTime(),clock(),delivery.id,claimToken).run();await audit('deferred',error.code);}
      else {await settleHandoffFailure(platform.database,platform.mailer,request,cost,error).catch(()=>{});await finish(error instanceof ProviderTransportError?'refused':'uncertain',error instanceof ProviderTransportError?'provider-refused':'handoff-unconfirmed');}
    }
    return true;
    async function audit(state:string,detail?:string){await recordActivity(db,{key:`report-delivery:${delivery.id}:${state}`,action:`report-delivery.${state}`,entityType:'report-schedule',entityId:schedule.id,actorId:'scheduled-reports',actorType:'system',at:clock(),detail:{dueAt:delivery.due_at,recipientId:delivery.recipient_id,...(detail?{reason:detail}:{})}});}
    async function finish(state:'refused'|'uncertain',reason:string){await db.prepare('UPDATE insight_report_deliveries SET state=?,reason=?,updated_at=? WHERE id=? AND claim_token=?').bind(state,reason,clock(),delivery.id,claimToken).run();await audit(state,reason);}
  }
  async function run(scheduledTime=clock()) {
    const now=clock(),tick=Math.min(scheduledTime,now);
    // A crash before the provider boundary is safe to recover. Once sending
    // began its outcome is unknown: retain it visibly for review, never resend.
    await db.prepare("UPDATE insight_report_deliveries SET state='prepared',claim_token=NULL,updated_at=? WHERE state='claimed' AND updated_at<=?").bind(now,now-claimLeaseMs).run();
    const interrupted=(await db.prepare("UPDATE insight_report_deliveries SET state='uncertain',reason='handoff-unconfirmed',updated_at=? WHERE state='sending' AND updated_at<=? RETURNING id,schedule_id,due_at,recipient_id").bind(now,now-claimLeaseMs).all<Delivery>()).results;
    for(const delivery of interrupted)await recordActivity(db,{key:`report-delivery:${delivery.id}:uncertain`,action:'report-delivery.uncertain',entityType:'report-schedule',entityId:delivery.schedule_id,actorId:'scheduled-reports',actorType:'system',at:now,detail:{dueAt:delivery.due_at,recipientId:delivery.recipient_id,reason:'handoff-unconfirmed'}});
    const prepared=(await db.prepare("SELECT * FROM insight_report_deliveries WHERE state='prepared' ORDER BY due_at,id LIMIT 20").all<Delivery>()).results;
    for(const delivery of prepared){const schedule=await db.prepare('SELECT * FROM insight_report_schedules WHERE id=?').bind(delivery.schedule_id).first<Schedule>();if(schedule)await send(schedule,delivery);}
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
  return {run,async sendPrepared(deliveryId:string){
    const delivery=await db.prepare("SELECT * FROM insight_report_deliveries WHERE id=? AND state='prepared'").bind(deliveryId).first<Delivery>();
    if(!delivery)return {status:'unavailable'};
    const schedule=await db.prepare('SELECT * FROM insight_report_schedules WHERE id=?').bind(delivery.schedule_id).first<Schedule>();
    if(!schedule)return {status:'unavailable'};
    const sent=await send(schedule,delivery);
    return {status:sent===false?'unavailable':'processed'};
  }};
}

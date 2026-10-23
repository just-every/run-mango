import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
import type {Platform,DeliveryRequest} from '@/core/shared/platform';
import {ProviderTransportError} from '@/core/shared/platform';
import {effectiveRole} from '@/core/features/auth/product-roles';
import {recordActivity} from '@/core/features/auth/activity-record';
import {prepareHandoffCost,cancelHandoffCost,settleHandoffCost,settleHandoffFailure} from '@/core/features/insights/cost-handoff';
import {configuredFrom,digest} from './identity';
import {VerificationError} from './types';
const day=86400000;
type Observation={id:string;observed_at:number;expires_at:number;result_json:string};
const operators=`FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.status='active'`;

export function senderEvidenceWaitReason(sendBy:number,now:number) {return sendBy<=now?'sender-evidence-deadline':'sender-evidence-lapsed';}

/** The scheduler and Home use this same native sender door. Claims precede mail;
 * interrupted/uncertain attempts remain visible and are never automatically repeated. */
export function createSenderRenewal(platform:Platform,clock=Date.now) {
  const db=platform.database.$client;
  async function inspect() {
    const now=clock(),stateId=await digest(['marketing-sender',platform.config.publicBaseUrl.origin]);
    const verification=platform.senderVerification;
    const evidence=verification?await verification.inspect(configuredFrom(platform.config)):undefined;
    const state=await db.prepare('SELECT observation_id,binding_digest,configuration_digest,revoked_at,reason FROM sender_verification_state WHERE id=?').bind(stateId).first<{observation_id:string|null;binding_digest:string;configuration_digest:string|null;revoked_at:number|null;reason:string}>();
    const prior=await db.prepare(`SELECT o.id,o.observed_at,o.expires_at,o.result_json FROM sender_verification_observations o JOIN sender_verification_challenges c ON c.id=o.challenge_id WHERE c.state_id=? ORDER BY o.observed_at DESC,o.id LIMIT 1`).bind(stateId).first<Observation>();
    const confirmer=await db.prepare(`SELECT json_extract(o.result_json,'$.owner.recipient') email FROM sender_verification_observations o JOIN sender_verification_challenges c ON c.id=o.challenge_id WHERE c.state_id=? AND json_extract(o.result_json,'$.reason')='owner-confirmed' ORDER BY o.observed_at DESC,o.id LIMIT 1`).bind(stateId).first<{email:string|null}>();
    const recent=await db.prepare("SELECT max(updated_at) at FROM sender_renewal_deliveries WHERE kind='connector' AND state='accepted' AND updated_at>=?").bind(now-3600000).first<{at:number|null}>();
    const changed=Boolean(prior&&state&&(state.observation_id!==prior.id||state.revoked_at));
    const lapsed=Boolean(prior&&prior.expires_at<=now),owner=prior?JSON.parse(prior.result_json).reason==='owner-confirmed':false;
    const due=Boolean(confirmer?.email&&prior&&(changed||lapsed||now>=(owner?prior.observed_at+23*day:prior.expires_at-3600000)));
    const final=Boolean(prior&&now>=prior.expires_at-day);
    const stage=changed?'changed':lapsed?'lapsed':due?(final?'final':'renewal'):recent?.at?'renewed':'current';
    const periodKey=prior&&state?await digest([prior.id,state.binding_digest,state.configuration_digest]):null;
    const waiting=await db.prepare(`SELECT count(*) count,min(r.send_by_at) deadline FROM recipient_steps r JOIN campaign_steps s ON s.id=r.step_id JOIN campaigns c ON c.id=r.campaign_id
      WHERE r.channel='email' AND r.transport_disposition='queued' AND r.handoff_started_at IS NULL AND s.scheduled_at<=? AND r.send_by_at>?
      AND c.state IN ('scheduled','dispatching','paused')`).bind(now,now).first<{count:number;deadline:number|null}>();
    const deliveries=periodKey?(await db.prepare('SELECT kind,state,reason,min(next_at) nextAt,count(*) count FROM sender_renewal_deliveries WHERE period_key=? GROUP BY kind,state,reason ORDER BY kind,state').bind(periodKey).all<{kind:string;state:string;reason:string|null;nextAt:number|null;count:number}>()).results:[];
    const status={visible:due||Boolean(recent?.at),due,stage,periodKey,ready:evidence?.ready??false,reason:changed?state?.reason:lapsed?'sender-evidence-lapsed':evidence?.reason??'observation-missing',
      observedAt:prior?.observed_at??null,expiresAt:prior?.expires_at??null,renewedAt:recent?.at??null,
      waitingMessages:changed||lapsed?waiting?.count??0:0,earliestDeadline:changed||lapsed?waiting?.deadline??null:null,
      automaticRenewal:verification?.receiverConfigured??false,deliveries};
    return {status,state,stateId,confirmer:confirmer?.email??null,now};
  }
  async function read(){return (await inspect()).status;}
  async function run() {
    const snapshot=await inspect(),{status,confirmer,now}=snapshot;
    if(!status.due||!status.periodKey||!platform.senderVerification)return {status};
    const recipients=(await db.prepare(`SELECT n.id,n.email ${operators} AND (${effectiveRole}='owner' OR lower(n.email)=lower(?)) ORDER BY n.id`).bind(confirmer??'').all<{id:string;email:string}>()).results;
    const reminderStage=status.stage==='changed'?'changed':status.stage==='final'||status.stage==='lapsed'?'final':'renewal';
    async function attempt(operatorId:string,kind:'reminder'|'diagnostic'|'connector',stage:string,work:()=>Promise<string|undefined>) {
      const claim=await db.prepare(`INSERT INTO sender_renewal_deliveries(id,period_key,stage,operator_id,kind,state,created_at,updated_at) VALUES(?,?,?,?,?,'prepared',?,?) ON CONFLICT(period_key,stage,operator_id,kind) DO UPDATE SET state='prepared',reason=NULL,next_at=NULL,updated_at=excluded.updated_at WHERE sender_renewal_deliveries.state='deferred' AND sender_renewal_deliveries.next_at<=excluded.updated_at RETURNING id`).bind(crypto.randomUUID(),status.periodKey,stage,operatorId,kind,now,now).first<{id:string}>();
      if(!claim)return;
      const id=claim.id;
      await recordActivity(db,{key:`sender-renewal:${id}`,action:`sender-renewal.${kind}`,entityType:'sender-renewal',entityId:id,actorId:'sender-evidence-renewal',actorType:'system',at:now,detail:{stage}});
      try {
        const messageId=await work();
        await db.prepare("UPDATE sender_renewal_deliveries SET state='accepted',provider_message_id=?,updated_at=? WHERE id=?").bind(messageId??null,clock(),id).run();
      } catch(error) {
        if(error instanceof ProviderDeferredError){await db.prepare("UPDATE sender_renewal_deliveries SET state='deferred',reason=?,next_at=?,updated_at=? WHERE id=?").bind(error.code,error.retryAt.getTime(),clock(),id).run();return;}
        const known=error instanceof VerificationError||error instanceof ProviderTransportError;
        await db.prepare('UPDATE sender_renewal_deliveries SET state=?,reason=?,updated_at=? WHERE id=?').bind(known?'refused':'uncertain',error instanceof VerificationError?error.reason:error instanceof ProviderTransportError?'provider-refused':'handoff-unconfirmed',clock(),id).run();
      }
    }
    for(const operator of recipients)await attempt(operator.id,'reminder',reminderStage,async()=>{
      const active=await db.prepare(`SELECT n.id ${operators} AND n.id=? AND (${effectiveRole}='owner' OR lower(n.email)=lower(?))`).bind(operator.id,confirmer??'').first();
      if(!active)throw new VerificationError('operator-no-longer-eligible');
      const request:DeliveryRequest={recipientStepId:`sender-renewal:${status.periodKey}:${reminderStage}:${operator.id}`,idempotencyKey:`sender-renewal:${status.periodKey}:${reminderStage}:${operator.id}`,handoffStartedAt:new Date(now),to:operator.email,sender:configuredFrom(platform.config),callbackUrl:platform.config.publicBaseUrl.origin,
        content:{subject:status.stage==='changed'?'Newsletter sender evidence changed':'Renew newsletter sender evidence',text:[`Your newsletter sender evidence ${status.stage==='changed'?'changed and needs a new diagnostic confirmation':status.stage==='lapsed'?'has lapsed':'needs renewal before it expires'}.`,
          `${status.waitingMessages} queued email messages need current sender evidence.`,status.earliestDeadline?`Earliest deadline: ${new Date(status.earliestDeadline).toISOString()}`:'No queued message deadline is recorded.',
          'Renewal never confirms on your behalf. Open Home or Settings to inspect the evidence and your diagnostic.',new URL('/app',platform.config.publicBaseUrl).toString()].join('\n')}};
      const provider=(await platform.mailer.capabilities()).provider??platform.config.mailProvider??'unreported',cost={key:request.idempotencyKey,provider,operation:'provider-handoff' as const};
      await prepareHandoffCost(platform.database,platform.mailer,request,cost);
      try {const sent=await platform.mailer.send(request);await settleHandoffCost(platform.database,platform.mailer,request,cost,sent).catch(()=>{});if(sent.disposition!=='accepted')throw new Error('handoff-unconfirmed');return sent.providerMessageId;}
      catch(error){if(error instanceof ProviderDeferredError)await cancelHandoffCost(platform.database,cost.key);else await settleHandoffFailure(platform.database,platform.mailer,request,cost,error).catch(()=>{});throw error;}
    });
    if(platform.senderVerification.receiverConfigured)await attempt('sender-evidence-renewal','connector','renewal',async()=>{
      const result=await platform.senderVerification!.renewUsingConnector(platform.mailer);if(result.kind!=='renewed')throw new VerificationError('receiver-not-configured');return undefined;
    });
    else {
      const last=recipients.find(operator=>operator.email.toLowerCase()===confirmer?.toLowerCase());
      if(last)await attempt(last.id,'diagnostic','renewal',async()=>{await platform.senderVerification!.sendOwnerConfirmation(last.email,platform.mailer);return undefined;});
    }
    return {status:await read()};
  }
  return {read,run};
}
export type SenderRenewalStatus=Awaited<ReturnType<ReturnType<typeof createSenderRenewal>['read']>>;

import type {Channel,Platform} from '@/core/shared/platform';
import {createLifecycleRepository} from './repository';
import {recheckDeliveryEligibility} from './delivery-eligibility';
import {renderSmsRecipientPreview} from '@/core/features/sms/recipient-preview';
import {smsProgrammeSchema} from '@/core/features/sms/policy';
import type {LifecycleRuntime} from './types';
import {smsSegments} from '@/core/features/sms/segments';
import {boundPolicy} from './transport-policy';
export async function nextDispatchDelay(platform:Platform,stepId:string) {
  const now=Date.now();
  const row=await platform.database.$client.prepare(`SELECT MIN(COALESCE(next_attempt_at,?)) due FROM recipient_steps
    WHERE step_id=? AND transport_disposition='queued' AND send_by_at>? AND COALESCE(next_attempt_at,?)<send_by_at`)
    .bind(now,stepId,now,now).first<{due:number|null}>();
  return row?.due==null?undefined:Math.max(1,Math.ceil((row.due-now)/1000));
}
export async function refreshDeliveryProgress(runtime:LifecycleRuntime,channel:Channel) {
  const platform=runtime.platform,repository=createLifecycleRepository(platform.database);
  const config=platform.config,db=platform.database.$client,now=Date.now();
  const provider=channel==='email'?config.mailProvider??'resend':'mobile-message';
  const credential=channel==='email'?config.mailProviderApiKey:config.modules.sms.enabled?config.modules.sms.config.providerApiKey:'';
  const policy=await boundPolicy(config.deliveryPolicies?.[provider],credential);
  const local=channel==='email'?config.emailHandoffsPerMinute:config.modules.sms.enabled?config.modules.sms.config.handoffsPerMinute:0;
  const rate=Math.min(local,policy?.providerPerMinute??local,policy?.carrierPerMinute??local);
  const pace=await db.prepare('SELECT next_at FROM provider_pacing WHERE scope=?').bind(`${provider}:${policy?.account??'installation'}`).first<{next_at:number}>();
  const reservations=(await db.prepare('SELECT reserved_at,units FROM provider_pacing_reservations WHERE scope=? AND reserved_at>? ORDER BY reserved_at')
    .bind(`${provider}:${policy?.account??'installation'}`,now-60000).all<{reserved_at:number;units:number}>()).results;
  const backlog=await db.prepare(`SELECT r.id,r.step_id,r.send_by_at,
    MAX(COALESCE(r.next_attempt_at,?),s.scheduled_at) eligible_at,
    json_extract(r.outbound_request_json,'$.content.text') text
    FROM recipient_steps r JOIN campaigns c ON c.id=r.campaign_id AND c.active_revision_id=r.revision_id
    JOIN campaign_steps s ON s.id=r.step_id JOIN contacts ct ON ct.id=r.contact_id
    WHERE r.channel=? AND r.transport_disposition='queued' AND r.send_by_at>? AND COALESCE(r.next_attempt_at,?)<r.send_by_at
    AND c.state IN ('scheduled','dispatching') AND (CASE WHEN r.channel='email' THEN ct.email_status ELSE ct.sms_status END)='subscribed'
    AND NOT EXISTS(SELECT 1 FROM campaign_channel_pauses p WHERE p.campaign_id=r.campaign_id AND p.revision_id=r.revision_id AND p.channel=r.channel AND p.resumed_at IS NULL)
    ORDER BY eligible_at,r.id`).bind(now,channel,now,now).all<{id:string;step_id:string;send_by_at:number;eligible_at:number;text:string|null}>();
  let cursor=Math.max(now,pace?.next_at??now);
  const estimates=new Map<string,number>(),unknownSteps=new Set<string>();
  if(rate>0)for(const row of backlog.results) {
    cursor=Math.max(cursor,row.eligible_at);
    let units=1;
    if(channel==='sms') {
      if(row.text!==null)units=smsSegments(row.text).segments;
      else {
        const envelope=await repository.getDeliveryEnvelope(row.id);
        if(!envelope){unknownSteps.add(row.step_id);continue;}
        const eligible=await recheckDeliveryEligibility(runtime,repository,envelope,new Date(now));
        if(!eligible.eligible)continue;
        const frozen=await db.prepare('SELECT sender,policy_json FROM sms_approval_policies WHERE revision_id=?').bind(envelope.recipient.revisionId).first<{sender:string;policy_json:string}>();
        if(!frozen){unknownSteps.add(row.step_id);continue;}
        try {
          const rendered=await renderSmsRecipientPreview(platform,{revision:envelope.revision,links:envelope.links,
            values:eligible.contact.personalisation??{},sendByAt:envelope.recipient.sendByAt,
            policy:smsProgrammeSchema.parse(JSON.parse(frozen.policy_json).policy),sender:frozen.sender},new Date(now));
          units=rendered.segments;
        }catch{unknownSteps.add(row.step_id);continue;}
      }
    }
    if(units>rate)continue;
    while(reservations.length) {
      while(reservations.length&&reservations[0].reserved_at<=cursor-60000)reservations.shift();
      if(reservations.reduce((total,item)=>total+item.units,0)+units<=rate)break;
      cursor=Math.max(cursor,reservations[0].reserved_at+60000);
    }
    if(cursor>=row.send_by_at)continue;
    reservations.push({reserved_at:cursor,units});
    cursor+=Math.max(1000,units*60000/rate);
    estimates.set(row.step_id,cursor);
  }
  for(const stepId of unknownSteps)estimates.delete(stepId);
  // A campaign's ETA includes earlier eligible work sharing this account budget.
  // Future steps do not multiply throughput, and held work has no promised ETA.
  await db.prepare(`UPDATE step_dispatches SET estimated_completion_at=NULL,updated_at=?
    WHERE step_id IN (SELECT id FROM campaign_steps WHERE channel=?)`).bind(now,channel).run();
  for(const [stepId,estimate] of estimates)await db.prepare(`UPDATE step_dispatches SET estimated_completion_at=?,updated_at=?
    WHERE step_id=? AND state='dispatching' AND NOT EXISTS(SELECT 1 FROM provider_outages WHERE channel=? AND state='paused')`)
    .bind(estimate,now,stepId,channel).run();
}

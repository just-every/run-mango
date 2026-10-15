import {sha256} from '@/core/shared/ids';
import type {Platform,DeliveryRequest} from '@/core/shared/platform';
import {ProviderTransportError} from '@/core/shared/platform';
import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';

/** Durable one-shot notice fence, bounded definite-refusal retries, no blind resend.
 * Reachability is read from the scheduled probe; notifications never run extra probes. */
export async function notifyProviderOutages(platform:Platform) {
  const db=platform.database.$client,now=Date.now();
  const health=await db.prepare("SELECT 1 FROM provider_health WHERE adapter='mail.sender.v1' AND channel='email' AND reachable=1 AND observed_at>=?")
    .bind(now-platform.config.providerReconciliationIntervalMinutes*60000).first();
  if(!health)return;
  const capabilities=await platform.mailer.capabilities();
  const provider=capabilities.provider,credentialDigest=await sha256(platform.config.mailProviderApiKey);
  const unknown=(await db.prepare("SELECT * FROM provider_outage_notifications WHERE state='handoff-unknown' ORDER BY updated_at LIMIT 10").all<Record<string,unknown>>()).results;
  for(const row of unknown) {
    // Unknown notification acceptance belongs to its original credential too.
    // A replacement provider cannot look it up, expire it or send it again.
    if(!provider||row.provider!==provider||row.provider_credential_digest!==credentialDigest) {
      await db.prepare("UPDATE provider_outage_notifications SET last_error='reconciliation-authority' WHERE outage_id=? AND operator_id=? AND state='handoff-unknown'").bind(row.outage_id,row.operator_id).run();
      continue;
    }
    if(row.provider==='sendgrid')continue;
    if(row.lookup_until&&Number(row.lookup_until)<=now) {await db.prepare("UPDATE provider_outage_notifications SET state='outcome-unconfirmed' WHERE outage_id=? AND operator_id=?").bind(row.outage_id,row.operator_id).run();continue;}
    try {
      const request=JSON.parse(String(row.request_json));request.handoffStartedAt=new Date(request.handoffStartedAt);
      const result=await platform.mailer.reconcile(request,{providerMessageId:row.provider_message_id?String(row.provider_message_id):undefined,cursor:row.reconcile_cursor?String(row.reconcile_cursor):undefined});
      const accepted=result.facts.find(f=>['accepted','delivered'].includes(f.kind)&&f.providerMessageId);
      await db.prepare('UPDATE provider_outage_notifications SET state=?,provider_message_id=COALESCE(?,provider_message_id),reconcile_cursor=?,updated_at=? WHERE outage_id=? AND operator_id=?')
        .bind(accepted?'accepted':'handoff-unknown',accepted?.providerMessageId??null,result.exhausted?null:result.cursor??null,now,row.outage_id,row.operator_id).run();
    }catch{/* No assertion of nonacceptance; the durable fence remains. */}
  }
  const rows=await db.prepare(`SELECT o.id,o.channel,o.last_error,u.id operator_id,u.email
    FROM provider_outage_notifications n JOIN provider_outages o ON o.id=n.outage_id JOIN oa_operators u ON u.id=n.operator_id
    WHERE u.status='active' AND n.state='pending' AND (n.next_attempt_at IS NULL OR n.next_attempt_at<=?) LIMIT 20`)
    .bind(now).all<{id:string;channel:string;last_error:string;operator_id:string;email:string}>();
  for(const row of rows.results) {
    const key=`outage:${row.id}:${row.operator_id}`;
    const request:DeliveryRequest={recipientStepId:key,idempotencyKey:key,handoffStartedAt:new Date(now),to:row.email,sender:platform.config.mailAuthFrom,
      content:{subject:'Mango provider outage',text:`${row.channel} dispatch was paused. ${row.last_error} Open Mango to review recovery and independent source, sender and provider restrictions.`},callbackUrl:platform.config.publicBaseUrl.toString()};
    await db.prepare("UPDATE provider_outage_notifications SET request_json=? WHERE outage_id=? AND operator_id=? AND request_json='null'")
      .bind(JSON.stringify(request),row.id,row.operator_id).run();
    const claim=await db.prepare(`UPDATE provider_outage_notifications SET state='handoff-unknown',provider=?,provider_credential_digest=?,attempt_count=attempt_count+1,
      first_attempt_at=COALESCE(first_attempt_at,?),lookup_until=COALESCE(lookup_until,?),updated_at=? WHERE outage_id=? AND operator_id=? AND state='pending'
      AND (next_attempt_at IS NULL OR next_attempt_at<=?) AND EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND status='active') RETURNING *`)
      .bind(provider??null,credentialDigest,now,capabilities.effectiveReconciliation?now+capabilities.reconciliationWindowMs:null,now,row.id,row.operator_id,now,row.operator_id).first<Record<string,unknown>>();
    if(!claim)continue;
    try {
      const saved=JSON.parse(String(claim.request_json));saved.handoffStartedAt=new Date(saved.handoffStartedAt);
      const handoff=await platform.mailer.send(saved);
      await db.prepare('UPDATE provider_outage_notifications SET state=?,provider_message_id=?,updated_at=? WHERE outage_id=? AND operator_id=?')
        .bind(handoff.disposition,handoff.providerMessageId||null,Date.now(),row.id,row.operator_id).run();
    } catch(error) {
      if(error instanceof ProviderDeferredError) {
        await db.prepare("UPDATE provider_outage_notifications SET state='pending',attempt_count=attempt_count-1,first_attempt_at=CASE WHEN attempt_count=1 THEN NULL ELSE first_attempt_at END,lookup_until=CASE WHEN attempt_count=1 THEN NULL ELSE lookup_until END,next_attempt_at=?,last_error=?,updated_at=? WHERE outage_id=? AND operator_id=?")
          .bind(error.retryAt.getTime(),error.code,Date.now(),row.id,row.operator_id).run();
      }else if(error instanceof ProviderTransportError) {
        const delay=[60,180,600,900,1200][Number(claim.attempt_count)-1];
        const retry=delay===undefined?Infinity:Date.now()+Math.max(delay,error.failure.retryAfterSeconds??0)*1000;
        const allowed=!error.failure.permanent&&retry<=Number(claim.first_attempt_at)+3600000;
        await db.prepare('UPDATE provider_outage_notifications SET state=?,next_attempt_at=?,last_error=?,updated_at=? WHERE outage_id=? AND operator_id=?')
          .bind(allowed?'pending':'failed',allowed?retry:null,error.failure.code,Date.now(),row.id,row.operator_id).run();
      }
    }
  }
}

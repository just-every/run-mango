import type {DeliveryRequest,Platform,VerifiedWebhook} from '@/core/shared/platform';
import {canonicalEmail} from '../audience/identity';
import {resendEvents} from './resend-account';

/** Only an actual accepted marketing handoff can start this connection's watch. */
export async function recordSendingAcceptance(platform:Platform,generation:string,request:DeliveryRequest,acceptedAt:Date) {
  if(request.purpose!=='marketing')return;
  await platform.database.$client.prepare(`UPDATE recipient_steps SET sending_generation=?,sending_accepted_at=COALESCE(sending_accepted_at,?)
    WHERE id=? AND idempotency_key=? AND channel='email'`)
    .bind(generation,acceptedAt.getTime(),request.recipientStepId,request.idempotencyKey).run();
}

/** Called only after this connection's signature verifier, never by reconciliation.
 * Preserve original event time: re-signing an old payload cannot renew health. */
export async function recordSignedSendingEvent(platform:Platform,generation:string,verified:VerifiedWebhook) {
  const event=JSON.parse(verified.rawBody),data=event?.data;
  if(!resendEvents.includes(event?.type)||typeof event.created_at!=='string'||!data
    ||typeof data.email_id!=='string'||!Array.isArray(data.to)||data.to.length!==1||typeof data.to[0]!=='string')return;
  const at=Date.parse(event.created_at);
  if(!Number.isFinite(at)||at>verified.receivedAt.getTime()+1000)return;
  await platform.database.$client.prepare(`UPDATE recipient_steps
    SET sending_signed_event_at=MAX(COALESCE(sending_signed_event_at,0),?)
    WHERE sending_generation=? AND provider='resend' AND provider_message_id=? AND destination=?
      AND sending_accepted_at IS NOT NULL AND ?>=COALESCE(handoff_started_at,sending_accepted_at)-1000
      AND EXISTS(SELECT 1 FROM sending_connection WHERE id=1 AND generation=? AND state='connected' AND connected_at<=?+1000)`)
    .bind(at,generation,data.email_id,canonicalEmail(data.to[0]),at,generation,at).run();
}

export async function sendingEventsSilent(platform:Platform,generation:string,now:number) {
  const row=await platform.database.$client.prepare(`SELECT MIN(sending_accepted_at) AS first_unobserved
    FROM recipient_steps WHERE sending_generation=? AND sending_accepted_at>
      COALESCE((SELECT MAX(MAX(sending_signed_event_at,sending_accepted_at)) FROM recipient_steps
        WHERE sending_generation=? AND sending_signed_event_at IS NOT NULL),0)`)
    .bind(generation,generation).first<{first_unobserved:number|null}>();
  return row?.first_unobserved!=null&&row.first_unobserved<=now-86400000;
}

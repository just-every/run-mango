import type {Database} from '@/core/platform/db/client';
import {ProviderTransportError} from '@/core/shared/platform';
import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
/** One destination owns a marketing interval across campaigns and programmes.
 * Until acceptance is known, reserve through the send deadline plus the interval:
 * every possible POST is before that deadline. Never recycle an ambiguous claim. */
export async function claimSmsFrequency(database:Database,input:{destinationHash:string;contactId:string;recipientStepId:string;interval:number;sendByAt:number}){
 const db=database.$client,token=crypto.randomUUID(),now=Date.now();
 const row=await db.prepare(`INSERT INTO sms_frequency_claims(destination_hash,contact_id,recipient_step_id,claim_token,next_at)
 VALUES(?,?,?,?,?) ON CONFLICT(destination_hash) DO UPDATE SET contact_id=excluded.contact_id,
 recipient_step_id=excluded.recipient_step_id,claim_token=excluded.claim_token,next_at=excluded.next_at
 WHERE sms_frequency_claims.next_at<=? RETURNING claim_token`)
 .bind(input.destinationHash,input.contactId,input.recipientStepId,token,input.sendByAt+input.interval,now).first();
 if(!row){
  const prior=await db.prepare('SELECT next_at FROM sms_frequency_claims WHERE destination_hash=?').bind(input.destinationHash).first<{next_at:number}>();
  throw new ProviderDeferredError(new Date(prior?.next_at??now+input.interval),'sms-frequency-window');
 }
 return {
  async accepted(){await db.prepare('UPDATE sms_frequency_claims SET next_at=? WHERE destination_hash=? AND claim_token=?').bind(Date.now()+input.interval,input.destinationHash,token).run();},
  async failed(error:unknown){
   if(error instanceof ProviderDeferredError||error instanceof ProviderTransportError&&error.failure.outcome==='known-not-accepted'){
    await db.prepare('DELETE FROM sms_frequency_claims WHERE destination_hash=? AND claim_token=?').bind(input.destinationHash,token).run();
   }
  },
 };
}

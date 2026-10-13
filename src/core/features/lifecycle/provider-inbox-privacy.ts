import {canonicalEmail,canonicalPhone} from '@/core/features/audience/identity';
import {sha256} from '@/core/shared/ids';
import type {ProviderFact,Channel} from './types';
/** Unmatched late provider events must not reintroduce an erased address. Keep
 * verified replay evidence without readable destinations or provider references;
 * ordinary facts for a current contact retain their existing diagnostic detail. */
export async function privateInboxFact(db:D1Database,salt:string,provider:string,channel:Channel,fact:ProviderFact):Promise<ProviderFact>{
  const raw=typeof fact.detail.destination==='string'?fact.detail.destination:'';
  const destination=channel==='email'?canonicalEmail(raw):canonicalPhone(raw);
  const known=destination?await db.prepare(channel==='email'
    ?'SELECT 1 FROM contact_email_addresses WHERE email=? LIMIT 1'
    :'SELECT 1 FROM contact_phones WHERE phone_e164=? LIMIT 1').bind(destination).first():null;
  const keyword=['stop','stopall','optout','revoke','unsubscribe','cancel','end','quit','start','unstop','yes','help','info'].includes(String(fact.detail.action).toLowerCase())?String(fact.detail.action).toLowerCase():undefined;
  if(known)return fact.kind==='sms-reply'?{...fact,detail:{...fact.detail,action:keyword}}:fact;
  return {identity:await sha256(`${salt}:provider-event:${provider}:${fact.identity}`),kind:fact.kind,occurredAt:fact.occurredAt,payloadDigest:fact.payloadDigest,
    detail:{...(destination?{destinationHash:await sha256(`${salt}:${destination}`)}:{}),hard:fact.detail.hard===true,action:keyword,providerEvent:fact.kind}};
}

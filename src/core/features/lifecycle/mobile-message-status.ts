import {canonicalPhone} from '@/core/features/audience/identity';
import {decodeProviderReference} from '@/core/shared/provider-reference';
import {sha256} from '@/core/platform/crypto';
import {smsSegments} from '@/core/features/sms/segments';
import type {Database} from '@/core/platform/db/client';
import type {DeliveryRequest,ProviderFact} from '@/core/shared/platform';

/** Mobile Message documents received_at as UTC, including its zone-less example. */
export function mobileMessageTime(value:unknown) {
  if(typeof value!=='string'||!value.trim())throw new Error('Mobile Message provider event time missing.');
  const normalized=/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value)?value.replace(' ','T')+'Z':value;
  const date=new Date(normalized);if(!Number.isFinite(date.getTime()))throw new Error('Mobile Message provider event time invalid.');return date;
}
export async function mobileMessageStatus(data:Record<string,unknown>):Promise<ProviderFact> {
  const status=data.status;
  if(!['delivered','failed'].includes(String(status)))throw new Error('Unsupported Mobile Message status receipt.');
  // The provider documents bare international digits in status `to`; our
  // transport accepts Australian numbers only. Never infer a local prefix.
  if(typeof data.to!=='string'||!/^\+?61\d{9}$/.test(data.to))throw new Error('Mobile Message status destination invalid.');
  const part=Number(data.part_number),total=Number(data.total_parts),destination=canonicalPhone(`+${data.to.replace(/^\+/,'')}`);
  const reference=typeof data.custom_ref==='string'?decodeProviderReference(data.custom_ref):undefined;
  if(typeof data.message_id!=='string'||!data.message_id||!destination||typeof data.sender!=='string'||!data.sender
    ||typeof data.message!=='string'||!reference||!Number.isSafeInteger(part)||!Number.isSafeInteger(total)||part<1||part>total||total>10)throw new Error('Mobile Message part receipt identity invalid.');
  const occurredAt=mobileMessageTime(data.received_at),payloadDigest=await sha256(JSON.stringify(data));
  // An individual part is acceptance evidence, never a whole-message delivery.
  return {identity:`mobile-message:${data.message_id}:part:${part}:${status}:${occurredAt.toISOString()}:${payloadDigest}`,
    providerMessageId:data.message_id,kind:'accepted',occurredAt,payloadDigest,
    detail:{destination,sender:data.sender,message:data.message,mangoReference:reference,partNumber:part,totalParts:total,partStatus:status,providerEvent:'part-status'}};
}

export async function matchesMobileMessagePart(database:Database,recipientStepId:string,fact:ProviderFact) {
  const row=await database.$client.prepare('SELECT outbound_request_json,actual_sender,provider_message_id FROM recipient_steps WHERE id=?').bind(recipientStepId)
    .first<{outbound_request_json:string|null;actual_sender:string|null;provider_message_id:string|null}>();
  if(!row?.outbound_request_json)return false;
  const request=JSON.parse(row.outbound_request_json) as DeliveryRequest;
  return fact.detail.destination===request.to&&fact.detail.message===request.content.text
    &&fact.detail.sender===(row.actual_sender??request.sender)&&fact.detail.mangoReference===request.idempotencyKey
    &&fact.detail.totalParts===smsSegments(request.content.text).segments
    &&(!row.provider_message_id||row.provider_message_id===fact.providerMessageId);
}

/** Recompute from immutable verified inbox evidence, so duplicates, reordered
 * receipts, restarts and a webhook arriving before send acceptance all converge. */
export async function aggregateMobileMessageParts(database:Database,recipientStepId:string):Promise<ProviderFact|undefined> {
  const db=database.$client;
  const row=await db.prepare('SELECT outbound_request_json,provider_message_id,actual_sender FROM recipient_steps WHERE id=? AND channel=\'sms\'').bind(recipientStepId)
    .first<{outbound_request_json:string|null;provider_message_id:string|null;actual_sender:string|null}>();
  if(!row?.outbound_request_json)return;
  const request=JSON.parse(row.outbound_request_json) as DeliveryRequest;
  const expected=smsSegments(request.content.text).segments;
  const facts=(await db.prepare(`SELECT identity_key,provider_message_id,provider_occurred_at,detail_json FROM provider_fact_inbox
    WHERE provider='mobile-message' AND mango_reference=? ORDER BY provider_occurred_at,identity_key`).bind(request.idempotencyKey)
    .all<{identity_key:string;provider_message_id:string;provider_occurred_at:number;detail_json:string}>()).results;
  const parts=new Map<number,{identity:string;status:string;at:number;messageId:string}>();
  for(const fact of facts) {
    const detail=JSON.parse(fact.detail_json),part=Number(detail.partNumber);
    if(detail.providerEvent!=='part-status'||detail.destination!==request.to||detail.message!==request.content.text
      ||detail.sender!==(row.actual_sender??request.sender)||detail.totalParts!==expected||part<1||part>expected
      ||(row.provider_message_id&&row.provider_message_id!==fact.provider_message_id))continue;
    const previous=parts.get(part);
    if(previous?.status==='failed')continue;
    parts.set(part,{identity:fact.identity_key,status:detail.partStatus,at:fact.provider_occurred_at,messageId:fact.provider_message_id});
  }
  const values=[...parts.values()];if(!values.length)return;
  const ids=new Set(values.map(p=>p.messageId));if(ids.size!==1)return;
  const failed=values.some(p=>p.status==='failed');
  if(!failed&&(parts.size!==expected||values.some(p=>p.status!=='delivered')))return;
  const kind=failed?'failed':'delivered',payloadDigest=await sha256(JSON.stringify(values.map(p=>p.identity).sort()));
  return {identity:`mobile-message:${recipientStepId}:whole:${kind}:${payloadDigest}`,providerMessageId:values[0].messageId,kind,
    occurredAt:new Date(Math.max(...values.map(p=>p.at))),payloadDigest,
    detail:{destination:request.to,mangoReference:request.idempotencyKey,totalParts:expected,providerEvent:'all-parts-outcome',failedParts:values.filter(p=>p.status==='failed').length}};
}

import type {DeliveryRequest,ProviderFact} from '@/core/shared/platform';
import {encodeProviderReference} from '@/core/shared/provider-reference';
import {parseVerifiedWebhook} from '@/core/features/lifecycle/webhook-facts';
import {sha256} from '@/core/platform/crypto';
import {boundedJson} from './bounded-read';
import {asRecord,stringValue} from './http';

const base='https://api.resend.com';
type Scan={kind:'emails'|'events';after?:string};
function cursor(value:string|undefined,kind:Scan['kind']):Scan {
  if(!value)return {kind};
  try {const parsed=JSON.parse(value);if(parsed.kind===kind&&typeof parsed.after==='string')return parsed;}catch{}
  return {kind};
}
function exactEmail(email:Record<string,unknown>,request:DeliveryRequest) {
  const tags=Array.isArray(email.tags)?Object.fromEntries(email.tags.map(t=>{const v=asRecord(t,'Invalid Resend tag.');return [v.name,v.value];})):{};
  const from=request.content.from?`${request.content.from.name} <${request.content.from.email}>`:request.sender;
  return tags.mango_recipient_step===encodeProviderReference(request.recipientStepId)
    &&tags.mango_handoff_key===encodeProviderReference(request.idempotencyKey)
    &&email.from===from&&Array.isArray(email.to)&&email.to.length===1&&email.to[0]===request.to
    &&email.subject===request.content.subject&&email.text===request.content.text
    &&(request.content.html===undefined||email.html===request.content.html);
}
export async function reconcileResend(apiKey:string,webhookId:string,request:DeliveryRequest,state:{providerMessageId?:string;cursor?:string}) {
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),10000);
  const read=async(path:string)=>asRecord(await boundedJson(`${base}${path}`,{Authorization:`Bearer ${apiKey}`},{signal:controller.signal,maxBytes:262144}), 'Invalid Resend reconciliation record.');
  try {
    const kind=state.providerMessageId?'events':'emails';const scan=cursor(state.cursor,kind);
    // Four candidates per page bounds total provider requests and persisted progress.
    const query=new URLSearchParams({limit:'4'});if(scan.after)query.set('after',scan.after);
    const prefix=kind==='emails'?'/emails':`/webhooks/${encodeURIComponent(webhookId)}/events`;
    const page=await read(`${prefix}?${query}`);
    if(!Array.isArray(page.data)||typeof page.has_more!=='boolean'||page.data.length>4)throw new Error('Invalid Resend reconciliation page.');
    const facts:ProviderFact[]=[];
    for(const raw of page.data) {
      const row=asRecord(raw,'Invalid Resend reconciliation item.');const id=stringValue(row.id,'Resend record ID missing.');
      const item=await read(`${prefix}/${encodeURIComponent(id)}`);
      if(kind==='emails') {
        if(!exactEmail(item,request)||item.id!==id)continue;
        const occurredAt=new Date(stringValue(item.created_at,'Resend creation time missing.'));if(!Number.isFinite(occurredAt.getTime()))throw new Error('Invalid Resend creation time.');
        const payloadDigest=await sha256(JSON.stringify(item));
        return {facts:[{identity:`resend:${id}:accepted:${payloadDigest}`,providerMessageId:id,kind:'accepted' as const,occurredAt,payloadDigest,detail:{mangoReference:request.idempotencyKey,destination:request.to}}],exhausted:true};
      }
      if(item.id!==id)throw new Error('Resend event identity mismatch.');
      // Outer status describes webhook delivery; only the original payload asserts mail outcomes.
      const event=asRecord(item.payload,'Resend original event payload missing.');
      const data=asRecord(event.data,'Resend original event data missing.');
      if(data.email_id!==state.providerMessageId)continue;
      facts.push(...await parseVerifiedWebhook('email',{providerEventId:`resend-webhook:${webhookId}:${id}`,rawBody:JSON.stringify(event),receivedAt:new Date()}));
    }
    if(page.has_more) {
      const last=asRecord(page.data.at(-1),'Resend next page has no cursor.');
      return {facts,cursor:JSON.stringify({kind,after:stringValue(last.id,'Resend cursor missing.')}),exhausted:false};
    }
    return {facts,exhausted:true};
  } finally {clearTimeout(timeout);}
}

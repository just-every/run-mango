import type { native } from './native';
import { createProductionPlatform } from '../../src/core/platform/runtime';
import { createAppServices } from '../../src/core/app/app';
import { createHmac, createHash } from 'node:crypto';
/** Paid network edge only: production adapter, routes and D1 remain real. */
export function smsEdge(h:Awaited<ReturnType<typeof native>>){
 const NativeDate=globalThis.Date;let clockOffset=(Math.floor(NativeDate.now()/86400000)+1)*86400000-NativeDate.now();
 const clockNow=()=>NativeDate.now()+clockOffset;
 globalThis.Date=new Proxy(NativeDate,{construct(target,args,newTarget){return Reflect.construct(target,args.length?args:[clockNow()],newTarget);},apply(){return new NativeDate(clockNow()).toString();},get(target,key,receiver){return key==='now'?clockNow:Reflect.get(target,key,receiver);}});
 const setClock=(value:number)=>{clockOffset=value-NativeDate.now();};
 let loseResponse=false,senderRead:(()=>void)|undefined;
 const requests:Array<Record<string,any>>=[],baseFetch=globalThis.fetch;
 const days=[0,1,2,3,4,5,6],windows=[{days,startMinute:0,endMinute:1440}];
 const policy={brand:'Mango',programme:'News',category:'newsletter',frequency:'Weekly',jurisdiction:'AU' as const,support:'help@example.test',providerAlreadyReplies:false,policySource:'https://help.mobilemessage.com.au/api/setting-up-webhooks',policyVerifiedAt:new Date(Date.now()-60000).toISOString(),policyExpiresAt:new Date(Date.now()+86400000).toISOString(),providerWindows:windows,jurisdictionWindows:windows,recipientWindows:windows};
 Object.assign(h.f.bindings,{SMS_PROVIDER_API_KEY:'test:only',SMS_WEBHOOK_SECRET:'sms-test-secret',SMS_CONFIRMATION_SENDER:'61400000010',SMS_PROGRAMME_POLICY:JSON.stringify(policy),MANGO_TEST_SMS_ALLOWLIST:'+61411111111',MANGO_SMS_HANDOFFS_PER_MINUTE:'100000',MANGO_DELIVERY_POLICY_JSON:JSON.stringify({'mobile-message':{credentialDigest:createHash('sha256').update('test:only').digest('hex'),account:'test-account',evidence:'https://help.mobilemessage.com.au/api/api-idempotency-keys',lookupWindowMs:86400000,providerPerMinute:100000,carrierPerMinute:100000,carrierScope:'test carrier edge'}})});
 Object.assign(h.f.platform,createProductionPlatform(h.f.bindings));
 if(h.f.platform.config.modules.sms.enabled)h.f.platform.config.modules.sms.config.programme=policy;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));if(url.hostname!=='api.mobilemessage.com.au')return baseFetch(input,init);
  if(url.pathname==='/v1/senders'){senderRead?.();return Response.json({results:[{sender:'61400000010',type:'dedicated'}]});}
  if(url.pathname==='/v1/messages'&&init?.method==='POST'){
   const body=JSON.parse(String(init.body));requests.push(body);const item=body.messages[0];if(loseResponse)throw new Error('Provider accepted but the response connection was lost.');
   return Response.json({status:'complete',ignore_unsubscribes:body.ignore_unsubscribes,shorten_urls:false,results:[{...item,status:'success',message_id:`sms-${requests.length}`,cost:1,encoding:'gsm7'}]});
  }
  throw new Error('Unexpected SMS test provider request.');
 };
 h.f.services=createAppServices(h.f.platform);
 return {requests,policy,setClock,onSenderRead(callback:()=>void){senderRead=callback;},loseResponse(){loseResponse=true;},restore(){globalThis.fetch=baseFetch;globalThis.Date=NativeDate;},signed(payload:Record<string,unknown>){const raw=JSON.stringify(payload),timestamp=String(Math.floor(Date.now()/1000));return {method:'POST',headers:{'Content-Type':'application/json','X-MM-Timestamp':timestamp,'X-MM-Signature':createHmac('sha256','sms-test-secret').update(`${timestamp}.${raw}`).digest('hex')},body:raw};}};
}

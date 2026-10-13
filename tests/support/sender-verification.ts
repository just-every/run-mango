import { createSenderVerification } from '../../src/core/features/sender-verification/service';
import { digest } from '../../src/core/features/sender-verification/identity';
import { createDatabase } from '../../src/core/platform/db/client';
import type { AppConfig } from '../../src/core/shared/platform';
import type { Challenge } from '../../src/core/features/sender-verification/types';
let key: Promise<string>;
function publicKey() {
  return key ??= crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:1024,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify'])
    .then(pair=>crypto.subtle.exportKey('spki',pair.publicKey)).then(bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))));
}
/** Test-only external evidence. The production verifier, SQL authority and guards execute unchanged. */
export function fixtureVerification(db: D1Database, input: Partial<AppConfig> = {}) {
  const config = {publicBaseUrl:new URL('https://mango.example.test'),sessionSigningKey:'fixture-sender-secret-at-least-thirty-two-bytes',mailProviderApiKey:'fixture-api-key',
    testEmailAllowlist:['receiver@example.test'],mailSender:{displayName:'Mango',fromEmail:'offers@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Test Street'},...input} as AppConfig;
  config.testEmailAllowlist=[...config.testEmailAllowlist,'receiver@example.test'];
  const receiver={id:'test-only-receiver',recipient:'receiver@example.test',async acquire(challenge:Challenge) {
    return {receiptId:challenge.id,originalDigest:await digest(challenge.request),receivedAt:Date.now(),from:challenge.request.sender,to:challenge.recipient,
      providerMessageId:challenge.providerMessageId!,requestDigest:challenge.requestDigest,nonce:challenge.nonce,
      signedBody:{digest:await digest(challenge.request.content.text),complete:true,nonce:challenge.nonce},authentication:{spf:{result:'pass',mailFromDomain:'send.example.test'},
        dkim:{result:'pass',domain:'example.test',selector:'s1',keyDigest:await digest({v:'DKIM1',k:'rsa',p:await publicKey()})},dmarc:{result:'pass',fromDomain:'example.test',semantics:'rfc9989' as const}}};
  }};
  const transport:typeof fetch=async input=>{
    const url=new URL(String(input));const p=await publicKey();
    if(url.hostname==='api.resend.com') {
      const domain={id:'fixture-domain',name:'example.test',status:'verified',region:'global',capabilities:{sending:'enabled'}};
      return Response.json(url.pathname==='/domains'?{data:[domain],has_more:false}:{...domain,records:[
        {record:'SPF',type:'TXT',name:'send',value:'v=spf1 ip4:192.0.2.1 -all',status:'verified'},
        {record:'DKIM',type:'TXT',name:'s1._domainkey',value:`v=DKIM1; k=rsa; p=${p}`,status:'verified'}]});
    }
    if(url.hostname!=='cloudflare-dns.com')throw new Error('Unexpected sender test transport');
    const name=url.searchParams.get('name');
    const data=name==='send.example.test'?'v=spf1 ip4:192.0.2.1 -all':name==='s1._domainkey.example.test'?`v=DKIM1; k=rsa; p=${p}`:name==='_dmarc.example.test'?'v=DMARC1; p=none; psd=n':null;
    return Response.json(data?{Status:0,Answer:[{name,type:16,TTL:300,data:JSON.stringify(data)}]}:{Status:0,Authority:[{name:'example.test',type:6,TTL:300,data:'ns.example.test host.example.test 1 300 300 300 300'}]});
  };
  const verification=createSenderVerification({database:createDatabase(db),config,receiver,transport});
  let proof:Promise<void>;
  return {verification,config,async inspect(sender:string) {
    await (proof ??= (async()=>{const challenge=await verification.prepareChallenge({recipient:receiver.recipient,subject:'Approved test diagnostic',text:'Synthetic sender evidence for isolated tests.'});
      await verification.sendChallenge(challenge.id,{async send(){return {providerMessageId:`fixture-${challenge.id}`,disposition:'accepted',providerAcceptedAt:new Date()}},async reconcile(){return {facts:[],exhausted:true}}});await verification.acquireObservation(challenge.id);})());
    return verification.inspect(sender);
  }};
}

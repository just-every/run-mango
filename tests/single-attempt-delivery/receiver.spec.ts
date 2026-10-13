import {test,expect} from '@playwright/test';
import {createReceiptConnector} from '../../src/core/features/sender-verification/qa-inbox';
import {signedBodyCoverage} from '../../src/core/features/sender-verification/qa-inbox-mime';
import {digest} from '../../src/core/features/sender-verification/identity';
import type {Challenge} from '../../src/core/features/sender-verification/types';
const nonce='test-nonce';
const text=`Approved diagnostic\n\nMango sender verification challenge: ${nonce}`;
const challenge={id:'challenge',nonce,sentAt:Date.now()-1000,providerMessageId:'submission-1',recipient:'diagnostic@customer.example',requestDigest:'request-digest',
 request:{sender:'Mango <sender@example.test>',to:'diagnostic@customer.example',content:{subject:'Sender check',text}}} as Challenge;
async function material({partial=false,changed=false,trusted=true,auth='pass',receiptOverrides={} as Record<string,unknown>}={}) {
 const body=text.replace(/\n/g,'\r\n')+'\r\n';
 const hash=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))));
 const ar=`mx.cloudflare.net; dkim=pass header.d=example.test header.s=s1; spf=pass smtp.mailfrom=bounce@send.example.test; dmarc=pass header.from=example.test`;
 const raw=`Authentication-Results: ${ar}\r\nDKIM-Signature: v=1; a=rsa-sha256; c=relaxed/simple; d=example.test; s=s1; h=from:to:subject; bh=${hash}; b=test${partial?'; l=1':''}\r\nFrom: Mango <sender@example.test>\r\nTo: diagnostic@customer.example\r\nSubject: Sender check\r\nMessage-ID: <mime-1@example.test>\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${changed?body+'tampered\r\n':body}`;
 const receipt={id:'receipt-id',receivedAt:new Date().toISOString(),to:challenge.recipient,from:challenge.request.sender,messageId:'<mime-1@example.test>',size:new TextEncoder().encode(raw).length,rawUrl:'/receipts/receipt-id/raw',
 auth:{trusted:trusted?'authentication-results':null,spf:auth,dkim:auth,dmarc:auth,dkimDomain:'example.test',headers:{authenticationResults:[{trusted,value:ar}]}}};
 const calls:string[]=[];
 const transport:typeof fetch=async (input,init)=>{const u=new URL(String(input));calls.push(u.origin+u.pathname);
  if(u.hostname==='cloudflare-dns.com')return Response.json({Status:0,Answer:[{name:'s1._domainkey.example.test',type:16,TTL:300,data:'"v=DKIM1; k=rsa; p=test"'}]});
  expect(init?.redirect).toBe('error');
  expect(u.origin).toBe('https://receipts.customer.example');expect(u.searchParams.get('token')).toBe('test-receiver-token');
  return u.pathname==='/receipts'?Response.json({receipts:[{...receipt,...receiptOverrides}]}):new Response(raw);
 };
 return {raw,calls,receiver:createReceiptConnector('https://receipts.customer.example/receipts?token=test-receiver-token',challenge.recipient,transport)};
}
test('approved receiver API and raw MIME produce correlated full-body authentication material',async()=>{
 const f=await material();const result=await f.receiver.acquire(challenge);
 expect(result).toMatchObject({receiptId:'receipt-id',providerMessageId:'submission-1',requestDigest:challenge.requestDigest,signedBody:{complete:true,digest:await digest(text)},authentication:{spf:{result:'pass',mailFromDomain:'send.example.test'},dkim:{result:'pass',domain:'example.test',selector:'s1'},dmarc:{result:'pass',fromDomain:'example.test'}}});
 expect(f.calls).toHaveLength(3);
});
for(const [name,options] of [['partial DKIM',{partial:true}],['changed raw body',{changed:true}],['untrusted authentication',{trusted:false}]] as const) {
 test(`receiver rejects ${name}`,async()=>{const f=await material(options);await expect(f.receiver.acquire(challenge)).rejects.toThrow();});
}
test('receiver rejects substituted From identity even when the body nonce matches',async()=>{
 const f=await material();const acquire=f.receiver.acquire.bind(f.receiver);
 await expect(acquire({...challenge,request:{...challenge.request,sender:'Different <sender@example.test>'}})).rejects.toThrow('receiver-from-mismatch');
});
test('DKIM full-body evidence requires signed identity headers',async()=>{
 const f=await material();await expect(signedBodyCoverage(f.raw.replace('h=from:to:subject','h=from:subject'),'example.test','s1')).rejects.toThrow('receiver-signature-coverage');
});

for (const part of ['subject','text'] as const) test(`receiver rejects substituted challenge ${part}`,async()=>{
 const f=await material();
 await expect(f.receiver.acquire({...challenge,request:{...challenge.request,
  content:{...challenge.request.content,[part]:'Substituted content'}}})).rejects.toThrow('receiver-correlation-mismatch');
});
test('receiver rejects a challenge for another recipient before fetching',async()=>{
 const f=await material();
 await expect(f.receiver.acquire({...challenge,recipient:'other@example.test'})).rejects.toThrow('receiver-correlation-mismatch');
 expect(f.calls).toEqual([]);
});

for (const id of ['../outside','../../admin','abc?token=other','abc#fragment','%2fadmin','https://other.example']) {
 test(`receiver rejects unsafe raw receipt ID ${id}`,async()=>{
  const f=await material({receiptOverrides:{id,rawUrl:`/receipts/${id}/raw`}});
  await expect(f.receiver.acquire(challenge)).rejects.toThrow('receiver-raw-missing');
  expect(f.calls).toEqual(['https://receipts.customer.example/receipts']);
 });
}
test('receiver rejects raw URL escaping the configured origin',async()=>{
 const f=await material({receiptOverrides:{rawUrl:'https://attacker.example/receipts/receipt-id/raw'}});
 await expect(f.receiver.acquire(challenge)).rejects.toThrow('receiver-raw-missing');
 expect(f.calls).toHaveLength(1);
});
test('receiver rejects metadata without authoritative authentication even when MIME claims a pass',async()=>{
 const f=await material({receiptOverrides:{auth:{trusted:'authentication-results',dkimDomain:'example.test',headers:{authenticationResults:[{trusted:false,value:'mx.cloudflare.net; dkim=pass'}]}}}});
 await expect(f.receiver.acquire(challenge)).rejects.toThrow('receiver-authentication-missing');
});
for(const status of [302,403,500]) test(`receiver refuses HTTP ${status} without forwarding the token`,async()=>{
 const calls:string[]=[];
 const receiver=createReceiptConnector('https://receipts.customer.example/receipts?token=test-secret',challenge.recipient,async(input,init)=>{
  calls.push(new URL(String(input)).origin);expect(init?.redirect).toBe('error');
  return new Response('not evidence',{status,headers:{location:'https://attacker.example/steal'}});
 });
 await expect(receiver.acquire(challenge)).rejects.toThrow('receiver-unavailable');
 expect(calls).toEqual(['https://receipts.customer.example']);
});
test('transport errors containing the receipt token are redacted',async()=>{
 const receiver=createReceiptConnector('https://receipts.customer.example/receipts?token=test-secret',challenge.recipient,async()=>{throw new Error('https://receipts.customer.example/receipts?token=test-secret');});
 await expect(receiver.acquire(challenge)).rejects.toThrow(/^receiver-unavailable$/);
});
test('response decoding errors containing the token are redacted',async()=>{
 const receiver=createReceiptConnector('https://receipts.customer.example/receipts?token=test-secret',challenge.recipient,async()=>new Response('test-secret invalid json'));
 await expect(receiver.acquire(challenge)).rejects.toThrow(/^receiver-unavailable$/);
});

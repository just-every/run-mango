import { test, expect } from '@playwright/test';
import { readResendDomain } from '../../src/core/platform/adapters/resend-domain-verification';
import { createDnsInspection, txt, tags, validSpf } from '../../src/core/features/sender-verification/dns';
import { inspectDmarc } from '../../src/core/features/sender-verification/dmarc';
import { serializedFrom } from '../../src/core/features/sender-verification/identity';

for (const page of [{data:[]}, {data:[],has_more:true}, {data:[{id:'same',name:'other.test'}],has_more:true}]) {
  test(`complete domain list required: ${JSON.stringify(page)}`, async () => {
    await expect(readResendDomain('test','example.test',async()=>Response.json(page))).rejects.toThrow();
  });
}
for (const status of [401,403,429,500]) test(`provider ${status} remains unknown with no raw error`, async()=>{
  await expect(readResendDomain('test','example.test',async()=>new Response('private body',{status}))).rejects.toMatchObject({state:'unknown'});
});
test('TXT chunks and tags parse structurally and reject duplicate tags',()=>{
  expect(txt('"v=DMARC1; " "p=none"')).toBe('v=DMARC1; p=none');
  expect(()=>tags('v=DMARC1;p=none;p=reject')).toThrow();
  expect(validSpf('v=spf1 include:amazonses.com ~all')).toBe(true);
  expect(validSpf('a string mentioning v=spf1')).toBe(false);
  expect(serializedFrom({sender:'expected@example.test',content:{text:'text',from:{name:'Other',email:'other@example.test'}}})).toBe('Other <other@example.test>');
});
function dns(records:Record<string,string[]>) {
  return createDnsInspection(Date.now(),async url=>{
    const query = new URL(String(url)), name=query.searchParams.get('name')!;
    return Response.json({Status:0,Answer:(records[name]??[]).map(data=>({name,type:16,TTL:60,data:JSON.stringify(data)})),
      Authority:[{name:'test',type:6,TTL:60,data:'ns.test host.test 1 60 60 60 60'}]});
  });
}
test('RFC9989 alignment walks actual policy boundaries; one aligned mechanism suffices',async()=>{
  const result = await inspectDmarc(dns({'_dmarc.example.co.test':['v=DMARC1;p=none;psd=n']}),'news.example.co.test','send.example.co.test','unrelated.co.test');
  expect(result.spfAligned).toBe(true); expect(result.dkimAligned).toBe(false); expect(result.policy.p).toBe('none');
});
test('strict alignment does not accept a suffix or subdomain',async()=>{
  const result = await inspectDmarc(dns({'_dmarc.example.test':['v=DMARC1;p=reject;aspf=s;adkim=s;psd=n']}),'example.test','send.example.test','lookalikeexample.test');
  expect(result.spfAligned).toBe(false); expect(result.dkimAligned).toBe(false);
});
test('PSD boundaries cannot align unrelated organizations',async()=>{
  const result = await inspectDmarc(dns({'_dmarc.bank.test':['v=DMARC1;p=reject;psd=y']}),'a.bank.test','send.a.bank.test','b.bank.test');
  expect(result.spfAligned).toBe(true); expect(result.dkimAligned).toBe(false);
});
for(const records of [[],['v=DMARC1;p=none','v=DMARC1;p=reject'],['v=DMARC1;p=garbage'],['v=DMARC1;p=none;aspf=x']]) test(`missing or malformed policy fails: ${JSON.stringify(records)}`,async()=>{
  await expect(inspectDmarc(dns({'_dmarc.example.test':records}),'example.test','example.test','example.test')).rejects.toThrow();
});

import {test,expect} from '@playwright/test';
import {readSendgridDomain} from '../../src/core/platform/adapters/sendgrid-domain-verification';
const domain={id:123,user_id:99,domain:'example.test',valid:true,automatic_security:true,dns:{
 mail_cname:{valid:true,type:'cname',host:'send.example.test',data:'user.sendgrid.net'},
 dkim1:{valid:true,type:'cname',host:'s1._domainkey.example.test',data:'s1.user.sendgrid.net'},
 dkim2:{valid:true,type:'cname',host:'s2._domainkey.example.test',data:'s2.user.sendgrid.net'}}};
test('SendGrid domain evidence preserves both rotation selectors and underscore DNS labels',async()=>{
 const transport:typeof fetch=async input=>Response.json(new URL(String(input)).pathname.endsWith('/123')?domain:[domain]);
 expect(await readSendgridDomain('test-key','example.test',transport)).toMatchObject({id:'123',name:'example.test',records:[
  {record:'DKIM',name:'s1._domainkey.example.test',type:'CNAME'}, {record:'DKIM',name:'s2._domainkey.example.test',type:'CNAME'}, {record:'SPF',name:'send.example.test',type:'CNAME'}]});
});
for(const change of ['unverified','wrong-account','wrong-domain','invalid-record'])test(`SendGrid domain fails closed for ${change}`,async()=>{
 const transport:typeof fetch=async input=>{const detail=structuredClone(domain);
  if(change==='unverified')detail.valid=false;
  if(change==='wrong-account')detail.user_id=100;
  if(change==='wrong-domain')detail.domain='other.test';
  if(change==='invalid-record')detail.dns.dkim1.valid=false;
  return Response.json(new URL(String(input)).pathname.endsWith('/123')?detail:[domain]);};
 await expect(readSendgridDomain('test-key','example.test',transport)).rejects.toThrow();
});

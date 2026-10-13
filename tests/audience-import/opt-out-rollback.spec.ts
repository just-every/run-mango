import {test,expect} from '@playwright/test';
import {native} from './native';
import {authenticatedRequests} from './request-runtime';

const scope={brandOrLegalSender:'Mango Garden',messageCategory:'newsletter',frequencyDisclosure:'Monthly',destinationJurisdiction:'AU',consentText:'Send me the Mango Garden letter.',consentVersion:'v1'};

test('CONT-004/006 no undo or abandon makes an opted-out person mailable again, even when their address already had an older opt-out',async()=>{
 test.setTimeout(180000);
 const h=await native();try{
  const http=await authenticatedRequests(h.f,h.f.db);
  const status=(email:string)=>h.f.db.prepare('SELECT c.email_status AS contact,a.channel_status AS address FROM contacts c JOIN contact_email_addresses a ON a.contact_id=c.id AND a.email=c.email WHERE c.email=?').bind(email).first();
  const tick=()=>new Promise(resolve=>setTimeout(resolve,5));
  // Each person confirms consent, unsubscribes through their link, then confirms new consent:
  // subscribed again, and their address keeps the older opt-out row.
  for(const email of ['held@example.test','listed@example.test'])for(const step of ['consent','unsubscribe','consent']){
   await tick();
   if(step==='consent'){
    const sent=h.f.outbound.length;
    await http.response('/api/contacts/consent',{contact:{email,displayName:'Garden Person'},channel:'email',...scope,captureMethod:'operator-entry',captureSource:'Market stall sign-up sheet',occurredAt:new Date().toISOString()});
    const link=String(h.f.outbound.slice(sent).find((message:any)=>JSON.stringify(message.to).includes(email))!.text).match(/https:\/\/\S+\/consent\/confirm\/\S+/)![0];
    expect((await http.form(new URL(link).pathname,'confirm=true')).status).toBe(200);
   }else{
    const contact=await h.f.db.prepare('SELECT id FROM contacts WHERE email=?').bind(email).first<{id:string}>();
    const {token}=await h.f.services.audienceService.issueUnsubscribeToken(contact!.id,'email');
    expect((await http.form(`/unsubscribe/one-click/${token}`,'List-Unsubscribe=One-Click')).status).toBe(200);
   }
  }
  for(const email of ['held@example.test','listed@example.test'])expect(await status(email)).toEqual({contact:'subscribed',address:'subscribed'});
  // A plain import writes held@ first (its newer consent kept) and stops partway.
  const plain=await http.json('/api/audience/import-preview',{files:[{name:'plain.csv',preset:'csv-non-subscribed',csv:'Email Address\n'+['held@example.test',...Array.from({length:10},(_,i)=>`filler${i}@example.test`)].join('\n')}]});
  const stopped=(await http.json('/api/audience/imports',{fingerprint:plain.fingerprint})).job;
  expect(stopped.state).toBe('applying');expect(stopped.checkpoint).toBeGreaterThan(0);expect(stopped.checkpoint).toBeLessThan(11);
  // A later unsubscribe list names both: held@ through the stopped import's hold, listed@ directly.
  const list=await http.json('/api/audience/import-preview',{files:[{name:'unsubscribed.csv',preset:'csv-unsubscribed',csv:'Email Address\nheld@example.test\nlisted@example.test'}]});
  const listed=(await http.json('/api/audience/imports',{fingerprint:list.fingerprint})).job;
  expect(listed.state).toBe('completed');
  for(const email of ['held@example.test','listed@example.test'])expect(await status(email)).toEqual({contact:'unsubscribed',address:'unsubscribed'});
  // Neither the list's undo nor the stopped import's abandon lifts the list's opt-out.
  let undo=(await http.json(`/api/audience/imports/${listed.id}/undo`,{})).job;
  while(undo.state==='undoing')undo=(await http.json(`/api/audience/imports/${listed.id}/resume`,{})).job;
  expect(undo.state).toBe('undone');
  for(const email of ['held@example.test','listed@example.test'])expect(await status(email)).toEqual({contact:'unsubscribed',address:'unsubscribed'});
  let abandon=(await http.json(`/api/audience/imports/${stopped.id}/abandon`,{})).job;
  while(abandon.state==='rolling_back')abandon=(await http.json(`/api/audience/imports/${stopped.id}/resume`,{})).job;
  expect(abandon.state).toBe('rolled_back');
  for(const email of ['held@example.test','listed@example.test'])expect(await status(email)).toEqual({contact:'unsubscribed',address:'unsubscribed'});
  expect(abandon).toMatchObject({rolledBack:stopped.checkpoint,kept:0});
 }finally{await h.close();}
});

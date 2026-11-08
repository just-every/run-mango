import {expect} from '@playwright/test';
import {createApp} from '../../src/core/app/app';
import type {native} from './native';
import type {requests} from '../audience-controls/runtime';

export async function identityDoors(h:Awaited<ReturnType<typeof native>>,api:Awaited<ReturnType<typeof requests>>,hosted:{id:string;email:string}) {
  const f=h.f;
  const email=['synthetic-mango-identity-60','example.test'].join('@');
  const mixed=['Synthetic-Mango-Identity-60','Example.Test'].join('@');
  const phone='+12025550147',formatted=' +1 (202) 555-0147 ';
  const manual=(address:string,number:string)=>({contact:{email:address,phone:number,displayName:'Identity reader'},channel:'email',
    brandOrLegalSender:'Mango',messageCategory:'newsletter',frequencyDisclosure:'Weekly',destinationJurisdiction:'US',
    captureMethod:'written',captureSource:'Synthetic identity intake',consentText:'I agree to receive weekly newsletters.',consentVersion:'v1',
    occurredAt:new Date(Date.now()-60000).toISOString()});
  const snapshot=async()=>Promise.all(['contacts','contact_email_addresses','contact_phones','consent_evidence','consent_confirmations']
    .map(async table=>(await f.db.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).results));
  const lookup=async(address:string)=>{
    const found=await api.json(`/api/contacts/search?address=${encodeURIComponent(address)}`);
    expect(found.contacts).toHaveLength(1);
    return found.contacts[0];
  };
  const preview=(name:string,rows:string[])=>api.json('/api/audience/import-preview',{files:[{name,preset:'csv-non-subscribed',
    csv:['Email Address,Phone',...rows].join('\n')}]});
  const apply=async(fingerprint:string)=>{
    let result=await api.json('/api/audience/imports',{fingerprint});
    while(['queued','applying'].includes(result.job.state)) result=await api.json(`/api/audience/imports/${result.job.id}/resume`,{});
    expect(result.job.state).toBe('completed');
  };

  const first=await api.json('/api/contacts/consent',manual(` \t${mixed}\r\n`,formatted));
  expect(first.contact).toMatchObject({email,emailStatus:'pending',smsStatus:'non-subscribed'});
  const id=first.contact.id;
  const replay=await api.json('/api/contacts/consent',manual(mixed,phone));
  expect(replay.contact.id).toBe(id);
  for(const address of [email,` ${mixed} `,phone]) expect((await lookup(address)).id).toBe(id);
  const detail=await api.json(`/api/contacts/${id}`);
  expect(detail.emails).toEqual([expect.objectContaining({contactId:id,email})]);
  expect(detail.phones).toEqual([expect.objectContaining({contactId:id,phoneE164:phone,channelStatus:'non-subscribed'})]);

  const mailBeforeImport=f.outbound.length;
  const duplicate=await preview('capture-first.csv',[` ${mixed} ,${formatted}`,`${email},${phone}`,` ${hosted.email.toUpperCase()} ,`]);
  expect(duplicate.rows).toEqual(expect.arrayContaining([expect.objectContaining({email,phone})]));
  await apply(duplicate.fingerprint);
  expect((await lookup(mixed)).id).toBe(id);
  expect((await lookup(phone)).id).toBe(id);
  expect(await lookup(hosted.email)).toMatchObject({id:hosted.id,emailStatus:'unsubscribed'});
  expect(f.outbound).toHaveLength(mailBeforeImport);

  const importedEmail=['synthetic-mango-import-60','example.test'].join('@');
  const importedMixed=['Synthetic-Mango-Import-60','Example.Test'].join('@');
  const importedPhone='+442079460147';
  await apply((await preview('import-first.csv',[` ${importedMixed} , +44 (20) 7946-0147 `,`${importedEmail},${importedPhone}`])).fingerprint);
  const imported=await lookup(importedEmail);
  expect(imported.emailStatus).toBe('non-subscribed');
  expect((await lookup(importedPhone)).id).toBe(imported.id);
  expect((await api.json('/api/contacts/consent',manual(` ${importedMixed} `,importedPhone))).contact.id).toBe(imported.id);

  const onlyPhone='+61412345678';
  await apply((await preview('phone-only.csv',[', +61 (412) 345-678 ',`,${onlyPhone}`])).fingerprint);
  const phoneOnly=await lookup(onlyPhone);
  expect(phoneOnly).toMatchObject({email:null,emailStatus:'non-subscribed',smsStatus:'non-subscribed'});
  expect((await api.json(`/api/contacts/${phoneOnly.id}`)).phones)
    .toEqual([expect.objectContaining({contactId:phoneOnly.id,phoneE164:onlyPhone,channelStatus:'non-subscribed'})]);

  const beforeRefusal=await snapshot();
  const conflict=await api.call('/api/contacts/consent',manual(email,importedPhone));
  expect(conflict.status).toBe(409);
  expect(await conflict.json()).toMatchObject({error:'consent_capture_failed',detail:expect.stringContaining('different contacts')});
  const conflictImport=await preview('conflicting-owners.csv',[`${mixed},${importedPhone}`]);
  expect(conflictImport.rows).toEqual([expect.objectContaining({reason:expect.stringContaining('different contacts')})]);
  await apply(conflictImport.fingerprint);
  expect(await snapshot()).toEqual(beforeRefusal);

  const badEmail=['synthetic-mango-invalid-60','example.test'].join('@');
  expect((await api.call('/api/contacts/consent',manual('not an address',phone))).status).toBe(400);
  for(const number of ['12025550147','+0123456789','+1-not-a-number']) {
    expect((await api.call('/api/contacts/consent',manual(badEmail,number))).status).toBe(409);
    const invalid=await preview('invalid-phone.csv',[`${badEmail},${number}`]);
    expect(invalid.rows).toEqual([expect.objectContaining({reason:expect.stringContaining('E.164')})]);
  }
  expect(await snapshot()).toEqual(beforeRefusal);

  const credential=await api.json('/api/settings/integrations',{name:'Synthetic identity sync',scopes:['contacts:read','contacts:write']});
  const app=createApp(f.bindings,f.platform);
  const integration=(path:string,body?:unknown)=>app.fetch(new Request(f.platform.config.publicBaseUrl.origin+'/api/integrations/v1'+path,{
    method:body===undefined?'GET':'PUT',headers:{Authorization:`Bearer ${credential.token}`,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.60'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})}),f.bindings);
  const apiConsent={source:'Synthetic API signup',evidence:'I agree to receive weekly newsletters.',brandOrLegalSender:'Mango',messageCategory:'newsletter',
    frequencyDisclosure:'Weekly',destinationJurisdiction:'US',consentVersion:'v1',occurredAt:new Date(Date.now()-60000).toISOString()};
  const mailBeforeApi=f.outbound.length;
  for(const address of [email,` \t${mixed}\r\n`]) {
    const saved=await integration('/contacts',{email:address,segmentName:'Synthetic identity readers',subscribe:true,consent:apiConsent});
    expect(saved.status).toBe(200);
    expect((await saved.json() as any).contact).toMatchObject({id,email,emailStatus:'pending'});
    const read=await integration('/contacts?email='+encodeURIComponent(address));
    expect(read.status).toBe(200);
    expect((await read.json() as any).contacts).toEqual([expect.objectContaining({id,email})]);
  }
  expect(f.outbound).toHaveLength(mailBeforeApi+1);
  expect(f.outbound.at(-1)!.to).toEqual([email]);
  const beforeRevocation=await snapshot();
  await api.json(`/api/settings/integrations/${credential.credential.id}`,undefined,'DELETE');
  expect((await integration('/contacts',{email:badEmail,segmentName:'Synthetic identity readers'})).status).toBe(401);
  expect(await snapshot()).toEqual(beforeRevocation);

  for(const [table,column,value,owner] of [
    ['contact_email_addresses','email',email,id],['contact_phones','phone_e164',phone,id],
    ['contact_email_addresses','email',importedEmail,imported.id],['contact_phones','phone_e164',importedPhone,imported.id],
    ['contact_phones','phone_e164',onlyPhone,phoneOnly.id],
  ]) expect((await f.db.prepare(`SELECT contact_id FROM ${table} WHERE ${column}=?`).bind(value).all()).results).toEqual([{contact_id:owner}]);
  expect((await api.json('/api/audience')).contacts.map((contact:any)=>contact.id).sort())
    .toEqual([hosted.id,id,imported.id,phoneOnly.id].sort());
  for(const table of ['campaigns','campaign_approval_requests','recipient_steps']) expect((await f.db.prepare(`SELECT * FROM ${table}`).all()).results).toEqual([]);
  expect(f.jobs.filter((job:any)=>job.kind==='campaign.dispatch')).toEqual([]);
}

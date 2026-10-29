import {capturePropertyScreen} from './custom-property-proof';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {openPage} from '../support/navigation';
import {json,confirmedContact,type Installation} from './harness';
import type {providerEdge} from './edge';
import {provePropertyRulesAndPreview} from './custom-property-preview';
const dateKey='synthetic_mango_1401_date',moneyKey='synthetic_mango_1402_money';

export async function proveCustomProperties(site:Installation,cookie:string,page:Page,info:TestInfo,edge:Awaited<ReturnType<typeof providerEdge>>) {
  await site.control('/_golive/clock',{hold:false});
  await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  await page.setViewportSize({width:1440,height:1000});
  for(const [index,role] of ['admin','manager','author','analyst','support'].entries()){const actorId='synthetic-mango-'+(1410+index),actor=await site.open(actorId+'@example.test',actorId);await json(await site.call('/api/operators/'+actorId+'/role',{method:'PUT',cookie,body:{role}}),200);const key='synthetic_mango_role_'+role,body={key,label:actorId,type:'text',options:[]};const response=await site.call('/api/settings/properties',{method:'POST',cookie:actor,body});await json(response,['admin','manager'].includes(role)?201:403);if(['admin','manager'].includes(role))await json(await site.call('/api/settings/properties/'+key,{method:'DELETE',cookie:actor}),200);}
  await openPage(page,site.runtime.url+'/app/settings');
  const settings=page.getByRole('region',{name:'Custom property definitions'});
  for(const [key,label,type] of [[dateKey,'synthetic-mango-1401 date','date'],[moneyKey,'synthetic-mango-1402 money','money']]){
    await settings.getByLabel('Property key',{exact:true}).fill(key);await settings.getByLabel('Property label',{exact:true}).fill(label);await settings.getByLabel('Property type',{exact:true}).selectOption(type);
    await settings.getByRole('button',{name:'Create property',exact:true}).click();await expect(settings.getByRole('heading',{name:label,exact:true})).toBeVisible();
  }
  await capturePropertyScreen(page,info,'settings',settings);
  const emails=['synthetic-mango-1401@example.test','synthetic-mango-1402@example.test'];
  for(const [index,email] of emails.entries())await confirmedContact(site,edge,cookie,email,`synthetic-mango-${1401+index}`);
  const contacts=await Promise.all(emails.map(async email=>(await json(await site.call('/api/contacts/search?address='+encodeURIComponent(email),{cookie}),200)).contacts.find((c:any)=>c.email===email)));
  const ledger=async()=>site.rows(`SELECT * FROM consent_evidence WHERE contact_id IN ('${contacts.map(c=>c.id).join("','")}') ORDER BY id`);
  const statuses=async()=>site.rows(`SELECT id,email_status,sms_status FROM contacts WHERE id IN ('${contacts.map(c=>c.id).join("','")}') ORDER BY id`);
  const before=await ledger(),beforeStates=await statuses();
  const csv=`email,anniversary,budget\n${emails[0]},2026-03-01,"$1,234.56"\n${emails[1]},2026-04-15,12.345\nsynthetic-mango-1403@example.test,2026-02-30,$0.07\n`;
  await openPage(page,site.runtime.url+'/app/audience/import');
  await page.getByLabel('Choose CSV files',{exact:true}).setInputFiles({name:'synthetic-mango-1401.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.getByLabel('Preset for synthetic-mango-1401.csv').selectOption('csv-non-subscribed');
  await page.getByRole('button',{name:'Preview import',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Field mapping',exact:true})).toBeVisible();
  await page.getByRole('combobox',{name:/Synthetic-Mango-1401 Date.*in synthetic-mango-1401.csv/i}).selectOption('anniversary');
  await page.getByRole('combobox',{name:/Synthetic-Mango-1402 Money.*in synthetic-mango-1401.csv/i}).selectOption('budget');
  const mappedRequest=page.waitForRequest(request=>request.url().endsWith('/api/audience/import-preview')&&request.method()==='POST');
  await page.getByRole('button',{name:'Preview import',exact:true}).click();
  const mappedInput=(await mappedRequest).postDataJSON();
  await expect(page.getByRole('status',{name:'Import warnings'})).toContainText(`property_invalid_money: ${moneyKey}`);
  await expect(page.getByRole('status',{name:'Import warnings'})).toContainText(`property_invalid_date: ${dateKey}`);

  await capturePropertyScreen(page,info,'import-mapping',page.locator('[aria-labelledby="import-mapping-title"]'));
  await page.getByRole('button',{name:'Start import',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Import completed:'})).toBeVisible();
  expect(await ledger()).toEqual(before);expect(await statuses()).toEqual(beforeStates);
  const profile=async(id:string)=>json(await site.call('/api/contacts/'+id,{cookie}),200);
  const initial=await profile(contacts[0].id);expect(initial.profile.properties).toMatchObject({[dateKey]:'2026-03-01',[moneyKey]:123456});
  const imported=initial.history.filter((h:any)=>h.kind==='property-change');expect(imported).toHaveLength(2);
  expect(imported.map((h:any)=>JSON.parse(h.detail).source.column).sort()).toEqual(['anniversary','budget']);
  expect(initial.timeline.filter((h:any)=>h.kind==='property-change').every((h:any)=>h.source.includes('CSV import: synthetic-mango-1401.csv')&&h.source.includes(' · import '))).toBe(true);
  await json(await site.call('/api/settings/properties',{method:'PUT',cookie,body:{key:dateKey,label:'synthetic-mango-1401 calendar date',type:'date',options:[]}}),200);
  const repeated=await json(await site.call('/api/audience/import-preview',{method:'POST',cookie,body:mappedInput}),200);
  await json(await site.call('/api/audience/imports',{method:'POST',cookie,body:{fingerprint:repeated.fingerprint}}),200);
  expect((await profile(contacts[0].id)).history.filter((h:any)=>h.kind==='property-change')).toEqual(imported);
  await json(await site.call('/api/settings/properties',{method:'PUT',cookie,body:{key:dateKey,label:'synthetic-mango-1401 date',type:'date',options:[]}}),200);
  const key=await json(await site.call('/api/settings/integrations',{method:'POST',cookie,body:{name:'synthetic-mango-1404 API',scopes:['contacts:read','contacts:write','events:write']}}),201);
  const headers={Authorization:`Bearer ${key.token}`};
  const event={name:'synthetic.updated',contactId:contacts[0].id,idempotencyKey:'synthetic-mango-1404',occurredAt:new Date((await site.control('/_golive/clock')).now-1000).toISOString(),contactProperties:{[dateKey]:'2026-04-15'}};
  const postEvent=(body:unknown)=>site.call('/api/integrations/v1/events',{method:'POST',headers,body});
  await json(await postEvent(event),200);const once=(await profile(contacts[0].id)).history.filter((h:any)=>h.kind==='property-change');
  await json(await postEvent(event),200);expect((await profile(contacts[0].id)).history.filter((h:any)=>h.kind==='property-change')).toEqual(once);
  for(const [field,value,reason] of [[dateKey,'2026-02-30','property_invalid_date'],[moneyKey,'$1.234','property_invalid_money']]){
    expect(await json(await postEvent({...event,idempotencyKey:'synthetic-mango-1405-'+field,contactProperties:{[field]:value}}),400)).toEqual({error:reason,property:field});
    expect(await json(await site.call('/api/integrations/v1/contacts',{method:'PUT',headers,body:{email:emails[0],segmentName:'synthetic-mango-1406',fields:{[field]:value}}}),400)).toEqual({error:reason,property:field});
  }
  const updatedProfile=await json(await site.call('/api/integrations/v1/contacts',{method:'PUT',headers,body:{email:'synthetic-mango-1403@example.test',segmentName:'synthetic-mango-1416',fields:{[dateKey]:'2026-04-14',[moneyKey]:'$0.07'}}}),200);expect(updatedProfile.contact.fields).toMatchObject({[dateKey]:'2026-04-14',[moneyKey]:7});
  await openPage(page,site.runtime.url+'/app/audience/'+contacts[0].id);
  const panel=page.getByRole('region',{name:'Contact properties'});await expect(panel).toContainText('$1,234.56');
  await panel.getByRole('button',{name:'Edit properties',exact:true}).click();await panel.getByLabel('synthetic-mango-1402 money',{exact:true}).fill('$2,345.67');await panel.getByRole('button',{name:'Save properties',exact:true}).click();await expect(panel).toContainText('$2,345.67');
  await capturePropertyScreen(page,info,'contact-values-history',page.locator('.contact-layout'));
  const edited=await profile(contacts[0].id);expect(edited.profile.properties[moneyKey]).toBe(234567);
  const moneyPreview=(await json(await site.call('/api/contacts/'+contacts[0].id+'/personalisation',{cookie}),200)).values[moneyKey];
  await json(await site.call('/api/integrations/v1/contacts',{method:'PUT',headers,body:{email:emails[0],segmentName:'synthetic-mango-1416',fields:{[dateKey]:'2026-04-17'}}}),200);
  expect({properties:(await profile(contacts[0].id)).profile.properties,preview:(await json(await site.call('/api/contacts/'+contacts[0].id+'/personalisation',{cookie}),200)).values[moneyKey]}).toMatchObject({properties:{[dateKey]:'2026-04-17',[moneyKey]:234567},preview:moneyPreview});
  expect(edited.timeline.filter((h:any)=>h.kind==='property-change').map((h:any)=>h.source).join('\n')).toMatch(/api · synthetic-mango-1404 API/);
  expect(edited.timeline.filter((h:any)=>h.kind==='property-change').map((h:any)=>h.source).join('\n')).toMatch(/operator · /);
  // Replaying an already-recorded event must not restore an older value after an edit.
  await json(await site.call('/api/contacts/'+contacts[0].id+'/properties',{method:'PUT',cookie,body:{fields:{[dateKey]:'2026-04-16'}}}),200);
  await json(await postEvent(event),200);expect((await profile(contacts[0].id)).profile.properties[dateKey]).toBe('2026-04-16');
  await json(await site.call('/api/contacts/'+contacts[0].id+'/properties',{method:'PUT',cookie,body:{fields:{[dateKey]:'2026-04-15'}}}),200);
  expect(await ledger()).toEqual(before);expect(await statuses()).toEqual(beforeStates);
  await provePropertyRulesAndPreview(site,cookie,page,info,edge,{contacts,emails,dateKey,moneyKey});
  const locked=await site.call('/api/settings/properties',{method:'PUT',cookie,body:{key:dateKey,label:'synthetic-mango-1401 date',type:'text',options:[]}});expect(await json(locked,409)).toEqual({error:'property_type_locked',property:dateKey});
}

import AxeBuilder from '@axe-core/playwright';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {openPage} from '../support/navigation';
import {json,availableTransport,consent,type Installation} from './harness';
import type {providerEdge} from './edge';
import {confirmSmsReply} from './sms-confirm-reply';
export async function manualEntryJourney(site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,owner:string,page:Page,info:TestInfo){
 const author=await site.open('synthetic-mango-author@example.test','manual-author'),support=await site.open('synthetic-mango-support@example.test','manual-support'),analyst=await site.open('synthetic-mango-analyst@example.test','manual-analyst');
 for(const [id,role]of [['manual-author','author'],['manual-support','support'],['manual-analyst','analyst']])await json(await site.call('/api/operators/'+id+'/role',{method:'PUT',cookie:owner,body:{role}}),200);
 const beforeClock=await site.control('/_golive/clock');
 const clock=await site.control('/_golive/clock',{advanceMs:(43_200_000-((beforeClock.now+36_000_000)%86_400_000)+86_400_000)%86_400_000,hold:true});
 const body={...consent,contact:{email:'synthetic-mango-manual-default@example.test',displayName:'Market visitor',phone:'+61422222222'},occurredAt:new Date(clock.now-60000).toISOString(),permissionMethod:'in-person',affirmed:true,properties:{interest:'Seedlings'}};
 for(const cookie of [support,analyst])expect((await site.call('/api/contacts/consent',{method:'POST',cookie,body})).status).toBe(403);
 expect((await site.call('/api/contacts/consent',{method:'POST',body})).status).toBe(401);
 expect((await site.call('/api/contacts/consent',{method:'POST',cookie:author,body:{...body,affirmed:false}})).status).toBe(400);
 await availableTransport(site);
 const first=await json(await site.call('/api/contacts/consent',{method:'POST',cookie:author,body}),201);
 expect(first.contact.emailStatus).toBe('pending');expect(edge.sends.filter(send=>send.to===body.contact.email)).toHaveLength(1);
 await json(await site.call('/api/settings/opt-in/manual',{method:'PUT',cookie:owner,body:{mode:'single'}}),200);
 await page.context().clearCookies();await page.context().addCookies([{name:author.split('=')[0],value:author.split('=')[1],url:site.runtime.url}]);
 const email='synthetic-mango-manual-single@example.test';
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/audience');
  const form=page.getByRole('region',{name:'Add a contact by hand'});
  await expect(form).toContainText('Email uses single opt-in');
  await form.getByLabel('Name',{exact:true}).fill('Synthetic Mango market visitor');await form.getByLabel('Email',{exact:true}).fill(email);
  await form.getByLabel('Phone (E.164)',{exact:true}).fill('+61411111111');await form.getByRole('button',{name:'Add property',exact:true}).click();await form.getByLabel('Property 1 name').fill('interest');await form.getByLabel('Property 1 value').fill('Seedlings');
  await form.getByLabel('Where permission was recorded').fill('Saturday market, signed permission card');
  await form.getByLabel('Email consent wording shown').fill('Please send me the monthly garden newsletter.');await form.getByLabel('Destination jurisdiction',{exact:true}).fill('AU');
  await form.getByLabel('I record that this person gave the email permission above.').check();
  await form.getByRole('heading',{name:'Add a contact by hand'}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`manual-entry-${width}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);
 }
 await page.getByRole('button',{name:'Add contact with permission',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Email subscribed with operator-recorded evidence.'})).toBeVisible();
 const contact=(await site.rows(`SELECT id,email_status FROM contacts WHERE email='${email}'`))[0];expect(contact.email_status).toBe('subscribed');expect(edge.sends.filter(send=>send.to===email)).toHaveLength(0);
 const evidence=(await site.rows(`SELECT * FROM consent_evidence WHERE contact_id='${contact.id}'`))[0];expect(evidence).toMatchObject({capture_method:'operator-recorded',confirmation_required:0});expect(evidence.capture_source).toContain('manual-author');expect(evidence.capture_source).toContain('in-person');
 expect(JSON.parse((await site.rows(`SELECT fields_json FROM integration_contact_profiles WHERE contact_id='${contact.id}'`))[0].fields_json)).toEqual({interest:'Seedlings'});
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/audience/'+contact.id);const panel=page.getByRole('region',{name:'Consent evidence',exact:true});await expect(panel).toContainText('Operator-recorded single opt-in');await expect(panel).toContainText('manual-author');await panel.screenshot({path:info.outputPath(`manual-evidence-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);}
 const options=await json(await site.call('/api/contacts/consent',{cookie:author}),200);
 const smsBody={...body,consentText:options.sms.consentText,expressWrittenConsent:true,channel:'sms',contact:{email,phone:'+61411111111'},brandOrLegalSender:options.sms.brand,smsProgram:options.sms.programme,messageCategory:options.sms.category,frequencyDisclosure:options.sms.frequency,destinationJurisdiction:options.sms.jurisdiction,timeZone:'Australia/Brisbane',locationSource:'In-person address supplied by the visitor',locationRecordedAt:new Date(clock.now-60000).toISOString()};
 expect((await site.call('/api/contacts/consent',{method:'POST',cookie:author,body:{...smsBody,expressWrittenConsent:false}})).status).toBe(400);
 const firstSms={...smsBody,contact:body.contact};
 const defaultSms=await json(await site.call('/api/contacts/consent',{method:'POST',cookie:author,body:firstSms}),201);expect(defaultSms.contact.smsStatus).toBe('pending');
 await site.control('/_golive/cron');await expect.poll(()=>edge.sms.sends.length,{timeout:60000,intervals:[250]}).toBe(1);await confirmSmsReply(site,edge);
 expect((await site.rows(`SELECT sms_status FROM contacts WHERE id='${first.contact.id}'`))[0].sms_status).toBe('subscribed');
 const pace=(await site.rows('SELECT max(next_at) due FROM provider_pacing'))[0]?.due??0,current=await site.control('/_golive/clock');await site.control('/_golive/clock',{advanceMs:Math.ceil(Math.max(1,pace-current.now+1)),hold:true});
 const beforeSms=edge.sms.sends.length;
 const sms=await json(await site.call('/api/contacts/consent',{method:'POST',cookie:author,body:smsBody}),201);expect(sms.contact.smsStatus).toBe('pending');
 await site.control('/_golive/cron');await expect.poll(()=>edge.sms.sends.length,{timeout:60000,intervals:[250]}).toBe(beforeSms+1);
 const text=edge.sms.sends.at(-1)!.body.messages[0].message;expect(text).toContain('Reply YES to confirm');expect(text).not.toContain('/consent/confirm/');
 await confirmSmsReply(site,edge);expect((await site.rows(`SELECT sms_status FROM contacts WHERE id='${contact.id}'`))[0].sms_status).toBe('subscribed');
 expect(await site.rows(`SELECT id FROM contact_history WHERE id='${sms.evidence.id}_confirmed'`)).toHaveLength(1);
 await json(await site.call('/api/contacts/'+contact.id+'/opt-out',{method:'POST',cookie:owner,body:{channel:'email'}}),200);
 const refused=await json(await site.call('/api/contacts/consent',{method:'POST',cookie:author,body:{...body,contact:{email}}}),409);expect(refused.detail).toContain('Hand entry cannot change that state');expect((await site.rows(`SELECT email_status FROM contacts WHERE id='${contact.id}'`))[0].email_status).toBe('unsubscribed');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/audience');const form=page.getByRole('region',{name:'Add a contact by hand'});
  await form.getByLabel('Email',{exact:true}).fill(email);await form.getByLabel('Where permission was recorded').fill('Repeat market entry');await form.getByLabel('Email consent wording shown').fill('Please send the newsletter.');await form.getByLabel('Destination jurisdiction',{exact:true}).fill('AU');await form.getByLabel('I record that this person gave the email permission above.').check();
  await form.getByRole('button',{name:'Add contact with permission',exact:true}).click();await expect(form.getByRole('status')).toContainText('Hand entry cannot change that state');await expect(form.getByLabel('Email',{exact:true})).toHaveValue(email);await form.getByRole('status').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`manual-restriction-${width}.png`)});
 }
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.context().clearCookies();await page.context().addCookies([{name:support.split('=')[0],value:support.split('=')[1],url:site.runtime.url}]);await openPage(page,site.runtime.url+'/app/audience');await expect(page.getByRole('heading',{name:'Add a contact by hand'})).toHaveCount(0);await page.screenshot({path:info.outputPath(`manual-support-${width}.png`)});}
 const sent=edge.sms.sends.findLast(send=>send.body.messages[0].to==='61411111111')!,stopClock=await site.control('/_golive/clock');
 const stop=edge.sms.signed({type:'inbound',to:sent.body.messages[0].sender,sender:sent.body.messages[0].to,message:'STOP',received_at:new Date(stopClock.now).toISOString().slice(0,19).replace('T',' '),original_message_id:sent.messageId,original_custom_ref:sent.body.messages[0].custom_ref},stopClock.now);
 expect((await site.call('/webhooks/sms/mobile-message',{method:'POST',headers:stop.headers,raw:stop.body})).status).toBe(204);
 expect((await site.call('/api/contacts/consent',{method:'POST',cookie:author,body:smsBody})).status).toBe(409);
 expect((await site.rows(`SELECT sms_status FROM contacts WHERE id='${contact.id}'`))[0].sms_status).toBe('unsubscribed');
 const activity=await json(await site.call('/api/activity?action=consent.entered&operator=manual-author',{cookie:owner}),200);expect(activity.entries).toHaveLength(4);
 const source=await json(await site.call('/api/insights/list-growth',{cookie:owner}),200);expect(JSON.stringify(source)).toContain('operator-recorded');
 const csv=await site.call('/api/audience/export',{cookie:owner});expect(await csv.text()).toContain('operator-recorded');
 let erased=await site.call('/api/contacts/'+contact.id,{method:'DELETE',cookie:owner}),receipt=await erased.json();
 for(let turn=0;erased.status===202&&turn<400;turn++){erased=await site.call('/api/audience/erasures/'+receipt.receipt.reference+'/resume',{method:'POST',cookie:owner,body:{}});receipt=await erased.json();}expect(erased.status,JSON.stringify(receipt)).toBe(200);
 for(const table of ['consent_evidence','consent_confirmations','sms_service_messages','sms_inbound_receipts','sms_compliance_replies','integration_contact_profiles'])expect(await site.rows(`SELECT contact_id FROM ${table} WHERE contact_id='${contact.id}'`)).toEqual([]);
 await json(await site.call('/api/settings/opt-in/manual',{method:'PUT',cookie:owner,body:{mode:'double'}}),200);
}

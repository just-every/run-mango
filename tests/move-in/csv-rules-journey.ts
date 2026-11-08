import {expect, type Page, type TestInfo} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {openPage} from '../support/navigation';
import type {ImportInput} from '../../src/core/features/audience/import-types';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {json, type Installation} from '../go-live/harness';
import {consentEvidence, installation, record} from './support';

const email = (n:number) => `synthetic-mango-${n}`+'@'+'example.test';
const phone = (n:number) => '+6149157'+String(n).padStart(4,'0');
const at = '2026-02-01T09:00:00Z', confirmed = '2026-02-01T09:05:00Z';

async function settle(site:Installation,cookie:string,job:any,action='resume') {
  for(let step=0; ['queued','applying','undoing'].includes(job.state)&&step<30;step++) {
    ({job}=await json(await site.call(`/api/audience/imports/${job.id}/${action}`,{method:'POST',cookie,body:{}}),200));
  }
  expect(['completed','undone']).toContain(job.state);
  return job;
}
async function apply(site:Installation,cookie:string,input:ImportInput) {
  const preview=await json(await site.call('/api/audience/import-preview',{method:'POST',cookie,body:input}),200);
  let {job}=await json(await site.call('/api/audience/imports',{method:'POST',cookie,body:{fingerprint:preview.fingerprint}}),200);
  job=await settle(site,cookie,job);
  return {preview,job};
}
async function detail(site:Installation,cookie:string,address:string) {
  const found=await json(await site.call('/api/contacts/search?address='+encodeURIComponent(address),{cookie}),200);
  expect(found.contacts).toHaveLength(1);
  return json(await site.call('/api/contacts/'+found.contacts[0].id,{cookie}),200);
}
const dataTables=['contacts','contact_email_addresses','contact_phones','consent_evidence','consent_capture_metadata','audience_import_observations','contact_history'];
async function saved(site:Installation) {
  return Object.fromEntries(await Promise.all(dataTables.map(async table=>[table,await site.rows(`SELECT * FROM ${table} ORDER BY id`)])));
}
async function report(site:Installation,cookie:string,id:string,expected:number[]) {
  const texts:string[]=[];
  for(let read=0;read<2;read++) {
    const response=await site.call(`/api/audience/imports/${id}/report`,{cookie});
    expect(response.status).toBe(200);
    const text=await response.text();texts.push(text);
    const heading=text.split('\n').indexOf('| Input | Created | Updated | Rejected | Other |');
    expect(heading).toBeGreaterThan(0);
    expect(text.split('\n')[heading+2].split('|').slice(1,-1).map(value=>Number(value.trim()))).toEqual(expected);
  }
  expect(texts[1]).toBe(texts[0]);
  return texts[0];
}

/** Real CSV doors: canonical update, stable replay, per-row consent, restrictions and undo. */
export async function csvRulesJourney(page:Page,info:TestInfo) {
  const edge=await providerEdge(),site=await installation(edge,eventSigner(),{sms:true});
  try {
    const cookie=await site.open();
    // The first file owns this native identity; a different file updates its canonical match.
    await apply(site,cookie,{files:[{name:'synthetic-mango-original.csv',preset:'csv-non-subscribed',csv:`email,phone,first name\n${email(201)},${phone(201)},Original`} ]});
    const original=await detail(site,cookie,email(201));
    const input:ImportInput={files:[{name:'synthetic-mango-update.csv',preset:'csv-non-subscribed',csv:[
      'email,phone,first name',`  ${email(201).toUpperCase()}  ,+61 (491) 570-201,Updated`,
      `${email(202)},${phone(202)},Created`,'not-an-address,,Rejected email',',invalid,Rejected phone',
      `${email(201)},${phone(201)},Updated`,
    ].join('\n')}]};
    const update=await apply(site,cookie,input);
    expect(update.preview.counts).toMatchObject({input:5,created:1,updated:1,rejected:2});
    expect(await site.count('contacts')).toBe(2);
    const updated=await detail(site,cookie,email(201));
    expect(updated.contact).toMatchObject({id:original.contact.id,email:email(201),displayName:'Updated',emailStatus:'non-subscribed',smsStatus:'non-subscribed'});
    expect(updated.phones).toMatchObject([{phoneE164:phone(201),contactId:original.contact.id}]);
    expect(updated.phones).toHaveLength(1);expect(updated.emails).toHaveLength(1);
    const reconciliation=await report(site,cookie,update.job.id,[5,1,1,2,1]);
    expect(reconciliation).toContain('| synthetic-mango-update.csv | 4 | non-subscribed | Email must be a valid address. |');
    expect(reconciliation).toContain('| synthetic-mango-update.csv | 5 | non-subscribed | Phone numbers must be supplied in E.164 form, including the country calling code. |');
    const rowOutcomes=reconciliation.split('\n').filter(line=>line.startsWith('| synthetic-mango-update.csv |')).map(line=>line.split('|').at(-2)?.trim());
    expect(rowOutcomes).toEqual(['updated','created','rejected','rejected','skipped']);
    const before=await saved(site),retried=await apply(site,cookie,input);
    expect(retried.job.id).toBe(update.job.id);expect(await saved(site)).toEqual(before);
    const undone=await json(await site.call(`/api/audience/imports/${update.job.id}/undo`,{method:'POST',cookie,body:{}}),200);
    expect((await settle(site,cookie,undone.job,'undo')).state).toBe('undone');
    const restored=await detail(site,cookie,email(201));expect(restored.contact).toEqual(original.contact);
    expect(restored.phones).toEqual(original.phones);expect(restored.emails).toEqual(original.emails);
    expect((await json(await site.call('/api/contacts/search?address='+encodeURIComponent(email(202)),{cookie}),200)).contacts).toEqual([]);

    // A generic file has no incumbent permission: only the row with its own two original times qualifies.
    const consentInput:ImportInput={consent:consentEvidence,files:[{name:'synthetic-mango-unnamed.csv',preset:'csv-subscribed',csv:[
      'email,phone,first name,OPTIN_TIME,CONFIRM_TIME,sms_status',
      `${email(211)},${phone(211)},Confirmed,${at},${confirmed},subscribed`,
      `${email(212)},${phone(212)},No confirmation,${at},,subscribed`,
      `${email(213)},${phone(213)},No optin,,${confirmed},subscribed`,
      `${email(214)},${phone(214)},No times,,,subscribed`,
      `${email(215)},${phone(215)},Reversed,${confirmed},${at},subscribed`,
    ].join('\n')}]};
    const consent=await apply(site,cookie,consentInput);
    expect(consent.preview.counts).toMatchObject({input:5,created:4,updated:0,rejected:1});
    for(const n of [211,212,213,214]) {
      const current=await detail(site,cookie,email(n));
      expect(current.contact).toMatchObject({emailStatus:n===211?'subscribed':'non-subscribed',smsStatus:'non-subscribed'});
      expect(current.phones).toMatchObject([{channelStatus:'non-subscribed'}]);
      if(n===211)expect(current.consent).toMatchObject([{channel:'email',occurredAt:new Date(at).toISOString(),confirmedAt:new Date(confirmed).toISOString()}]);
      else expect(current.consent).toEqual([]);
    }
    expect((await json(await site.call('/api/contacts/search?address='+encodeURIComponent(email(215)),{cookie}),200)).contacts).toEqual([]);
    await report(site,cookie,consent.job.id,[5,4,0,1,0]);
    expect(await site.count('consent_attestations')).toBe(0);

    // Both recorded channels: every incoming state faces independently seeded opt-out or suppression.
    const states=['subscribed','pending','non-subscribed','unsubscribed','suppressed'];
    const cases=['email','sms'].flatMap(channel=>['unsubscribed','suppressed'].flatMap(block=>states.map(incoming=>({channel,block,incoming})))).map((row,index)=>({...row,n:301+index}));
    const initial:ImportInput={files:[{name:'synthetic-mango-restrictions.csv',preset:'csv-non-subscribed',csv:[
      'email,phone,email_status,sms_status',...cases.map(row=>`${email(row.n)},${phone(row.n)},${row.channel==='email'?row.block:'non-subscribed'},${row.channel==='sms'?row.block:'non-subscribed'}`),
    ].join('\n')}]};
    await apply(site,cookie,initial);
    const header='email,phone,email_status,sms_status,OPTIN_TIME,CONFIRM_TIME,sms_occurred_at,sms_confirmed_at,sms_brand,sms_program,sms_category,sms_frequency,sms_jurisdiction,sms_consent_text,sms_consent_version,sms_capture_method,sms_capture_source';
    const incoming:ImportInput={consent:consentEvidence,files:[{name:'synthetic-mango-attempts.csv',preset:'csv-subscribed',csv:[header,...cases.map(row=>[
      email(row.n),phone(row.n),row.channel==='email'?row.incoming:'subscribed',row.channel==='sms'?row.incoming:'subscribed',at,confirmed,at,confirmed,
      'Mango Garden','Garden texts','newsletter','Monthly','AU','Send monthly garden updates','synthetic-mango-v1','csv-import','Original sheet',
    ].join(','))].join('\n')}]};
    const restrictions=await apply(site,cookie,incoming);
    expect(restrictions.preview.counts).toMatchObject({input:20,created:0,updated:20,rejected:0});
    const outcomes=[];
    for(const row of cases) {
      const current=await detail(site,cookie,email(row.n));
      const blocked=row.block==='suppressed'||row.incoming==='suppressed'?'suppressed':'unsubscribed';
      expect(current.contact).toMatchObject({emailStatus:row.channel==='email'?blocked:'subscribed',smsStatus:row.channel==='sms'?blocked:'subscribed'});
      expect(current.emails).toMatchObject([{channelStatus:row.channel==='email'?blocked:'subscribed'}]);
      expect(current.phones).toMatchObject([{channelStatus:row.channel==='sms'?blocked:'subscribed'}]);
      outcomes.push({channel:row.channel,before:row.block,incoming:row.incoming,after:blocked});
    }
    const held=await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id'),suppressed=await site.rows('SELECT * FROM contact_suppressions ORDER BY id');
    const undo=await json(await site.call(`/api/audience/imports/${restrictions.job.id}/undo`,{method:'POST',cookie,body:{}}),200);
    expect((await settle(site,cookie,undo.job,'undo')).state).toBe('undone');
    expect(await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id')).toEqual(held);
    expect(await site.rows('SELECT * FROM contact_suppressions ORDER BY id')).toEqual(suppressed);
    for(const row of cases) {
      const current=await detail(site,cookie,email(row.n));
      const blocked=row.block==='suppressed'||row.incoming==='suppressed'?'suppressed':'unsubscribed';
      expect(current.contact[row.channel==='email'?'emailStatus':'smsStatus']).toBe(blocked);
    }
    await report(site,cookie,restrictions.job.id,[20,0,20,0,0]);
    for(const table of ['consent_confirmations','campaigns','campaign_approval_requests','recipient_steps'])expect(await site.count(table),table).toBe(0);
    expect(edge.sends).toEqual([]);expect(edge.sms.sends).toEqual([]);expect(edge.relaySends).toEqual([]);expect(edge.unexpected).toEqual([]);
    expect((await site.control('/_golive/emissions')).filter((entry:any)=>entry.command.kind==='campaign.dispatch')).toEqual([]);
    // The actual operator download serves the same report without creating authority.
    await page.setViewportSize({width:1440,height:1000});
    await page.context().clearCookies();
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page,site.runtime.url+'/app/audience/import');
    const downloadLink=page.locator(`a[href="/api/audience/imports/${update.job.id}/report"]`);
    await expect(downloadLink).toBeVisible();
    const beforeDownload=await saved(site);
    const downloaded=page.waitForEvent('download');await downloadLink.click();
    const download=await downloaded;expect(download.suggestedFilename()).toBe('import-reconciliation.md');
    expect(await readFile((await download.path())!,'utf8')).toBe(reconciliation);
    expect(await saved(site)).toEqual(beforeDownload);
    await page.screenshot({path:info.outputPath('csv-report-1440.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:info.outputPath('csv-report-390.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    await record('csv-rules-reconciliation.md',reconciliation);
    await record('csv-rules-probe.json',{canonicalId:original.contact.id,updateCounts:update.preview.counts,rerunJob:retried.job.id,undo:undone.job.state,consentCounts:consent.preview.counts,restrictions:outcomes,restrictionUndo:'undone',handoffs:0});
  } finally {await site.runtime.close();await edge.close();}
}

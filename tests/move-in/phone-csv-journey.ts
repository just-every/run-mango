import {expect} from '@playwright/test';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {json} from '../go-live/harness';
import {installation, record} from './support';

/** Independent source expectations: no email column or production normalizer supplies an oracle. */
const filename = 'synthetic-mango-phones.csv';
const valid = [
  {row:2, supplied:'+61 (491) 570-101', phone:'+61491570101', name:'synthetic-mango-1'},
  {row:4, supplied:'+61491570102', phone:'+61491570102', name:'synthetic-mango-2'},
  {row:6, supplied:'+61 491 570 103', phone:'+61491570103', name:'synthetic-mango-3'},
  {row:7, supplied:'+61491570104', phone:'+61491570104', name:'synthetic-mango-4'},
  {row:8, supplied:'+61491570105', phone:'+61491570105', name:'synthetic-mango-5'},
  {row:9, supplied:'+61491570106', phone:'+61491570106', name:'synthetic-mango-6'},
  {row:10, supplied:'+61491570107', phone:'+61491570107', name:'synthetic-mango-7'},
  {row:11, supplied:'+61491570108', phone:'+61491570108', name:'synthetic-mango-8'},
  {row:12, supplied:'+61491570109', phone:'+61491570109', name:'synthetic-mango-9'},
  {row:13, supplied:'+61491570110', phone:'+61491570110', name:'synthetic-mango-10'},
  {row:14, supplied:'+61491570111', phone:'+61491570111', name:'synthetic-mango-11'},
  {row:15, supplied:'+61491570112', phone:'+61491570112', name:'synthetic-mango-12'},
];
const rejected = [
  {row:3, supplied:'not-a-phone', name:'synthetic-mango-invalid', reason:/E\.164.*country calling code/},
  {row:5, supplied:'', name:'synthetic-mango-missing', reason:/email address or E\.164 phone number is required/},
];
const byRow = <T extends {row:number}>(items:T[]) => [...items].sort((a,b)=>a.row-b.row);

/** Preview, apply, resume and read the ordinary operator doors with SMS transport configured. */
export async function phoneCsvJourney() {
  const edge = await providerEdge();
  const site = await installation(edge, eventSigner(), {sms:true});
  try {
    const cookie = await site.open();
    const rows = byRow([...valid, ...rejected]);
    const csv = ['Destination digits,Source label', ...rows.map(row=>`${row.supplied},${row.name}`)].join('\n')+'\n';
    const preview = await json(await site.call('/api/audience/import-preview', {method:'POST', cookie, body:{
      files:[{name:filename, preset:'csv-non-subscribed', csv,
        mapping:{email:'', phone:'Destination digits', display_name:'Source label'}}],
    }}), 200);
    expect(preview.columns).toMatchObject([{name:filename, mapping:{email:'', phone:'Destination digits', display_name:'Source label'}}]);
    expect(preview.counts).toMatchObject({input:14, created:12, updated:0, rejected:2});
    expect(preview.counts.input).toBe(preview.counts.created+preview.counts.updated+preview.counts.rejected);
    expect(preview.rows).toHaveLength(14);
    for (const expected of valid) {
      const row = preview.rows.find((row:any)=>row.file===filename&&row.row===expected.row);
      expect(row).toMatchObject({email:'', phone:expected.phone, displayName:expected.name, status:'non-subscribed', smsStatus:'non-subscribed'});
      expect(row.reason).toBeUndefined();
    }
    for (const expected of rejected) {
      const row = preview.rows.find((row:any)=>row.file===filename&&row.row===expected.row);
      expect(row.reason).toMatch(expected.reason);
    }
    expect(await site.count('contacts')).toBe(0);
    expect(await site.count('contact_phones')).toBe(0);

    let {job} = await json(await site.call('/api/audience/imports', {method:'POST', cookie, body:{fingerprint:preview.fingerprint}}), 200);
    expect(job.state).toBe('applying');
    expect(job.checkpoint).toBeGreaterThan(0);
    expect(job.checkpoint).toBeLessThan(job.total);
    let resumes = 0;
    while (['queued','applying'].includes(job.state)&&resumes<5) {
      ({job} = await json(await site.call(`/api/audience/imports/${job.id}/resume`, {method:'POST', cookie, body:{}}), 200));
      resumes++;
    }
    expect(resumes).toBeGreaterThan(0);
    expect(job).toMatchObject({state:'completed', checkpoint:14, total:14, error:null});
    const readback = await json(await site.call(`/api/audience/imports/${job.id}`, {cookie}), 200);
    expect(readback.job).toMatchObject({id:job.id, state:'completed', checkpoint:14, total:14});

    const contacts = await json(await site.call('/api/audience', {cookie}), 200);
    expect(contacts.contacts.map((contact:any)=>contact.displayName).sort()).toEqual(valid.map(row=>row.name).sort());
    expect(await site.rows('SELECT c.display_name AS name,c.email,c.email_status AS emailStatus,c.sms_status AS smsStatus,p.phone_e164 AS phone,p.channel_status AS phoneStatus FROM contacts c JOIN contact_phones p ON p.contact_id=c.id ORDER BY p.phone_e164'))
      .toEqual(valid.map(row=>({name:row.name, email:null, emailStatus:'non-subscribed', smsStatus:'non-subscribed', phone:row.phone, phoneStatus:'non-subscribed'})));
    expect(await site.count('contacts')).toBe(preview.counts.created);
    expect(await site.count('contact_phones')).toBe(12);
    expect(await site.count('contact_email_addresses')).toBe(0);
    for (const expected of valid) {
      const found = await json(await site.call(`/api/contacts/search?address=${encodeURIComponent(expected.phone)}`, {cookie}), 200);
      expect(found.contacts).toHaveLength(1);
      const id = found.contacts[0].id;
      const detail = await json(await site.call(`/api/contacts/${id}`, {cookie}), 200);
      expect(detail.contact).toMatchObject({id, email:null, displayName:expected.name, emailStatus:'non-subscribed', smsStatus:'non-subscribed'});
      expect(detail.phones).toMatchObject([{contactId:id, phoneE164:expected.phone, channelStatus:'non-subscribed', identityStatus:'active'}]);
      expect(detail.phones).toHaveLength(1);
      expect(detail.emails).toEqual([]);
      expect(detail.consent).toEqual([]);
      expect(detail.campaignHistory).toEqual([]);
    }
    for (const expected of rejected) {
      expect(contacts.contacts.some((contact:any)=>contact.displayName===expected.name)).toBe(false);
    }

    const reports:string[] = [];
    for (let read=0; read<2; read++) {
      const response = await site.call(`/api/audience/imports/${job.id}/report`, {cookie});
      expect(response.status).toBe(200);
      const report = await response.text();
      reports.push(report);
      const outcomes = report.split('\n').filter(line=>line.startsWith(`| ${filename} |`)).map(line=>{
        const [,file,row,status,reason] = line.split('|').map(cell=>cell.trim());
        return {file, row:Number(row), status, reason};
      });
      expect(outcomes).toHaveLength(14);
      expect(outcomes.map(({file,row,status})=>({file,row,status}))).toEqual(rows.map(({row})=>({file:filename,row,status:'non-subscribed'})));
      expect(outcomes.filter(row=>row.reason)).toHaveLength(2);
      for (const expected of rejected) {
        expect(outcomes.find(row=>row.file===filename&&row.row===expected.row)?.reason).toMatch(expected.reason);
      }
      for (const expected of valid) expect(outcomes.find(row=>row.row===expected.row)?.reason).toBe('');
    }
    expect(reports[1]).toBe(reports[0]);
    for (const table of ['consent_evidence','consent_confirmations','campaigns','campaign_approval_requests','recipient_steps']) {
      expect(await site.count(table), `${table} after phone-only import and repeated report reads`).toBe(0);
    }
    expect((await site.control('/_golive/emissions')).filter((entry:any)=>entry.command.kind==='campaign.dispatch')).toEqual([]);
    expect(edge.sends).toEqual([]);
    expect(edge.relaySends).toEqual([]);
    expect(edge.sms.sends).toEqual([]);
    expect(edge.behavior.attempts).toEqual([]);
    expect(edge.unexpected).toEqual([]);
    await record('phone-csv-reconciliation.md', reports[0]);
    await record('phone-csv-probe.json', {counts:preview.counts, rows:preview.rows, job:readback.job, resumes, contacts:contacts.contacts,
      reportReads:2, confirmationHandoffs:0, marketingHandoffs:0, smsHandoffs:0});
  } finally {
    await site.runtime.close();
    await edge.close();
  }
}

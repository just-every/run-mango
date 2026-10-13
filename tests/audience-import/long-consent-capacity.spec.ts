import { expect, test } from '@playwright/test';
import { contract } from '../contract.js';
import { native, consent } from './native';
import { meter } from './d1-meter';
import { authenticatedRequests } from './request-runtime';

for (const capacity of [3, 10000]) for (const existing of [false, true]) contract('CONT-010', `${capacity === 10000 ? 'maximum' : 'routine'} subscribed review retains long consent for ${existing ? 'existing' : 'new'} contacts${capacity === 10000 ? ' @release' : ''}`, async () => {
  test.setTimeout(600000);
  const h = await native();
  try {
    if (existing) {
      const rows = Array.from({length:capacity}, (_,i) => ({id:`capacity-${i}`,email:`capacity${i}@example.test`}));
      await h.f.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) SELECT json_extract(value,'$.id'),json_extract(value,'$.email'),'Original','non-subscribed','non-subscribed',1,1 FROM json_each(?)").bind(JSON.stringify(rows)).run();
      await h.f.db.prepare("INSERT INTO contact_email_addresses(id,contact_id,email,channel_status,created_at,updated_at) SELECT id||'-email',id,email,email_status,1,1 FROM contacts").run();
      await h.f.db.prepare("INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) SELECT id||'-history',id,'original','Original history',1,1,1 FROM contacts").run();
    }
    const disclosure = ('I agree to receive the weekly newsletter. ' + 'Disclosure '.repeat(100)).slice(0,1000);
    const csv = 'Email Address,Email Marketing Status,OPTIN_TIME,CONFIRM_TIME\n' + Array.from({length:capacity}, (_,i) => `capacity${i}@example.test,subscribed,2026-09-01 10:00:00,2026-09-01 10:05:00`).join('\n');
    expect(new TextEncoder().encode(csv).length).toBeLessThan(1000000);
    const measured = meter(h.f.db);
    const http = await authenticatedRequests(h.f,measured.db);
    measured.reset();
    const preview = await http.json('/api/audience/import-preview',{consent:{...consent,consentText:disclosure},files:[{name:'capacity.csv',preset:'csv-subscribed',csv}]});
    expect(preview.rows).toHaveLength(capacity);
    expect(preview.counts).toMatchObject({created:existing?0:capacity,updated:existing?capacity:0,rejected:0});
    const stats = measured.stats();
    console.log('D1 long-consent maximum review', {existing, ...stats});
    expect(stats.count).toBeLessThanOrEqual(1000);
    expect(stats.maxBindings).toBeLessThanOrEqual(100);
    expect(stats.maxSqlBytes).toBeLessThanOrEqual(100000);
    const {readAudiencePlan} = await import('../../src/core/features/audience/import-plans');
    const stored = await h.f.db.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE fingerprint=?').bind(preview.fingerprint).first<{fingerprint:string;plan_json:string}>();
    const retained = await readAudiencePlan(h.f.db,stored!);
    expect(retained.entries).toHaveLength(capacity);
    for (const entry of retained.entries) {
      expect((entry.effects[0].value as any).tables.consent_evidence[0].consent_text).toBe(disclosure);
    }
    expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({count:existing?capacity:0});
  } finally { await h.close(); }
});

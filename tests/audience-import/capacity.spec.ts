import { expect, test } from '@playwright/test';
import { contract } from '../contract.js';
import { native, consent } from './native';
import { meter } from './d1-meter';
import { authenticatedRequests } from './request-runtime';
import { maxContactImportRows } from '../../src/core/features/audience/import-limits';
import { createAudienceImportService } from '../../src/core/features/audience/import-service';

const capacity = 10000;
const input = () => ({ consent, files: [{ name: 'capacity.csv', preset: 'csv-subscribed',
  csv: 'Email Address,Email Marketing Status,OPTIN_TIME,CONFIRM_TIME\n' + Array.from({ length: capacity }, (_, i) =>
    `capacity${i}@example.test,${['subscribed', 'unsubscribed', 'cleaned'][i % 3]},2026-09-01 10:00:00,2026-09-01 10:05:00`).join('\n'),
}] });

for (const existing of [false, true]) contract('CONT-010', `maximum review fits one D1 invocation for ${existing ? 'existing' : 'new'} contacts @release`, async () => {
  test.setTimeout(600000);
  const h = await native();
  try {
    if (existing) {
      const rows = Array.from({ length: capacity }, (_, i) => ({ id: `capacity-${i}`, email: `capacity${i}@example.test` }));
      await h.f.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) SELECT json_extract(value,'$.id'),json_extract(value,'$.email'),'Original','non-subscribed','non-subscribed',1,1 FROM json_each(?)").bind(JSON.stringify(rows)).run();
      await h.f.db.prepare("INSERT INTO contact_email_addresses(id,contact_id,email,channel_status,created_at,updated_at) SELECT id||'-email',id,email,email_status,1,1 FROM contacts").run();
      await h.f.db.prepare("INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) SELECT id||'-history',id,'original','Original history',1,1,1 FROM contacts").run();
    }
    const measured = meter(h.f.db);
    h.context.storage.database = measured.db;
    const service = createAudienceImportService({ ...h.f.platform, database: { $client: measured.db } } as typeof h.f.platform);
    const preview = await service.preview(input(), h.context);
    expect(preview.rows).toHaveLength(capacity);
    expect(preview.counts).toMatchObject({ created: existing ? 0 : capacity, updated: existing ? capacity : 0, rejected: 0, unsubscribed: 3333, suppressed: 3333 });
    const stats = measured.stats();
    console.log('D1 maximum review', { existing, capacity, ...stats });
    expect(stats.count).toBeLessThanOrEqual(1000);
    expect(stats.maxBindings).toBeLessThanOrEqual(100);
    expect(stats.maxSqlBytes).toBeLessThanOrEqual(100000);
    expect(await h.f.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({ count: existing ? capacity : 0 });
  } finally { await h.close(); }
});

contract('CONT-010', 'over-cap multi-file review counts duplicate and invalid rows and refuses without import queries or durable effects', async () => {
  const h = await native();
  try {
    const measured = meter(h.f.db);
    h.context.storage.database = measured.db;
    const service = createAudienceImportService({ ...h.f.platform, database: { $client: measured.db } } as typeof h.f.platform);
    const oversized = { files: [
      { name: 'duplicates.csv', preset: 'csv-non-subscribed', csv: 'Email Address\n' + Array.from({ length: maxContactImportRows }, () => 'duplicate@example.test').join('\n') },
      { name: 'invalid.csv', preset: 'csv-non-subscribed', csv: 'Email Address\ninvalid-email' },
    ] };
    // The service boundary must refuse before import data access. HTTP still
    // performs its real session/origin checks before reaching this boundary.
    await expect(service.preview(oversized, h.context)).rejects.toThrow();
    expect(measured.stats().count).toBe(0);
    const http = await authenticatedRequests(h.f, measured.db);
    const refused = await http.response('/api/audience/import-preview', oversized);
    expect(refused.status).toBe(400);
    expect(await refused.json()).toMatchObject({ error: 'import_preview_failed' });
    for (const table of ['contacts', 'audience_import_plans', 'audience_import_plan_chunks', 'audience_import_plan_contacts']) {
      expect(await h.f.db.prepare(`SELECT count(*) AS count FROM ${table}`).first()).toEqual({ count: 0 });
    }
  } finally { await h.close(); }
});

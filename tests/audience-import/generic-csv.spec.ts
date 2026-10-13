import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { readFile } from 'node:fs/promises';
import { copy } from '../../src/core/features/landing/copy';
import { normalizeImport } from '../../src/core/features/audience/import-normalize';
import { invitationRuntime } from '../../operations/fixtures/invitation-runtime.mjs';

contract('CONT-010', 'generic CSV presets expose no unverified vendor importer and refuse the retired vendor selectors', async () => {
  const fixture = await invitationRuntime();
  try {
    const cookie = await fixture.bootstrap();
    const response = await fixture.call('/api/audience/import-presets', { cookie });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.presets.map(({ id }) => id)).toEqual(['csv-subscribed', 'csv-unsubscribed', 'csv-cleaned', 'csv-non-subscribed', 'mango']);
    expect(JSON.stringify(body)).not.toMatch(/mailchimp/i);
    for (const status of ['subscribed', 'unsubscribed', 'cleaned', 'non-subscribed']) {
      const input = { files: [{ name: 'source.csv', preset: `mailchimp-${status}`, csv: 'Email Address\nimport@example.test' }] };
      expect(() => normalizeImport(input)).toThrow('Unknown CSV preset');
      const rejected = await fixture.call('/api/audience/import-preview', { cookie, method: 'POST', body: input });
      expect(rejected.status).toBe(400);
      expect((await rejected.json()).error).toBe('invalid_import');
    }
    expect(await fixture.db.prepare('SELECT count(*) AS count FROM contacts').first()).toEqual({ count: 0 });
    const seed = JSON.parse(await readFile('seed.json', 'utf8'));
    // Naming what Mango replaces is allowed (the homepage line "alternative to ...", seed.replaces); claiming a vendor
    // importer or comparing against a vendor is not.
    expect(seed.replaces).toEqual(['Mailchimp', 'Klaviyo']);
    expect(JSON.stringify(seed.capabilities)).not.toMatch(/mailchimp|klaviyo/i);
    const landing = await readFile('src/core/features/landing/copy.ts', 'utf8');
    expect(copy.hero.replaces).toBe('100% free, open source alternative to Mailchimp and Klaviyo');
    expect(copy.meta.description.endsWith(`${copy.hero.replaces}.`)).toBe(true);
    expect(`${landing}${JSON.stringify(seed)}`).not.toMatch(/\b(better|cheaper|faster|simpler|more \w+) than\b|\bunlike\b/i);
  } finally { await fixture.close(); }
});

contract('CONT-003', 'retiring a vendor claim preserves historical stored provenance through lossless Mango restoration', async () => {
  const { native, files, consent, finish } = await import('./native');
  const first = await native('source-authority');
  let exported: string;
  try {
    const preview = await first.service.preview({ files: await files(), consent }, first.context);
    const job = await first.service.create(preview.fingerprint, first.context); await finish(first, job.id);
    // Persisted evidence from an earlier release is historical data, not a
    // current importer capability claim; an upgrade must not relabel it.
    await first.f.db.prepare("UPDATE consent_evidence SET capture_method='mailchimp-export',capture_source='Mailchimp export: subscribed.csv'").run();
    await first.f.db.prepare("UPDATE audience_import_observations SET capture_method='mailchimp-export',capture_source='Mailchimp export: ' || source_file").run();
    exported = await first.service.exportCsv();
  } finally { await first.close(); }
  const restored = await native('destination-authority');
  try {
    const preview = await restored.service.preview({ files: [{ name: 'historical.csv', preset: 'mango', csv: exported! }] }, restored.context);
    expect(preview.rows.filter(row => row.reason)).toEqual([]);
    const job = await restored.service.create(preview.fingerprint, restored.context); await finish(restored, job.id);
    expect(await restored.service.exportCsv()).toBe(exported!);
    expect(await restored.f.db.prepare('SELECT DISTINCT capture_method,capture_source FROM consent_evidence').all()).toMatchObject({ results: [{ capture_method: 'mailchimp-export', capture_source: 'Mailchimp export: subscribed.csv' }] });
    expect((await restored.f.db.prepare('SELECT email_status FROM contacts ORDER BY email').all()).results.map(row => row.email_status)).toEqual(['suppressed', 'unsubscribed', 'subscribed', 'unsubscribed']);
  } finally { await restored.close(); }
});

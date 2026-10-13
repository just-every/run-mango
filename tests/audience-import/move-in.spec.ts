import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { files, native, consent } from './native';
import { authenticatedRequests } from './request-runtime';
import { audienceState, applyReviewed, undoReviewed, proveImportedOptOutAtDispatch } from './move-in-support';

// One public-door matrix: every documented file gets a dry run, durable apply,
// replay and reversal. The data is invented; the database and routes are real.
test('CONT-003/004/010 documented CSV shapes preserve consent and opt-outs through review, repeat, undo and dispatch', async () => {
  test.setTimeout(180000);
  const h = await native();
  try {
    const http = await authenticatedRequests(h.f, h.f.db, h.f.platform.mailer);
    const original = await files();
    const matrix = [
      ...original.map((file, i) => ({ file, state: ['non-subscribed', 'unsubscribed', 'suppressed'][i], count: i === 2 ? 1 : 2, warning: i === 0 })),
      ...await Promise.all([
        ['source-a-non-subscribed', 'csv-non-subscribed', 'non-subscribed'],
        ['source-b-confirmed', 'csv-subscribed', 'non-subscribed'],
        ['source-b-unconfirmed', 'csv-subscribed', 'pending'],
        ['source-b-unsubscribed', 'csv-unsubscribed', 'unsubscribed'],
        ['source-b-complained', 'csv-cleaned', 'suppressed'],
        ['source-b-bounced', 'csv-cleaned', 'suppressed'],
        ['source-b-blocked', 'csv-cleaned', 'suppressed'],
      ].map(async ([name, preset, state]) => ({ file: { name: `${name}.csv`, preset,
        csv: await readFile(`tests/audience-import/fixtures/${name}.csv`, 'utf8') }, state, count: 1, warning: name === 'source-b-confirmed' }))),
    ];
    await applyReviewed(http, { files: [{ name: 'prior.csv', preset: 'csv-unsubscribed', csv: 'Email\nprior@example.test' }] });
    for (const item of matrix) {
      await test.step(item.file.name, async () => {
        const before = await audienceState(h), input = { files: [item.file] };
        const preview = await http.json('/api/audience/import-preview', input);
        const counts = { created: item.count, updated: 0, rejected: 0,
          unsubscribed: item.state === 'unsubscribed' ? item.count : 0, suppressed: item.state === 'suppressed' ? item.count : 0 };
        expect(preview.counts).toMatchObject(counts);
        expect(await audienceState(h)).toEqual(before);
        expect(preview.rows.map((row: any) => row.status)).toEqual(Array(item.count).fill(item.state));
        expect(preview.warnings.length > 0).toBe(item.warning);
        expect(preview.columns[0].mapping.occurred_at).not.toBe('Created date and time');
        const { job } = await applyReviewed(http, input);
        // Resume is safe even for a completed single-file job; the separate
        // multi-batch route journey proves interrupted progress and undo.
        expect((await http.json(`/api/audience/imports/${job.id}/resume`, {})).job.state).toBe('completed');
        const imported = await audienceState(h);
        for (const row of preview.rows) expect(await h.f.db.prepare('SELECT email_status FROM contacts WHERE email=?').bind(row.email).first())
          .toEqual({ email_status: item.state });
        if (item.state === 'unsubscribed') {
          const reviewed = await http.json('/api/campaign-authoring/audience', {
            inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'email', comparator: 'eq', value: preview.rows[0].email }] }),
            exclusionRulesJson: '[]', channels: ['email'],
          });
          expect(reviewed).toMatchObject({ candidateCount: 1, eligibleCount: 0 });
          // A plain opt-out export has no activity and no send permission.
          // Shared audience review reports both observed exclusion reasons.
          expect([...reviewed.exclusions].sort((a, b) => a.reason.localeCompare(b.reason))).toEqual([
            { reason: 'dormant', count: 1 }, { reason: 'email-unsubscribed', count: 1 },
          ]);
        }
        const repeated = await applyReviewed(http, input);
        expect(repeated.preview.fingerprint).toBe(preview.fingerprint);
        expect(repeated.job.id).toBe(job.id);
        expect(await audienceState(h)).toEqual(imported);
        await undoReviewed(http, job.id);
        // Undo removes what the import created but keeps every opt-out and suppression it applied.
        expect(await audienceState(h)).toEqual({ ...before, surviving_opt_outs: imported.surviving_opt_outs,
          contact_suppressions: imported.contact_suppressions.map((row: Record<string, unknown>) => ({ ...row, contact_id: null })) });
        console.log('Move-in fixture', JSON.stringify({ file: item.file.name, counts, state: item.state, warning: item.warning, previewUnchanged: true, repeatUnchanged: true, undoRestored: true }));
      });
    }
    // Original scope and both timestamps cannot override an existing opt-out.
    const prior = await audienceState(h);
    const preserved = await applyReviewed(http, { consent, files: [{ name: 'prior-with-evidence.csv', preset: 'csv-subscribed',
      csv: 'Email,OPTIN_TIME,CONFIRM_TIME\nprior@example.test,2026-09-01 10:00:00,2026-09-01 10:05:00' }] });
    expect(preserved.preview.counts).toMatchObject({ created: 0, updated: 1, rejected: 0, unsubscribed: 1, suppressed: 0 });
    expect(preserved.preview.rows[0].status).toBe('unsubscribed');
    await undoReviewed(http, preserved.job.id);
    expect(await audienceState(h)).toEqual(prior);
    // An explicitly mapped permissive column cannot hide any recognized alias.
    const restrictive = await http.json('/api/audience/import-preview', { consent, files: [{ name: 'multiple-statuses.csv', preset: 'csv-subscribed', mapping: { status: 'Selected status' },
      csv: 'Email_Address,Selected status, STATUS ,Email_Marketing_Status,OPTIN_TIME,CONFIRM_TIME\nblocked@example.test,Confirmed,Unsubscribed,Blocked,2026-09-01 10:00:00,2026-09-01 10:05:00\nunknown@example.test,Confirmed,mystery,Confirmed,2026-09-01 10:00:00,2026-09-01 10:05:00' }] });
    expect(restrictive.counts).toMatchObject({ created: 1, updated: 0, rejected: 1, unsubscribed: 0, suppressed: 1 });
    expect(restrictive.rows.find((row: any) => row.email === 'blocked@example.test').status).toBe('suppressed');
    expect(await audienceState(h)).toEqual(prior);
    const custom = await http.json('/api/audience/import-preview', { files: [{ name: 'custom-fields.csv', preset: 'csv-non-subscribed',
      mapping: { display_name: 'Full name', phone: 'Mobile', first_name: '' },
      csv: 'Email,Full name,Mobile,First Name\ncustom@example.test,Custom Name,+61412345678,Ignored\ninvalid-phone@example.test,Invalid,not-a-phone,Ignored' }] });
    expect(custom.counts).toMatchObject({ created: 1, updated: 0, rejected: 1, unsubscribed: 0, suppressed: 0 });
    expect(custom.rows.find((row: any) => row.email === 'custom@example.test').displayName).toBe('Custom Name');
    expect(custom.columns[0].mapping).toMatchObject({ display_name: 'Full name', phone: 'Mobile', first_name: '' });
    expect(custom.rows.find((row: any) => row.email === 'invalid-phone@example.test').reason).toBeTruthy();
    expect(await audienceState(h)).toEqual(prior);
    console.log('Explicit extra mappings: custom display name retained; invalid mapped mobile rejected; Do not map retained.');
    // The matrix's own undo kept export-unsubscribed's opt-out, so the dispatch proof uses a fresh address.
    await proveImportedOptOutAtDispatch(h, http, matrix.find(item => item.file.name === 'source-b-unsubscribed.csv')!.file.csv.replace('export-unsubscribed@', 'late-unsubscribed@'));
  } finally { await h.close(); }
});

import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { providerEdge } from '../go-live/edge';
import { eventSigner } from '../go-live/sendgrid-events';
import { installation, json, type Installation } from '../go-live/harness';
import { accountExport } from './archive';
import { consentEvidence, drive, importArchive, postArchive, record, screenshotPath, tableCounts } from './support';

// One account export through the running Import page and routes: preview writes nothing,
// statuses keep consent, content carries no authority, and undo keeps what people changed.
const statuses = async (site: Installation) => Object.fromEntries((await site.rows('SELECT email,email_status FROM contacts ORDER BY email')).map(row => [row.email, row.email_status]));
const content = (site: Installation) => site.rows('SELECT kind,title,subject,sent_at_source,state,outcome FROM move_in_content ORDER BY archive_id,ordinal');
const screens = async (page: Page, name: string, info: { outputPath(name: string): string }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    // Full-page captures start at the top with nothing focused, so the sticky header and skip link stay in place.
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
    await page.screenshot({ path: screenshotPath(`${name}-${width}.png`, info.outputPath(`${name}-${width}.png`)), fullPage: true });
  }
};
const facts = ['delivery_facts', 'campaign_results', 'attribution_facts', 'external_cost_facts', 'recipient_steps', 'step_dispatches', 'link_click_facts', 'provider_fact_inbox'];

test('[CONT-001][CONT-002][CONT-003][CONT-010][CAMP-002][CAMP-004][SEND-006][DATA-001] an account export moves in by status, keeps consent, carries no authority and undoes safely', async ({ page }, info) => {
  const edge = await providerEdge(), signer = eventSigner();
  const site = await installation(edge, signer);
  try {
    const cookie = await site.open();
    await page.context().addCookies([{ name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url }]);
    // An address that had already opted out in Mango before the move.
    const prior = await json(await site.call('/api/audience/import-preview', { method: 'POST', cookie, body: { files: [{ name: 'earlier.csv', preset: 'csv-unsubscribed', csv: 'Email Address\noptedout@example.test' }] } }), 200);
    let { job } = await json(await site.call('/api/audience/imports', { method: 'POST', cookie, body: { fingerprint: prior.fingerprint } }), 200);
    while (['queued', 'applying'].includes(job.state)) ({ job } = await json(await site.call(`/api/audience/imports/${job.id}/resume`, { method: 'POST', cookie, body: {} }), 200));

    // Upload and preview on the Import page. Preview writes nothing to any table.
    const bytes = await accountExport();
    await page.goto(`${site.runtime.url}/app/audience/import`);
    await page.getByLabel('Choose CSV files').setInputFiles({ name: 'account-export.zip', mimeType: 'application/zip', buffer: Buffer.from(bytes) });
    await page.getByRole('combobox', { name: 'Message category', exact: true }).selectOption(consentEvidence.messageCategory);
    for (const [label, value] of [['Brand or legal sender', consentEvidence.brandOrLegalSender], ['Disclosed frequency', consentEvidence.frequencyDisclosure],
      ['Destination jurisdiction', consentEvidence.destinationJurisdiction], ['Consent version', consentEvidence.consentVersion], ['Original consent text', consentEvidence.consentText]]) await page.getByRole('textbox', { name: new RegExp(`^${label}`) }).fill(value);
    await screens(page, 'upload', info);
    const before = await tableCounts(site);
    await page.getByRole('button', { name: 'Preview import' }).click();
    await expect(page.getByRole('heading', { name: 'Whole-archive preview' })).toBeVisible({ timeout: 60000 });
    const afterPreview = await tableCounts(site);
    expect(afterPreview).toEqual(before);
    await record('preview-writes-nothing.json', { tables: Object.keys(before).length, changed: Object.keys(before).filter(table => afterPreview[table] !== before[table]), before, afterPreview });
    await screens(page, 'preview', info);

    const reviewed = (await postArchive(site, cookie, '/api/audience/archive-preview', bytes)).body;
    const file = (name: string) => reviewed.summary.audience.find((item: { path: string }) => item.path.endsWith(name));
    expect(file('subscribed.csv')).toMatchObject({ rows: 8, created: 4, updated: 1, duplicatesWithin: 1, duplicatesAcross: 1, rejected: 1, unknownConsent: 1 });
    expect(file('unsubscribed.csv')).toMatchObject({ rows: 2, created: 2, updated: 0, duplicatesWithin: 0, duplicatesAcross: 0, rejected: 0 });
    expect(file('cleaned.csv')).toMatchObject({ rows: 1, created: 1, outcomes: { suppressed: 1 } });
    expect(file('transactional.csv')).toMatchObject({ rows: 1, created: 1, outcomes: { 'non-subscribed': 1 } });
    for (const item of reviewed.summary.audience) expect(item.rows).toBe(item.created + item.updated + item.duplicatesWithin + item.duplicatesAcross + item.rejected + item.skipped);
    expect(reviewed.summary.kept.map((kind: { kind: string; files: number }) => [kind.kind, kind.files])).toEqual([['appointments', 1], ['ecommerce', 2], ['events', 1], ['gallery', 2], ['reports', 3], ['sms', 1], ['unmatched-content', 1]]);
    await record('preview.json', reviewed);

    // Import through the page: contacts by status, imported history, a draft starter.
    await page.getByRole('button', { name: 'Import archive' }).click();
    await expect(page.getByText(/is imported/)).toBeVisible({ timeout: 300000 });
    await screens(page, 'imported', info);
    const archive = (await json(await site.call('/api/audience/archives', { cookie }), 200)).archives[0];
    expect(archive.state).toBe('applied');
    const imported = await statuses(site);
    expect(imported).toEqual({ 'ada@example.test': 'subscribed', 'ben@example.test': 'subscribed', 'both@example.test': 'unsubscribed', 'cleo@example.test': 'suppressed',
      'cy@example.test': 'non-subscribed', 'dup@example.test': 'subscribed', 'optedout@example.test': 'unsubscribed', 'tess@example.test': 'non-subscribed', 'uma@example.test': 'unsubscribed' });
    const detail = await json(await site.call(`/api/audience/archives/${archive.id}`, { cookie }), 200);
    expect(detail.entries).toHaveLength(reviewed.summary.archive.entries);
    for (const entry of detail.entries) expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    // Custody holds the uploaded bytes themselves: the stored chunks rebuild the exact archive.
    const chunks = await site.rows(`SELECT base64 FROM move_in_archive_chunks WHERE archive_id='${archive.id}' ORDER BY ordinal`);
    const held = createHash('sha256').update(Buffer.from(chunks.map(row => String(row.base64)).join(''), 'base64')).digest('hex');
    expect([held, detail.archive.sha256]).toEqual([createHash('sha256').update(bytes).digest('hex'), createHash('sha256').update(bytes).digest('hex')]);
    const importedContent = await content(site);
    expect(importedContent.map(row => [row.kind, row.title, row.sent_at_source])).toEqual([['history', 'Spring letter', '2026-09-01 09:00:00 +1000'], ['history', 'Winter letter', 'Jun 1, 2026 9:00 am'], ['draft', 'Welcome letter', '']]);

    // Reports and "sent" figures are source records only: no fact, result or count comes from them.
    for (const table of facts) expect((await site.rows(`SELECT count(*) AS n FROM ${table}`))[0].n, table).toBe(0);
    const campaigns = await json(await site.call('/api/campaigns', { cookie }), 200);
    const starter = detail.content.find((row: { kind: string }) => row.kind === 'draft');
    const results = await json(await site.call(`/api/campaigns/${starter.campaign_id}/results`, { cookie }), 200);
    const insights = await json(await site.call('/api/insights', { cookie }), 200);
    expect(JSON.stringify([campaigns, results, insights])).not.toMatch(/\b(412|388|250|201)\b/);
    expect(campaigns.campaigns.map((item: { state: string }) => item.state)).toEqual(['draft']);
    await record('no-facts-from-archive.json', { factTables: Object.fromEntries(await Promise.all(facts.map(async table => [table, (await site.rows(`SELECT count(*) AS n FROM ${table}`))[0].n]))), campaigns, results, insights });

    // A foreign merge tag stays visible and blocks approval through the personalisation check.
    const spring = detail.content.find((row: { title: string }) => row.title === 'Spring letter');
    const copy = await json(await site.call(`/api/imported-history/${spring.id}/copy`, { method: 'POST', cookie }), 201);
    const checks = await json(await site.call(`/api/campaigns/${copy.campaignId}/checks`, { method: 'POST', cookie, body: { revisionId: copy.revisionId } }), 200);
    // The source's merge tag is left as written and named by the blocked personalisation check.
    expect(JSON.stringify(checks)).toContain('*|FNAME|*');
    const approval = await site.call(`/api/campaigns/${copy.campaignId}/approve`, { method: 'POST', cookie, body: { revisionId: copy.revisionId, idempotencyKey: `approve-${copy.revisionId}` } });
    const blocked = await approval.json();
    expect(approval.status).toBe(409);
    expect(blocked.blockers.find((item: { kind: string }) => item.kind === 'message.personalisation')).toMatchObject({ status: 'blocked', detail: expect.stringContaining('*|FNAME|*') });
    await record('merge-tag-check.json', { approvalStatus: approval.status, blockers: blocked.blockers });

    // The operator edits one imported draft and one contact; another person unsubscribes through their link.
    const [{ id: starterRevision }] = await site.rows(`SELECT active_revision_id AS id FROM campaigns WHERE id='${starter.campaign_id}'`);
    await json(await site.call(`/api/campaign-revisions/${starterRevision}`, { method: 'PATCH', cookie, body: { name: 'Welcome letter (edited)' } }), 200);
    await json(await site.call('/api/contacts/consent', { method: 'POST', cookie, body: { contact: { email: 'cy@example.test', displayName: 'Cy Confirmed' }, channel: 'email', ...consentEvidence,
      captureMethod: 'operator-entry', captureSource: 'Market stall sign-up sheet', occurredAt: new Date().toISOString() } }), 201);
    const ben = (await site.rows("SELECT id FROM contacts WHERE email='ben@example.test'"))[0].id;
    const { url } = await site.control('/_golive/unsubscribe-link', { contactId: ben });
    expect((await fetch(site.local(url), { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'confirm=true' })).status).toBe(200);

    // Undo on the page; then show what went and what stayed.
    await page.goto(`${site.runtime.url}/app/audience/import`);
    await page.getByRole('button', { name: 'Undo this import' }).click();
    await page.getByRole('button', { name: 'Confirm undo' }).click();
    await expect(page.getByText(/is undone/)).toBeVisible({ timeout: 300000 });
    await page.getByRole('button', { name: 'Show imported history and drafts' }).first().click();
    await screens(page, 'undo', info);
    const undone = (await json(await site.call(`/api/audience/archives/${archive.id}`, { cookie }), 200)).archive;
    const afterUndo = await statuses(site);
    const optOuts = await site.rows('SELECT reason FROM surviving_opt_outs ORDER BY reason');
    const report = await (await site.call(`/api/audience/archives/${archive.id}/report`, { cookie })).text();
    await record('reconciliation-report.md', report);
    await page.setContent(`<pre style="font:13px/1.4 monospace;white-space:pre-wrap;padding:16px">${report.replaceAll('&', '&amp;').replaceAll('<', '&lt;')}</pre>`);
    await screens(page, 'report', info);
    expect(afterUndo).toEqual({ 'ben@example.test': 'unsubscribed', 'cy@example.test': 'pending', 'optedout@example.test': 'unsubscribed' });
    // Kept: the address that existed before, the one who unsubscribed and the one the operator edited, each with a reason.
    const keptIds = (await site.rows("SELECT id FROM contacts WHERE email IN ('optedout@example.test','ben@example.test','cy@example.test')")).map(row => row.id).sort();
    expect(undone.undo.contacts.kept.map((item: { contactId: string }) => item.contactId).sort()).toEqual(keptIds);
    expect(undone.undo.contacts.kept.every((item: { reason: string }) => item.reason.length > 0)).toBe(true);
    expect((await content(site)).map(row => [row.kind, row.state])).toEqual([['history', 'removed'], ['history', 'removed'], ['draft', 'kept']]);
    expect(optOuts.map(row => row.reason)).toEqual(expect.arrayContaining(['import-suppressed', 'import-unsubscribed', 'recipient-unsubscribe']));
    expect(report).not.toMatch(/\| NO \|/);
    await record('undo-table.json', { importedStatuses: imported, afterUndo, keptContacts: undone.undo.contacts.kept, removedContacts: undone.undo.contacts.removed, content: await content(site), optOuts });

    // The same archive again applies cleanly; the opted-out address stays opted out.
    const rerun = await importArchive(site, cookie, bytes);
    expect(rerun.archive.state).toBe('applied');
    const rerunStatuses = await statuses(site);
    expect(rerunStatuses).toEqual({ ...imported, 'ben@example.test': 'unsubscribed', 'cy@example.test': 'pending' });
    expect(rerunStatuses['optedout@example.test']).toBe('unsubscribed');
    // Importing it twice in a row changes nothing.
    const beforeRepeat = await tableCounts(site);
    const repeat = await postArchive(site, cookie, '/api/audience/archives', bytes, rerun.preview.fingerprint);
    expect(repeat.body.repeated).toBe(true);
    expect(await tableCounts(site)).toEqual(beforeRepeat);
    await record('rerun.json', { rerunStatuses, repeated: repeat.body.repeated, archive: repeat.body.archive.id === rerun.archive.id });

    // Deleting a contact the archive brought in withdraws every original archive that holds them.
    const ada = (await site.rows("SELECT id FROM contacts WHERE email='ada@example.test'"))[0].id;
    let { receipt } = await json(await site.call(`/api/contacts/${ada}`, { method: 'DELETE', cookie }), 202);
    while (receipt.state === 'pending') ({ receipt } = await (await site.call(`/api/audience/erasures/${receipt.reference}/resume`, { method: 'POST', cookie })).json());
    expect(receipt.state).toBe('complete');
    expect(await site.rows('SELECT count(*) AS n FROM move_in_archive_chunks')).toEqual([{ n: 0 }]);
    expect((await site.rows('SELECT count(*) AS n FROM move_in_archive_entries'))[0].n).toBe(42);
    const withdrawn = await (await site.call(`/api/audience/archives/${rerun.archive.id}/report`, { cookie })).text();
    expect(withdrawn).toContain('withdrawn by a contact deletion');
    expect(withdrawn).not.toContain('ada@example.test');
    await record('erasure-withdraws-custody.json', { receipt: receipt.state, chunksLeft: 0, entriesKept: 42 });

    // The same archive with its entries in the opposite order gives the same result on a fresh install.
    const reverse = await installation(edge, signer);
    try {
      const other = await reverse.open();
      const prior2 = await json(await reverse.call('/api/audience/import-preview', { method: 'POST', cookie: other, body: { files: [{ name: 'earlier.csv', preset: 'csv-unsubscribed', csv: 'Email Address\noptedout@example.test' }] } }), 200);
      let { job: job2 } = await json(await reverse.call('/api/audience/imports', { method: 'POST', cookie: other, body: { fingerprint: prior2.fingerprint } }), 200);
      while (['queued', 'applying'].includes(job2.state)) ({ job: job2 } = await json(await reverse.call(`/api/audience/imports/${job2.id}/resume`, { method: 'POST', cookie: other, body: {} }), 200));
      await importArchive(reverse, other, await accountExport('reverse'));
      const names = (installed: Installation) => installed.rows('SELECT email,email_status,display_name FROM contacts ORDER BY email');
      expect(await statuses(reverse)).toEqual(imported);
      expect((await content(reverse)).map(row => [row.kind, row.title, row.state])).toEqual(importedContent.map(row => [row.kind, row.title, row.state]));
      await record('two-orders.json', { forward: imported, reverse: await statuses(reverse), reverseNames: await names(reverse) });
    } finally { await reverse.runtime.close(); }
  } finally { await site.runtime.close(); await edge.close(); }
});

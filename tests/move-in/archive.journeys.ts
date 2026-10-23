import {incumbentJourney} from './incumbent-journey';
import {setArchiveAttestations} from './support';
import { openPage } from '../support/navigation';
import { createHash } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { providerEdge } from '../go-live/edge';
import { eventSigner } from '../go-live/sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve, dispatch, type Installation } from '../go-live/harness';
import { accountExport } from './archive';
import { archiveRecords } from '../portability/flows';
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

test('[MOVE-009][CONT-001][CONT-002][CONT-003][CONT-010][CAMP-002][CAMP-004][SEND-006][DATA-001] an account export moves in by status, keeps consent, carries no authority and undoes safely', async ({ page }, info) => {
  const edge = await providerEdge(), signer = eventSigner();
  await incumbentJourney(page,info,edge,signer);
  const calendarSite = await installation(edge, signer);
  try {
    const cookie = await calendarSite.open();
    const pad = (number: number) => String(number).padStart(2, '0');
    const invalid = [...new Set([
      ...['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].flatMap(day =>
        ['2026-02-30', '2024-02-29', '02/30/2026', '2025-04-31'].map(date => `${day} ${date} 10:00:00 GMT`)),
      ...[1900, 2023, 2025, 2026].flatMap(year => ['T10:00:00Z', 'T10:00:00.123+05:45', ' 10:00:00', ' 10:00:00 -0230'].map(time => `${year}-02-29${time}`)),
      ...[2024, 2025, 2026].flatMap(year => ['02-30', '04-31', '06-31', '09-31', '11-31'].map(date => `${year}-${date}T10:00:00Z`)),
      ...['Feb 29 2024', '29 Feb 2024', '2024 Feb 29', 'Feb 2024 29', '29 2024 Feb', '99-02-28', '0-02-29',
        '2024.02.29', '2024/02/29', '02/29/2024', '2024-2-29', '2024-02-003', '+002024-02-29'].map(date => `${date} 10:00:00 GMT`),
      ...['2024-02-29', '2024-02-29Z', '+002024-02-29T10:00:00Z', '2024-02-29T10:00:00',
        '2024-02-29t10:00:00Z', '2024-02-29T10:00:00z', '2024-02-29T10:00:00.1234Z',
        '2024-02-29 10:00:00Z', '2024-02-29 10:00:00.123', '2024-02-29T10:00:00+0545',
        '2024-02-29 10:00:00 +05:45', '2024-02-29T10:00Z', '2024-02-29T10:00:00.Z'],
      ...[' ', '\t', '\n', '\r', '\u00a0'].flatMap(space => [`${space}2024-02-29T10:00:00Z`, `2024-02-29T10:00:00Z${space}`, `2024-02-29${space}10:00:00Z`]),
      ...[' GMT', ' trailing', ' (UTC)', 'Z', ', ignored'].map(suffix => `2024-02-29T10:00:00Z${suffix}`),
      ...['00', '13', '99'].map(month => `2024-${month}-10T10:00:00Z`),
      ...['00', '30', '31', '99'].map(day => `2024-02-${day}T10:00:00Z`),
      ...['24:00:00', '25:00:00', '23:60:00', '23:59:60', '99:99:99'].flatMap(time => [`2024-02-29T${time}Z`, `2024-02-29 ${time}`]),
      ...['+', '-'].flatMap(sign => ['24:00', '02:60', '99:99'].flatMap(offset =>
        [`2024-02-29T10:00:00${sign}${offset}`, `2024-02-29 10:00:00 ${sign}${offset.replace(':', '')}`])),
    ])];
    const valid: string[][] = [];
    for (const [year, month, day] of [[2000, 2, 29], [2024, 2, 29], [2025, 4, 30]]) {
      const date = `${year}-${pad(month)}-${pad(day)}`;
      for (const [zone, minutes] of [['Z', 0], ['+05:45', 345], ['-02:30', -150]] as const) {
        for (const fraction of ['', '.1', '.12', '.123']) {
          const instant = Date.UTC(year, month - 1, day, 0, 15, 0, Number(fraction) * 1000) - minutes * 60_000;
          valid.push([`${date}T00:15:00${fraction}${zone}`, new Date(instant).toISOString()]);
        }
        const instant = Date.UTC(year, month - 1, day, 23, 30) - minutes * 60_000;
        valid.push([`${date} 23:30:00${zone === 'Z' ? '' : ' ' + zone.replace(':', '')}`, new Date(instant).toISOString()]);
      }
    }
    valid.push(['0000-02-29T00:00:00Z', '0000-02-29T00:00:00.000Z'], ['0099-01-01T00:00:00Z', '0099-01-01T00:00:00.000Z'],
      ['2024-03-01T00:00:00+23:59', '2024-02-29T00:01:00.000Z'], ['2024-02-29T23:59:59-23:59', '2024-03-01T23:58:59.000Z']);
    const csvField = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const bytes = await accountExport('path', (name, data) => name.includes('granular_activity')
      ? Buffer.from('campaign_id,email,action,timestamp\n' + [
        ...invalid.map(value => `c0spring1,ben@example.test,click,${csvField(value)}`),
        ...valid.map(([value]) => `c0spring1,ada@example.test,click,${csvField(value)}`),
      ].join('\n')) : data);
    const expected = {rows:invalid.length + valid.length, imported:valid.length, dropped:invalid.length, reasons:{'invalid-timestamp':invalid.length}};
    const before = await tableCounts(calendarSite);
    const preview = await postArchive(calendarSite, cookie, '/api/audience/archive-preview', bytes);
    expect(preview.status).toBe(200);
    expect(preview.body.summary.engagement).toEqual(expected);
    expect(await tableCounts(calendarSite)).toEqual(before);
    const moved = await importArchive(calendarSite, cookie, bytes);
    expect(moved.archive.summary.engagement).toEqual(expected);
    const stored = () => calendarSite.rows('SELECT c.email,f.occurred_at FROM imported_engagement_facts f JOIN contacts c ON c.id=f.contact_id ORDER BY f.source_row');
    const originals = valid.map(([, instant]) => ({email:'ada@example.test', occurred_at:Date.parse(instant)}));
    expect(await stored()).toEqual(originals);
    expect(await calendarSite.rows("SELECT h.has_history FROM move_in_contact_history h JOIN contacts c ON c.id=h.contact_id WHERE c.email='ben@example.test'")).toEqual([{has_history:0}]);
    for (const table of facts) expect(await calendarSite.count(table), table).toBe(0);
    const consent = await statuses(calendarSite);
    const repeatBefore = await tableCounts(calendarSite);
    const repeat = await postArchive(calendarSite, cookie, '/api/audience/archives', bytes, moved.preview.fingerprint);
    expect(repeat.status).toBe(200); expect(repeat.body.repeated).toBe(true);
    expect(await tableCounts(calendarSite)).toEqual(repeatBefore);
    await drive(calendarSite, cookie, moved.archive.id, 'undo');
    expect(await stored()).toEqual([]);
    expect(await calendarSite.count('move_in_contact_history')).toBe(0);
    const reapplied = await importArchive(calendarSite, cookie, bytes);
    expect(reapplied.preview.summary.engagement).toEqual(expected);
    expect(reapplied.archive.summary.engagement).toEqual(expected);
    expect(await stored()).toEqual(originals);
    expect(await statuses(calendarSite)).toEqual(consent);
    for (const table of facts) expect(await calendarSite.count(table), table).toBe(0);
    await record('calendar-validation.json', {invalid, valid, preview:preview.body.summary.engagement, applied:moved.archive.summary.engagement,
      reapplied:reapplied.archive.summary.engagement, stored:await stored(), repeated:repeat.body.repeated, undoFacts:0});
  } finally { await calendarSite.runtime.close(); }
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
    await openPage(page, `${site.runtime.url}/app/audience/import`);
    await screens(page,'empty-import',info);
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
    // The screen exposes six independent, initially unticked statements.
    await expect(page.getByRole('heading',{name:'Mailchimp-held consent'})).toBeVisible();
    for(const radio of await page.getByRole('radio',{name:'I attest',exact:true}).all()){await expect(radio).not.toBeChecked();await radio.check();}
    await page.getByLabel('Type the source name to confirm: Mango Garden Letter',{exact:true}).fill('Mango Garden Letter');
    await page.getByRole('button',{name:'Preview import'}).click();
    await expect(page.getByText('Attestation affirmed in the current preview.',{exact:false})).toBeVisible();
    await screens(page, 'preview', info);

    const reviewed = (await postArchive(site, cookie, '/api/audience/archive-preview', bytes)).body;
    const file = (name: string) => reviewed.summary.audience.find((item: { path: string }) => item.path.endsWith(name));
    expect(file('subscribed.csv')).toMatchObject({ rows: 8, created: 4, updated: 1, duplicatesWithin: 1, duplicatesAcross: 1, rejected: 1, unknownConsent: 0 });
    expect(file('unsubscribed.csv')).toMatchObject({ rows: 2, created: 2, updated: 0, duplicatesWithin: 0, duplicatesAcross: 0, rejected: 0 });
    expect(file('cleaned.csv')).toMatchObject({ rows: 1, created: 1, outcomes: { suppressed: 1 } });
    expect(file('transactional.csv')).toMatchObject({ rows: 1, created: 1, outcomes: { 'non-subscribed': 1 } });
    for (const item of reviewed.summary.audience) expect(item.rows).toBe(item.created + item.updated + item.duplicatesWithin + item.duplicatesAcross + item.rejected + item.skipped);
    expect(reviewed.summary.kept.map((kind: { kind: string; files: number }) => [kind.kind, kind.files])).toEqual([['appointments', 1], ['ecommerce', 2], ['events', 1], ['gallery', 2], ['reports', 2], ['sms', 1], ['unmatched-content', 1]]);
    await record('preview.json', reviewed);

    // Import through the page: contacts by status, imported history, a draft starter.
    await page.getByRole('button', { name: 'Import archive' }).click();
    await expect(page.getByText(/is imported/)).toBeVisible({ timeout: 300000 });
    await screens(page, 'imported', info);
    const archive = (await json(await site.call('/api/audience/archives', { cookie }), 200)).archives[0];
    expect(archive.state).toBe('applied');
    const [storedAttestations]=await site.rows(`SELECT attestations_json FROM move_in_archives WHERE id='${archive.id}'`);
    setArchiveAttestations(bytes,JSON.parse(storedAttestations.attestations_json));
    expect(archive.summary.engagement).toEqual({rows:5,imported:3,dropped:2,reasons:{'address-not-in-move-in':1,'invalid-timestamp':1}});
    const engagement=await site.rows('SELECT c.email,f.kind,f.occurred_at,f.source,f.source_row,f.link,h.title FROM imported_engagement_facts f JOIN contacts c ON c.id=f.contact_id JOIN move_in_content h ON h.id=f.history_id ORDER BY c.email');
    expect(engagement.map(row=>[row.email,row.kind,new Date(row.occurred_at).toISOString(),row.title])).toEqual([
      ['ada@example.test','click','2026-07-21T10:00:00.000Z','Spring letter'],['ben@example.test','click','2025-09-21T10:05:00.000Z','Winter letter'],['dup@example.test','open','2026-07-21T10:10:00.000Z','Spring letter']]);
    expect(engagement.map(row=>row.link)).toEqual(['https://garden.example.test/spring','https://garden.example.test/winter',null]);
    const imported = await statuses(site);
    expect(imported).toEqual({ 'ada@example.test': 'subscribed', 'ben@example.test': 'subscribed', 'both@example.test': 'unsubscribed', 'cleo@example.test': 'suppressed',
      'cy@example.test': 'subscribed', 'dup@example.test': 'subscribed', 'optedout@example.test': 'unsubscribed', 'tess@example.test': 'non-subscribed', 'uma@example.test': 'unsubscribed' });
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
    await openPage(page, `${site.runtime.url}/app/audience/import`);
    await page.getByRole('button', { name: 'Undo this import' }).click();
    await page.getByRole('button', { name: 'Confirm undo' }).click();
    await expect(page.getByText(/is undone/)).toBeVisible({ timeout: 300000 });
    await page.getByRole('button', { name: 'Show imported history and drafts' }).first().click();
    await screens(page, 'undo', info);
    const undone = (await json(await site.call(`/api/audience/archives/${archive.id}`, { cookie }), 200)).archive;
    expect(await site.count('imported_engagement_facts')).toBe(0);
    expect(await site.count('move_in_contact_history')).toBe(0);
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
    expect(rerun.archive.summary.engagement).toMatchObject({imported:3,dropped:2});
    expect(await site.count('imported_engagement_facts')).toBe(3);
    const rerunStatuses = await statuses(site);
    expect(rerunStatuses).toEqual({ ...imported, 'ben@example.test': 'unsubscribed', 'cy@example.test': 'pending' });
    expect(rerunStatuses['optedout@example.test']).toBe('unsubscribed');
    // Importing it twice in a row changes nothing.
    const beforeRepeat = await tableCounts(site);
    const repeat = await postArchive(site, cookie, '/api/audience/archives', bytes, rerun.preview.fingerprint);
    expect(repeat.body.repeated).toBe(true);
    expect(await tableCounts(site)).toEqual(beforeRepeat);
    await record('rerun.json', { rerunStatuses, repeated: repeat.body.repeated, archive: repeat.body.archive.id === rerun.archive.id });

    // An independent archive remains readable when the earlier source is withdrawn.
    const control = await importArchive(site, cookie, await accountExport('path', (_name, data) =>
      Buffer.from(data.toString().replaceAll('@example.test', '@control.example.test'))));
    const controlFacts = await site.rows(`SELECT * FROM imported_engagement_facts WHERE archive_id='${control.archive.id}' ORDER BY id`);
    expect(controlFacts).toHaveLength(3);
    const admin = await site.open('archive-admin@example.test', 'archive-admin');
    await json(await site.call('/api/operators/archive-admin/role', { method: 'PUT', cookie, body: { role: 'admin' } }), 200);
    const denied = await site.open('archive-support@example.test', 'archive-support');
    await json(await site.call('/api/operators/archive-support/role', { method: 'PUT', cookie, body: { role: 'support' } }), 200);
    const authority = async () => {
      const results = [];
      for (const path of ['/api/audience/archives', `/api/audience/archives/${rerun.archive.id}`, `/api/audience/archives/${control.archive.id}`]) {
        for (const [role, session, status] of [['support', denied, 403], ['signed-out', undefined, 401]] as const) {
          const response = await site.call(path, { cookie: session });
          const body = await response.json();
          expect(response.status).toBe(status);
          if (role === 'support') expect(body.error).toBe('role_forbidden');
          results.push({ path, role, status: response.status, error: body.error });
        }
      }
      return results;
    };
    const authorityBefore = await authority();
    const portableSite = { call: (path: string, init: Parameters<typeof site.call>[1]) => site.call(path, { ...init, headers: { Origin: site.runtime.url } }) };
    const oldExport = await archiveRecords(portableSite, cookie);
    expect(JSON.stringify(oldExport)).toContain('ada@example.test');
    const [{id: oldDownload}] = await site.rows("SELECT id FROM rer_portability_jobs WHERE kind='export'");

    // Deleting a contact the archive brought in withdraws every original archive that holds them.
    const ada = (await site.rows("SELECT id FROM contacts WHERE email='ada@example.test'"))[0].id;
    expect(await site.rows(`SELECT count(*) AS n FROM imported_engagement_facts WHERE contact_id='${ada}'`)).toEqual([{n:1}]);
    let { receipt } = await json(await site.call(`/api/contacts/${ada}`, { method: 'DELETE', cookie }), 202);
    while (receipt.state === 'pending') ({ receipt } = await (await site.call(`/api/audience/erasures/${receipt.reference}/resume`, { method: 'POST', cookie })).json());
    expect(receipt.state).toBe('complete');
    expect(await site.rows(`SELECT * FROM imported_engagement_facts WHERE contact_id='${ada}'`)).toEqual([]);
    expect(await site.rows(`SELECT count(*) AS n FROM imported_engagement_facts WHERE archive_id<>'${control.archive.id}'`)).toEqual([{ n: 2 }]);
    expect(await site.rows(`SELECT * FROM imported_engagement_facts WHERE archive_id='${control.archive.id}' ORDER BY id`)).toEqual(controlFacts);
    expect(await site.rows(`SELECT count(*) AS n FROM move_in_archive_chunks WHERE archive_id<>'${control.archive.id}'`)).toEqual([{ n: 0 }]);
    expect((await site.rows(`SELECT count(*) AS n FROM move_in_archive_entries WHERE archive_id<>'${control.archive.id}'`))[0].n).toBe(42);
    const withdrawn = await (await site.call(`/api/audience/archives/${rerun.archive.id}/report`, { cookie })).text();
    expect(withdrawn).toContain('withdrawn by a contact deletion');
    expect(withdrawn).not.toContain('ada@example.test');
    await page.setContent(`<pre style="font:13px/1.4 monospace;white-space:pre-wrap;padding:16px">${withdrawn.replaceAll('&','&amp;').replaceAll('<','&lt;')}</pre>`);await screens(page,'withdrawn-report',info);
    const reads = [];
    for (const [role, session] of [['owner', cookie], ['admin', admin]]) {
      const list = await site.call('/api/audience/archives', { cookie: session });
      const detail = await site.call(`/api/audience/archives/${rerun.archive.id}`, { cookie: session });
      const listBody = list.status === 200 ? await list.json() : { error: await list.text() };
      const detailBody = detail.status === 404 ? await detail.json() : { error: await detail.text() };
      reads.push({ role, list: { status: list.status, body: listBody }, detail: { status: detail.status, body: detailBody } });
    }
    await record('withdrawn-archive-reads.json', reads);
    for (const { list, detail } of reads) {
      expect(list.status).toBe(200);
      expect(list.body.archives.map((archive: any) => archive.id)).toEqual([control.archive.id]);
      expect(detail.status).toBe(404); expect(detail.body).toEqual({ error: 'not_found' });
      expect(JSON.stringify(list.body)).not.toContain('ada@example.test');
    }
    for (const session of [cookie, admin]) {
      const surviving = await json(await site.call(`/api/audience/archives/${control.archive.id}`, { cookie: session }), 200);
      expect(surviving.archive.id).toBe(control.archive.id);
      expect(JSON.stringify(surviving)).not.toContain('ada@example.test');
    }
    await openPage(page, `${site.runtime.url}/app/audience/import`);
    await expect(page.getByRole('link', { name: 'Download reconciliation report' })).toHaveCount(1);
    await screens(page, 'surviving-archive-after-erasure', info);
    expect(await authority()).toEqual(authorityBefore);
    expect((await site.call(`/api/contacts/${ada}`, { cookie })).status).toBe(404);
    expect((await site.call(`/api/portability/exports/${oldDownload}/download`, { cookie })).status).toBe(404);
    const fresh = await archiveRecords(portableSite, cookie);
    expect(JSON.stringify(fresh)).not.toContain('ada@example.test');
    const freshFacts = fresh.filter((row: any) => row.kind === 'part').flatMap((part: any) => part.items)
      .filter((row: any) => row.kind === 'row' && row.table === 'imported_engagement_facts');
    expect(freshFacts.filter((item: any) => item.row.contact_id === ada)).toEqual([]);
    expect(freshFacts.filter((item: any) => item.row.archive_id === control.archive.id)).toHaveLength(controlFacts.length);
    await record('erasure-withdraws-custody.json', { receipt: receipt.state, chunksLeft: 0, entriesKept: 42, authorityBefore, authorityAfter: await authority(), controlFacts: controlFacts.length });

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

test('[CONT-012][AUD-008][MOVE-009] imported engagement governs review and immutable dispatch policy without changing consent',async({page},info)=>{
  const edge=await providerEdge(),site=await installation(edge,eventSigner());
  try {
    const cookie=await site.open(),clock=await site.control('/_golive/clock',{hold:true});
    const ago=(months:number)=>{const date=new Date(clock.now);date.setUTCMonth(date.getUTCMonth()-months);return date.toISOString();};
    const emails=['ada@example.test','ben@example.test','dup@example.test','no-history@example.test'];
    const bytes=await accountExport('path',(name,data)=>{
      if(name.endsWith('/subscribed.csv')&&name.startsWith('audiences/'))return Buffer.from('Email Address,First Name,OPTIN_TIME,CONFIRM_TIME\n'+emails.map(email=>`${email},${email.split('@')[0]},${ago(24)},${ago(24)}`).join('\n'));
      if(name.startsWith('audiences/'))return Buffer.from('Email Address\n');
      if(name.includes('granular_activity'))return Buffer.from(`campaign_id,email,action,timestamp\nc0spring1,ada@example.test,click,${ago(3)}\nc0winter2,ben@example.test,click,${ago(13)}\nc0spring1,dup@example.test,open,${ago(3)}\nc0spring1,unknown@example.test,click,${ago(3)}\nc0spring1,ada@example.test,click,invalid\nc0winter2,ben@example.test,click,${new Date(clock.now).getUTCFullYear()}-02-30T10:00:00Z\nc0spring1,no-history@example.test,click,${new Date(clock.now).getUTCFullYear()}-02-30T10:00:00Z\n`);
      return data;
    });
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    // Preserve a nonempty native campaign result, not just empty legacy tables.
    await site.control('/_golive/clock',{hold:false});
    await confirmedContact(site,edge,cookie,'native@example.test','Native subscriber');
    const nativeClock=await site.control('/_golive/clock');
    const nativeCampaign=await draftCampaign(site,cookie,'Existing native results',['native@example.test'],new Date(nativeClock.now+2000));
    await approve(site,cookie,nativeCampaign);
    expect((await dispatch(site,nativeCampaign.campaignId,new Date(nativeClock.now+2000))).map(row=>row.transport_disposition)).toEqual(['accepted']);
    await site.control('/_golive/clock',{hold:true});
    const nativeResults=()=>site.call(`/api/campaigns/${nativeCampaign.campaignId}/results`,{cookie}).then(r=>json(r,200));
    const resultBefore=await nativeResults();
    expect(await site.rows(`SELECT count(*) n FROM recipient_steps WHERE campaign_id='${nativeCampaign.campaignId}' AND transport_disposition='accepted'`)).toEqual([{n:1}]);
    const before=await site.rows('SELECT * FROM campaign_results');
    const moved=await importArchive(site,cookie,bytes);
    expect(moved.archive.summary.engagement).toEqual({rows:7,imported:3,dropped:4,reasons:{'address-not-in-move-in':1,'invalid-timestamp':3}});
    expect(JSON.stringify(await site.rows('SELECT * FROM campaign_results'))).toBe(JSON.stringify(before));
    expect(JSON.stringify(await nativeResults())).toBe(JSON.stringify(resultBefore));
    const campaign=await draftCampaign(site,cookie,'Imported garden engagement',emails,new Date(clock.now+3600000));
    const checks=()=>site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}).then(r=>json(r,200));
    expect(await checks()).toMatchObject({candidateCount:4,eligibleCount:2,noHistoryCount:1,openOnlyCount:1,exclusions:[{reason:'dormant',count:2}]});
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    await expect(page.locator('.audience-snapshot')).toContainText('No-history among included contacts: 1');
    await expect(page.locator('.audience-snapshot')).toContainText('Open-only: 1');
    await screens(page,'imported-dormancy-review',info);
    await page.getByRole('button',{name:'Include open-only contacts',exact:true}).click();
    await expect(page.getByRole('button',{name:'Open-only contacts included'})).toBeDisabled();
    await expect(page.getByLabel('Exclude dormant contacts',{exact:true})).toBeEnabled();
    expect(await checks()).toMatchObject({eligibleCount:3,dormancyIncludedCount:1,noHistoryCount:1,openOnlyCount:0,exclusions:[{reason:'dormant',count:1}]});
    await page.getByLabel('Exclude dormant contacts',{exact:true}).uncheck();
    await expect(page.getByLabel('Exclude dormant contacts',{exact:true})).toBeEnabled();
    expect((await checks()).eligibleCount).toBe(4);
    expect(await checks()).toMatchObject({dormancyIncludedCount:2});
    await expect(page.getByLabel('Exclude dormant contacts',{exact:true})).not.toBeChecked();
    const nativeBefore=await statuses(site);
    await screens(page,'imported-dormancy-included',info);
    for(const email of emails){
      const [{id}]=await site.rows(`SELECT id FROM contacts WHERE email='${email}'`);
      const detail=await json(await site.call(`/api/contacts/${id}`,{cookie}),200);
      expect(detail.timeline.filter((row:any)=>row.kind.startsWith('imported-'))).toHaveLength(email==='no-history@example.test'?0:1);
      if(email==='ada@example.test'){
        expect(detail.timeline.find((row:any)=>row.kind==='imported-click')).toMatchObject({source:expect.stringContaining('Imported'),occurredAt:ago(3)});
        await openPage(page,`${site.runtime.url}/app/audience/${id}`);await expect(page.getByText(/Imported · reports/)).toBeVisible();await screens(page,'imported-contact-timeline',info);
      }
      if(email==='no-history@example.test'){await openPage(page,`${site.runtime.url}/app/audience/${id}`);await screens(page,'no-imported-history-timeline',info);}
    }
    // Settings reuse the app's ordinary checkbox, numeric input and save action.
    await openPage(page,`${site.runtime.url}/app/settings`);
    await page.getByLabel('Exclude dormant contacts by default').uncheck();
    await page.getByRole('button',{name:'Save inactivity default'}).click();
    await expect.poll(async()=> (await json(await site.call('/api/settings/audience-exclusions',{cookie}),200)).policy.enabled).toBe(false);
    await screens(page,'inactivity-default',info);
    const invalidDefault=await site.call('/api/settings/audience-exclusions',{method:'PUT',cookie,body:{policy:{enabled:true,windowDays:0}}});expect(invalidDefault.status).toBe(400);
    const blank=await json(await site.call('/api/campaigns',{method:'POST',cookie,body:{mode:'blank'}}),201);
    await openPage(page,`${site.runtime.url}/app/campaigns/${blank.campaignId}/review`);await expect(page.getByText('No saved audience snapshot')).toBeVisible();await screens(page,'empty-audience-review',info);
    await openPage(page,`${site.runtime.url}/app/audience/missing-contact`);await expect(page.getByRole('alert')).toBeVisible();await screens(page,'missing-contact-failure',info);
    const next=await draftCampaign(site,cookie,'Default policy copy',emails,new Date(clock.now+7200000));
    const nextDetail=await json(await site.call(`/api/campaigns/${next.campaignId}`,{cookie}),200);
    expect(JSON.parse(nextDetail.revision.dormancyPolicyJson).enabled).toBe(false);
    expect(await statuses(site)).toEqual(nativeBefore);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    await approve(site,cookie,campaign);
    await page.getByLabel('Exclude dormant contacts',{exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('could not be saved');await screens(page,'locked-policy-refused',info);
    expect((await site.call(`/api/campaigns/${campaign.campaignId}/dormancy`,{method:'PUT',cookie,body:{revisionId:campaign.revisionId,policy:{enabled:true,windowDays:365,includeOpenOnly:false}}})).status).toBe(409);
    // Changing the installation default cannot rewrite the approved revision.
    await json(await site.call('/api/settings/audience-exclusions',{method:'PUT',cookie,body:{policy:{enabled:true,windowDays:30}}}),200);
    const activity=await json(await site.call('/api/activity',{cookie}),200);
    expect(JSON.stringify(activity)).toContain('audience.default-changed');expect(JSON.stringify(activity)).toContain('audience.dormancy-changed');
    const approved=await site.rows(`SELECT detail_json,actor_id FROM lifecycle_audit_entries WHERE action='approved' AND entity_id='${campaign.revisionId}'`);
    expect(JSON.parse(approved[0].detail_json).dormancyPolicy.enabled).toBe(false);
    expect(approved[0].actor_id).toBe('go-live-owner');
    await site.control('/_golive/clock',{advanceMs:3600001,hold:false});
    await dispatch(site,campaign.campaignId,new Date(clock.now+3600000));
    expect(await site.rows(`SELECT transport_disposition FROM recipient_steps WHERE campaign_id='${campaign.campaignId}'`)).toEqual(Array.from({length:4},()=>({transport_disposition:'accepted'})));
    expect(await statuses(site)).toEqual(nativeBefore);
    // A full elapsed window ends the no-history grace; the native AUD-003 journey is unchanged.
    await site.control('/_golive/clock',{advanceMs:366*86400000});
    const laterCookie=await site.open();
    const later=await draftCampaign(site,laterCookie,'After no-history grace',['no-history@example.test'],new Date(clock.now+367*86400000));
    const late=await json(await site.call(`/api/campaigns/${later.campaignId}/checks`,{method:'POST',cookie:laterCookie,body:{revisionId:later.revisionId}}),200);
    expect(late).toMatchObject({eligibleCount:0,noHistoryCount:0,exclusions:expect.arrayContaining([{reason:'dormant',count:1}])});
    const ada=(await site.rows("SELECT id FROM contacts WHERE email='ada@example.test'"))[0].id,ben=(await site.rows("SELECT id FROM contacts WHERE email='ben@example.test'"))[0].id;
    await json(await site.call('/api/contacts/merge',{method:'POST',cookie:laterCookie,body:{survivorContactId:ada,mergedContactId:ben}}),200);
    expect(await site.rows(`SELECT count(*) AS n FROM imported_engagement_facts WHERE contact_id='${ada}'`)).toEqual([{n:2}]);
    expect(await site.rows(`SELECT has_history FROM move_in_contact_history WHERE contact_id='${ada}'`)).toEqual([{has_history:1}]);
    expect(await site.rows(`SELECT * FROM imported_engagement_facts WHERE contact_id='${ben}'`)).toEqual([]);
    await record('imported-dormancy-counts.json',{initial:{candidates:4,included:2,noHistory:1,dormant:2,openOnly:1},includeOpenOnly:3,dormancyOff:4,afterGrace:0});
  }finally{await page.close();await site.runtime.close();await edge.close();}
});

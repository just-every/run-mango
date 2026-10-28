import {installation} from './support';
import { expect, test } from '@playwright/test';
import { providerEdge } from '../go-live/edge';
import { eventSigner } from '../go-live/sendgrid-events';
import { approve, confirmedContact, dispatch, draftCampaign, json, sender, type Installation } from '../go-live/harness';
import { zip } from './archive';
import { consentEvidence, drive, importArchive, postArchive, record } from './support';

// Data import is high-stakes: an export's unsubscribe or cleaned status reaches a contact an
// earlier import still holds (changed since, or kept by an undo), the person's own edits stay,
// and no letter reaches them.
const header = 'Email Address,First Name,Last Name,OPTIN_TIME,OPTIN_IP,CONFIRM_TIME,CONFIRM_IP';
const row = (email: string, first: string) => `${email},${first},Person,2026-02-01 09:00:00,192.0.2.21,2026-02-01 09:05:00,192.0.2.21`;
const archive = (files: Record<string, string[]>) => zip(Object.entries(files).map(([name, rows]) => ({ name: `audiences/Garden/${name}`, data: [header, ...rows].join('\n') + '\n' })));
const contact = async (site: Installation, email: string) => (await site.rows(`SELECT c.display_name AS name, c.email_status AS contact, a.channel_status AS address
  FROM contacts c JOIN contact_email_addresses a ON a.contact_id=c.id WHERE c.email='${email}'`))[0];
/** Import contacts as the Import page does: Preview, Apply, then resume until the job settles. */
async function csvImport(site: Installation, cookie: string, files: Array<{ name: string; preset: string; csv: string }>, consent?: object) {
  const preview = await json(await site.call('/api/audience/import-preview', { method: 'POST', cookie, body: { files, consent } }), 200);
  const applied = await site.call('/api/audience/imports', { method: 'POST', cookie, body: { fingerprint: preview.fingerprint } });
  let body = await applied.json();
  expect(applied.status, JSON.stringify(body)).toBe(200);
  while (['queued', 'applying'].includes(body.job.state)) body = await json(await site.call(`/api/audience/imports/${body.job.id}/resume`, { method: 'POST', cookie, body: {} }), 200);
  return { preview, job: body.job };
}
/** Undo an import as the Import page does, until the job settles. */
async function undoImport(site: Installation, cookie: string, id: string) {
  let { job } = await json(await site.call(`/api/audience/imports/${id}/undo`, { method: 'POST', cookie, body: {} }), 200);
  while (job.state === 'undoing') ({ job } = await json(await site.call(`/api/audience/imports/${id}/undo`, { method: 'POST', cookie, body: {} }), 200));
  return job;
}
const restrictions = async (site: Installation) => (await site.rows(`SELECT (SELECT json_group_array(id) FROM (SELECT id FROM surviving_opt_outs ORDER BY id)) AS optOuts,
  (SELECT json_group_array(id) FROM (SELECT id FROM contact_suppressions ORDER BY id)) AS suppressions`))[0];
/** Send a letter to everyone named and return who has a recipient step and who was sent it. */
async function letter(site: Installation, edge: Awaited<ReturnType<typeof providerEdge>>, cookie: string, subject: string, emails: string[]) {
  const due = new Date(Date.now() + 20_000);
  const campaign = await draftCampaign(site, cookie, subject, emails, due);
  expect((await approve(site, cookie, campaign)).status).toBe('scheduled');
  const steps = await dispatch(site, campaign.campaignId, due);
  return { steps: steps.map(step => String(step.email)).sort(), sends: edge.sends.filter(send => send.body.subject?.startsWith(subject)).map(send => send.to).sort() };
}
const optIn = (email: string, first: string) => `${email},${first},2026-02-01 09:00:00,2026-02-01 09:05:00`;









export const walk0 = async () => {
  const edge = await providerEdge(), signer = eventSigner();
  const site = await installation(edge, signer);
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', { method: 'PUT', cookie, body: sender }), 200);
    await site.control('/_golive/sender-evidence');
    const [held, kept, ada] = ['held@example.test', 'kept@example.test', 'ada@example.test'];
    // held comes from an earlier CSV import and is then confirmed and renamed in Mango.
    const earlier = await json(await site.call('/api/audience/import-preview', { method: 'POST', cookie, body: { files: [{ name: 'earlier.csv', preset: 'csv-non-subscribed', csv: `Email Address\n${held}` }] } }), 200);
    let { job } = await json(await site.call('/api/audience/imports', { method: 'POST', cookie, body: { fingerprint: earlier.fingerprint } }), 200);
    while (['queued', 'applying'].includes(job.state)) ({ job } = await json(await site.call(`/api/audience/imports/${job.id}/resume`, { method: 'POST', cookie, body: {} }), 200));
    await confirmedContact(site, edge, cookie, held, 'Held Gardener');
    await confirmedContact(site, edge, cookie, ada, 'Ada Grower');
    const heldBefore = await contact(site, held);
    expect(heldBefore.contact).toBe('subscribed');

    // The first export lists held as unsubscribed: Preview counts it as updated, not skipped.
    // ada, entered in Mango, is in the first export under another name.
    const first = archive({ 'unsubscribed.csv': [row(held, 'Held')], 'transactional.csv': [row(kept, 'Kept')], 'subscribed.csv': [row(ada, 'Ada')] });
    const preview = await postArchive(site, cookie, '/api/audience/archive-preview', first);
    const unsubscribed = preview.body.summary.audience.find((file: { path: string }) => file.path.endsWith('unsubscribed.csv'));
    expect(unsubscribed).toMatchObject({ rows: 1, updated: 1, skipped: 0, outcomes: { unsubscribed: 1 } });
    const firstImport = await importArchive(site, cookie, first);
    expect(firstImport.archive.state).toBe('applied');
    expect(await contact(site, held)).toEqual({ name: heldBefore.name, contact: 'unsubscribed', address: 'unsubscribed' });
    const adaBefore = { name: 'Ada Grower', contact: 'subscribed', address: 'subscribed' };
    expect(await contact(site, ada)).toEqual(adaBefore);
    const adaObservations = await site.rows(`SELECT o.source_display_name AS name FROM audience_import_observations o JOIN contacts c ON c.id=o.contact_id WHERE c.email='${ada}'`);
    expect(adaObservations).toEqual([{ name: 'Ada Person' }]);

    // kept is confirmed and renamed after the first import, so undoing that import keeps it.
    await confirmedContact(site, edge, cookie, kept, 'Kept Gardener');
    const undone = (await drive(site, cookie, firstImport.archive.id, 'undo')).archive;
    expect(undone.state).toBe('undone');
    const keptBefore = await contact(site, kept);
    expect(keptBefore.contact).toBe('subscribed');
    expect((await contact(site, held)).contact).toBe('unsubscribed');
    expect(await contact(site, ada)).toEqual(adaBefore);

    // The second export lists kept as cleaned: it is suppressed, with its name left as it is.
    const second = await importArchive(site, cookie, archive({ 'cleaned.csv': [row(kept, 'Kept')] }));
    expect(second.preview.summary.audience[0]).toMatchObject({ rows: 1, updated: 1, skipped: 0, outcomes: { suppressed: 1 } });
    expect(await contact(site, kept)).toEqual({ name: keptBefore.name, contact: 'suppressed', address: 'suppressed' });
    const blocks = await site.rows(`SELECT (SELECT count(*) FROM surviving_opt_outs) AS optOuts, (SELECT count(*) FROM contact_suppressions) AS suppressions`);
    expect(blocks).toEqual([{ optOuts: 2, suppressions: 1 }]);

    // The next letter goes to everyone named; only ada receives it.
    const due = new Date(Date.now() + 20_000);
    const letter = await draftCampaign(site, cookie, 'October letter', [ada, held, kept], due);
    expect((await approve(site, cookie, letter)).status).toBe('scheduled');
    const steps = await dispatch(site, letter.campaignId, due);
    const sends = edge.sends.filter(send => send.body.subject?.startsWith('October letter')).map(send => send.to);
    expect(sends).toEqual([ada]);
    expect(steps.filter(step => [held, kept].includes(String(step.email)) && step.transport_disposition === 'accepted')).toEqual([]);
    await record('held-contacts.json', { heldBefore, held: await contact(site, held), keptBefore, kept: await contact(site, kept), unsubscribed, cleaned: second.preview.summary.audience[0], blocks, steps, sends });
  } finally { await site.runtime.close(); await edge.close(); }
};
export const walk1 = async () => {
  const edge = await providerEdge(), signer = eventSigner();
  const site = await installation(edge, signer);
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', { method: 'PUT', cookie, body: sender }), 200);
    await site.control('/_golive/sender-evidence');
    const [changed, other, undone, fresh, ada] = ['changed@example.test', 'other@example.test', 'undone@example.test', 'fresh@example.test', 'ada@example.test'];
    // changed and other come from an earlier CSV import; undone from an archive that is undone
    // after undone was confirmed, so the undo keeps it. All three are confirmed and renamed in Mango.
    await csvImport(site, cookie, [{ name: 'earlier.csv', preset: 'csv-non-subscribed', csv: `Email Address\n${changed}\n${other}` }]);
    const moved = await importArchive(site, cookie, archive({ 'transactional.csv': [row(undone, 'Undone')] }));
    for (const [email, name] of [[changed, 'Changed Gardener'], [other, 'Other Gardener'], [undone, 'Undone Gardener'], [ada, 'Ada Grower']]) await confirmedContact(site, edge, cookie, email, name);
    expect((await drive(site, cookie, moved.archive.id, 'undo')).archive.state).toBe('undone');
    const before = { changed: await contact(site, changed), other: await contact(site, other), undone: await contact(site, undone) };
    for (const value of Object.values(before)) expect(value.contact).toBe('subscribed');

    // Import contacts: an unsubscribe list and a cleaned list name held contacts; a subscribed list names one too.
    const { preview, job } = await csvImport(site, cookie, [
      { name: 'unsubscribed.csv', preset: 'csv-unsubscribed', csv: `Email Address,First Name\n${changed},Changed\n${fresh},Fresh` },
      { name: 'cleaned.csv', preset: 'csv-cleaned', csv: `Email Address,First Name\n${undone},Undone` },
      { name: 'subscribed.csv', preset: 'csv-subscribed', csv: `Email Address,First Name\n${other},Other` },
    ]);
    const rows = Object.fromEntries(preview.rows.map((item: { email: string }) => [item.email, item]));
    expect(rows[changed]).toMatchObject({ status: 'unsubscribed', held: { contactId: expect.any(String) } });
    expect(rows[undone]).toMatchObject({ status: 'suppressed', held: { contactId: expect.any(String) } });
    expect(rows[other].skipped).toBeTruthy();
    expect(rows[other].warnings).toContain(rows[other].skipped);
    expect(preview.counts).toMatchObject({ created: 1, updated: 2, unsubscribed: 2, suppressed: 1 });
    expect(job.state).toBe('completed');

    // Apply did what Preview counted: two opt-outs, one suppression, one new contact; names and the skipped contact stay.
    const after = { changed: await contact(site, changed), other: await contact(site, other), undone: await contact(site, undone), fresh: await contact(site, fresh) };
    expect(after).toEqual({ changed: { ...before.changed, contact: 'unsubscribed', address: 'unsubscribed' }, other: before.other,
      undone: { ...before.undone, contact: 'suppressed', address: 'suppressed' }, fresh: { name: 'Fresh', contact: 'unsubscribed', address: 'unsubscribed' } });

    // The next letter goes to everyone named; only ada and other receive it, and no one opted out has a recipient step.
    const due = new Date(Date.now() + 20_000);
    const letter = await draftCampaign(site, cookie, 'November letter', [ada, changed, other, undone, fresh], due);
    expect((await approve(site, cookie, letter)).status).toBe('scheduled');
    const steps = await dispatch(site, letter.campaignId, due);
    const sends = edge.sends.filter(send => send.body.subject?.startsWith('November letter')).map(send => send.to).sort();
    expect(sends).toEqual([ada, other]);
    expect(steps.map(step => step.email)).toEqual([ada, other]);
    await record('held-csv.json', { before, preview: { counts: preview.counts, rows: [rows[changed], rows[undone], rows[other], rows[fresh]] }, job: job.state, after, steps, sends });
  } finally { await site.runtime.close(); await edge.close(); }
};

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { json, draftCampaign, approve, confirmedContact, type Installation } from './harness';
import type { providerEdge } from './edge';
import { openPage } from '../support/navigation';

type Entry = {id: string; operatorId: string; operatorName: string | null; actorType: string; action: string; objectType: string; objectId: string; detail: any; occurredAt: number};
const hour = 3_600_000;

/** OPER-007: one of each action the product performs, then every filter, the CSV, the roles and the screen. */
export async function activityJourney(site: Installation, edge: Awaited<ReturnType<typeof providerEdge>>, owner: string, page: Page, info: TestInfo, known: {sent: {campaignId: string; revisionId: string}}) {
  const post = (path: string, cookie: string, body: unknown = {}, method = 'POST') => site.call(path, {method, cookie, body});
  const list = async (query = '', cookie = owner) => (await json(await site.call(`/api/activity?limit=200${query}`, {cookie}), 200)).entries as Entry[];
  const admin = await site.open('admin@example.test', 'act-admin'), author = await site.open('author@example.test', 'act-author');
  for (const [id, role] of [['act-admin', 'admin'], ['act-author', 'author']]) await json(await post(`/api/operators/${id}/role`, owner, {role}, 'PUT'), 200);
  // A name that a spreadsheet would read as a formula, to prove the export neutralises it.
  await site.runtime.sql("UPDATE oa_operators SET display_name='=SUM(1+1)' WHERE id='act-admin' RETURNING id");

  expect((await site.call('/api/audience/export', {cookie: owner})).status).toBe(200);
  await confirmedContact(site, edge, owner, 'hand-entry@example.test', 'Hand Entry');
  const handContact = (await site.rows("SELECT id FROM contacts WHERE email='hand-entry@example.test'"))[0].id as string;
  const extra = await draftCampaign(site, admin, 'Activity campaign', ['hand-entry@example.test'], new Date((await site.control('/_golive/clock')).now + 3 * hour));
  await json(await post(`/api/campaigns/${extra.campaignId}/request-approval`, admin, {revisionId: extra.revisionId}), 200);
  await approve(site, admin, extra);
  await json(await post(`/api/campaigns/${extra.campaignId}/pause`, owner), 200);
  await json(await post(`/api/campaigns/${extra.campaignId}/resume`, owner), 200);
  await json(await post(`/api/campaigns/${extra.campaignId}/cancel`, admin), 200);

  const preview = await json(await post('/api/audience/import-preview', owner, {files: [{name: 'people.csv', preset: 'csv-non-subscribed', csv: 'Email Address\nimported@example.test'}]}), 200);
  let {job} = await json(await post('/api/audience/imports', owner, {fingerprint: preview.fingerprint}), 200);
  for (let step = 0; ['queued', 'applying'].includes(job.state) && step < 10; step++) ({job} = await json(await post(`/api/audience/imports/${job.id}/resume`, owner), 200));
  await json(await post(`/api/contacts/${handContact}/opt-out`, owner, {channel: 'email'}), 200);
  const exported = await json(await site.call('/api/portability/exports', {method: 'POST', cookie: owner, body: {}, headers: {Origin: site.runtime.url}}), 201);
  // Public signup refusals are counted by hour and form, never by address, and summarised once the hour closes.
  const network = {'CF-Connecting-IP': '192.0.2.77', 'Content-Type': 'application/json'};
  const statuses: number[] = [];
  for (let attempt = 0; attempt < 8; attempt++) statuses.push((await site.call('/subscribe', {method: 'POST', headers: network, body: {website: 'bot'}})).status);
  expect(statuses.filter(status => status === 429).length).toBeGreaterThan(0);
  const settings = await json(await site.call('/api/audience/signup', {cookie: owner}), 200);
  await json(await post('/api/audience/signup', owner, {frequencyDisclosure: 'Twice a month, on Fridays', embedOrigins: [], kioskEnabled: true, kioskDeviceLabel: 'Market stall tablet'}, 'PUT'), 200);
  expect(settings.frequencyDisclosure).not.toBe('Twice a month, on Fridays');
  await site.control('/_golive/clock', {advanceMs: 2 * hour});
  await site.control('/_golive/cron');
  // The erased contact leaves anonymised entries behind (CONT-013), and the erasure itself is recorded once.
  let erasure = await site.call(`/api/contacts/${handContact}`, {method: 'DELETE', cookie: owner}), receipt = await erasure.json();
  for (let step = 0; erasure.status === 202 && step < 400; step++) {
    erasure = await post(`/api/audience/erasures/${receipt.receipt.reference}/resume`, owner);
    receipt = await erasure.json();
  }
  expect(erasure.status, JSON.stringify(receipt)).toBe(200);

  const all = await list();
  const once = (action: string, objectId?: string) => {
    const found = all.filter(entry => entry.action === action && (objectId === undefined || entry.objectId === objectId));
    expect(found, `${action} ${objectId ?? ''}`).toHaveLength(1);
    expect(found[0].occurredAt).toBeGreaterThan(0);
    expect(found[0].operatorId).toBeTruthy();
    return found[0];
  };
  expect(once('draft.saved', known.sent.revisionId).operatorId).toBe('go-live-owner');
  expect(once('draft.saved', extra.revisionId).operatorName).toBe('=SUM(1+1)');
  once('campaign.approval-requested', extra.revisionId);
  once('approved', extra.revisionId);
  once('cancelled', extra.campaignId);
  once('paused', extra.campaignId);
  once('resumed', extra.campaignId);
  once('import.applied', job.id);
  once('audience.exported');
  once('consent.entered');
  once('contact.opt-out-recorded');
  once('signup.settings.changed');
  once('signup.kiosk.changed');
  once('account.export-started', exported.id);
  once('operator.role-changed', 'act-admin');
  once('operator.role-changed', 'act-author');
  const refusals = once('signup.refusals-summarised');
  expect(refusals.actorType).toBe('system');
  expect(refusals.detail.byForm.hosted['network-rate-limit']).toBe(statuses.filter(status => status === 429).length);
  expect(JSON.stringify(refusals.detail)).not.toContain('@');
  expect(all.some(entry => entry.action.startsWith('integration.') && entry.objectType === 'integration')).toBe(true);
  once('contact.erasure-started');
  expect(JSON.stringify(all)).not.toContain(handContact);
  expect(JSON.stringify(all)).not.toContain('hand-entry@example.test');
  expect(all.map(entry => entry.occurredAt)).toEqual([...all.map(entry => entry.occurredAt)].sort((a, b) => b - a));

  // Every dimension filters the same log; the agent filter is empty until agents exist (AGENT-010).
  const byOperator = await list('&operator=act-admin');
  expect(byOperator.length).toBeGreaterThan(3);
  expect(byOperator.every(entry => entry.operatorId === 'act-admin')).toBe(true);
  expect(await list('&agent=nobody')).toEqual([]);
  expect((await list('&action=cancelled')).map(entry => entry.objectId)).toEqual([extra.campaignId]);
  expect((await list(`&object=${extra.revisionId}`)).map(entry => entry.action).sort()).toEqual(['approved', 'campaign.approval-requested', 'draft.saved']);
  const approvedAt = once('approved', extra.revisionId).occurredAt;
  expect((await list(`&action=approved&from=${new Date(approvedAt - 1).toISOString()}&to=${new Date(approvedAt + 1).toISOString()}`)).map(entry => entry.objectId)).toEqual([extra.revisionId]);
  expect(await list(`&action=approved&to=${new Date(approvedAt - 1).toISOString()}`)).not.toContainEqual(expect.objectContaining({objectId: extra.revisionId}));
  expect(await list('&from=2999-01-01')).toEqual([]);
  const firstPage = await json(await site.call('/api/activity?limit=3', {cookie: owner}), 200);
  expect(firstPage.entries).toHaveLength(3);
  expect((await json(await site.call(`/api/activity?limit=3&before=${firstPage.nextCursor}`, {cookie: owner}), 200)).entries[0].id).not.toBe(firstPage.entries[0].id);

  // The export is the filtered view, with a formula-like name kept as text.
  const csv = await site.call(`/api/activity/export?operator=act-admin&action=draft.saved`, {cookie: owner});
  expect(csv.status).toBe(200);
  expect(csv.headers.get('content-type')).toContain('text/csv');
  const lines = (await csv.text()).trim().split('\r\n');
  expect(lines[0]).toBe('Time (UTC),Actor type,Actor,Actor name,Action,Object type,Object,Detail');
  expect(lines).toHaveLength(2);
  expect(lines[1]).toContain(",'=SUM(1+1),draft.saved,campaign-revision,");
  // Only Owner and Admin read it; Authors are refused on both doors, signed-out requests are refused too.
  expect((await site.call('/api/activity', {cookie: author})).status).toBe(403);
  expect((await site.call('/api/activity/export', {cookie: author})).status).toBe(403);
  expect((await site.call('/api/activity')).status).toBe(401);
  expect((await site.call('/api/activity', {cookie: admin})).status).toBe(200);

  await page.context().clearCookies();
  await page.context().addCookies([{name: owner.split('=')[0], value: owner.split('=')[1], url: site.runtime.url}]);
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 1000});
    await openPage(page, `${site.runtime.url}/app/settings/activity`);
    await expect(page.getByRole('heading', {name: 'Activity', level: 1})).toBeVisible();
    await expect(page.getByRole('region', {name: 'Activity log table'})).toContainText('draft.saved');
    await page.getByLabel('Action', {exact: true}).fill('cancelled');
    await page.getByRole('button', {name: 'Apply filters'}).click();
    await expect(page.getByRole('region', {name: 'Activity log table'}).locator('tbody tr')).toHaveCount(1);
    await expect(page.getByRole('link', {name: 'Export CSV'})).toHaveAttribute('href', '/api/activity/export?action=cancelled');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.screenshot({path: info.outputPath(`activity-${width}.png`), fullPage: true});
  }
  await page.context().clearCookies();
  await page.context().addCookies([{name: author.split('=')[0], value: author.split('=')[1], url: site.runtime.url}]);
  await openPage(page, `${site.runtime.url}/app`);
  await expect(page.getByRole('link', {name: 'Activity', exact: true})).toHaveCount(0);
}

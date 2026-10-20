import {expect, type Page, type TestInfo} from '@playwright/test';
import {json, availableTransport, confirmedContact, draftCampaign, approve, dispatch, type Installation} from './harness';
import {providerEdge} from './edge';
import {openPage} from '../support/navigation';
export async function domainJourney(site: Installation, edge: Awaited<ReturnType<typeof providerEdge>>, cookie: string, page: Page, info: TestInfo) {
  await site.control('/_golive/clock', {hold: false});
  edge.domainSetup.exists = false;
  const create = () => site.call('/api/settings/sender/domain-authentication', {method: 'POST', cookie, body: {action: 'create'}});
  for (const role of ['admin', 'manager', 'author']) {
    const other = await site.open(role + '@example.test', 'domain-' + role);
    await json(await site.call('/api/operators/domain-' + role + '/role', {method: 'PUT', cookie, body: {role}}), 200);
    expect((await site.call('/api/settings/sender/domain-authentication', {method: 'POST', cookie: other, body: {action: 'create'}})).status).toBe(403);
  }
  expect(edge.domainSetup.creates).toBe(0);
  await openPage(page, site.runtime.url + '/app/settings');
  await page.getByRole('button', {name: 'Create domain authentication', exact: true}).click();
  await expect(page.locator('#domain-guide')).toContainText('Validated');
  expect(edge.domainSetup.creates).toBe(1);
  await json(await create(), 200); expect(edge.domainSetup.creates).toBe(1);
  let guide = await json(await site.call('/api/settings/sender/domain-guide', {cookie}), 200);
  expect(guide.setup.records).toHaveLength(4); expect(guide.setup.records.every((row: any) => row.passed)).toBe(true);
  edge.domainSetup.dnsPass = true;
  expect((await json(await site.call('/api/settings/sender', {cookie}), 200)).validation.ready).toBe(false);
  // Setup retires prior sending evidence. Obtain
  // a fresh observation through the same owner inbox confirmation as the UI.
  await availableTransport(site);
  await json(await site.call('/api/settings/sender/confirmation', {method: 'POST', cookie, body: {}}), 202);
  const checkMail = edge.sends.findLast(send => send.to === 'owner@example.test')!;
  const checkUrl = /https:\/\/\S+\/sender-check\/\S+/.exec(checkMail.body.content.find((part: any) => part.type === 'text/plain').value)![0];
  expect((await fetch(site.local(checkUrl), {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=true'})).status).toBe(200);
  expect((await json(await site.call('/api/settings/sender', {cookie}), 200)).validation.ready).toBe(true);
  await json(await site.call('/api/settings/link-hosts', {method: 'PUT', cookie, body: {hosts: 'shop.example.test'}}), 200);
  for (const valid of [true, false]) {
    edge.domainSetup.trackingCname = valid;
    const tracking = await json(await site.call('/api/settings/sender/tracking-domain', {method: 'PUT', cookie, body: {host: 'links.example.test'}}), 200);
    expect(tracking.tracking).toMatchObject({passed: valid, cname: valid, https: valid});
    const email = valid ? 'branded@example.test' : 'ordinary@example.test';
    await confirmedContact(site, edge, cookie, email, 'Garden reader');
    const clock = await site.control('/_golive/clock'), due = new Date(clock.now + 10000);
    const campaign = await draftCampaign(site, cookie, 'Domain setup ' + valid, [email], due);
    await json(await site.call('/api/campaign-revisions/' + campaign.revisionId, {method: 'PATCH', cookie, body: {emailBody: '<p>Read <a href="https://shop.example.test/">the garden news</a>.</p>', trackingEnabled: true}}), 200);
    await approve(site, cookie, campaign);
    await site.control('/_golive/clock', {advanceMs: 10001});
    expect((await dispatch(site, campaign.campaignId, due))[0].transport_disposition).toBe('accepted');
    const sent = edge.sends.findLast(send => send.to === email && send.body.headers?.['List-Unsubscribe'])!;
    const html = sent.body.content.find((part: any) => part.type === 'text/html').value;
    expect(html).toContain(valid ? 'https://links.example.test/l/' : 'https://mango.example.test/l/');
    if (!valid) expect(html).not.toContain('https://links.example.test/l/');
    if (valid) {
      const link = /https:\/\/links\.example\.test(\/l\/[^"< ]+)/.exec(html)![1];
      const followed = await site.call(link, {headers: {'X-GoLive-Host': 'links.example.test', 'X-Test-Token': site.runtime.token}});
      expect(followed.status).toBe(302); expect(followed.headers.get('Location')).toBe('https://shop.example.test/');
      expect((await site.call('/api/operator', {cookie, headers: {'X-GoLive-Host': 'links.example.test', 'X-Test-Token': site.runtime.token}})).status).toBe(404);
      expect((await site.call('/', {method: 'HEAD', headers: {'X-GoLive-Host': 'links.example.test', 'X-Test-Token': site.runtime.token}})).status).toBe(204);
    }
  }
  edge.domainSetup.trackingCname = true; edge.domainSetup.trackingHttps = false;
  const tls = await json(await site.call('/api/settings/sender/tracking-domain', {method: 'PUT', cookie, body: {host: 'links.example.test'}}), 200);
  expect(tls.tracking).toMatchObject({cname: true, https: false, passed: false});
  await json(await site.call('/api/settings/sender/tracking-domain', {method: 'PUT', cookie, body: {host: ''}}), 200);
  edge.domainSetup.dnsPass = false;
  guide = await json(await site.call('/api/settings/sender/domain-guide', {cookie}), 200);
  expect(guide.setup.records.find((row: any) => row.name === 's1._domainkey.example.test')).toMatchObject({passed: false, value: 's1.domainkey.u99.wl.sendgrid.net'});
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 1000});
    await openPage(page, site.runtime.url + '/app/settings');
    await expect(page.getByRole('table', {name: 'Domain DNS records'})).toContainText('Fail');
    await page.locator('#domain-guide').screenshot({path: info.outputPath(`domain-guide-${width}.png`)});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(edge.unexpected).toEqual([]);
}

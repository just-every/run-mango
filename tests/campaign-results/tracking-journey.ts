import {expect, type Page, type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation, json, sender, confirmedContact, draftCampaign, approve, dispatch} from '../go-live/harness';
import {performanceCommerce, attributionJourney} from './performance-fixture';
import {crossChannelAttributionJourney} from './cross-channel-attribution';
import {openPage} from '../support/navigation';
import {parseCsv} from '../../src/core/features/audience/csv';

/** Independent runtime startup can overlap the existing historical report checks. */
export async function prepareTrackingJourney() {
  const commerce = performanceCommerce(), edge = await providerEdge(commerce);
  try {
    const site = await installation(edge, eventSigner(), {commerce: true, sms: true, providerKey: 'synthetic-mango-1'});
    let closing: Promise<void> | undefined;
    return {commerce, edge, site, close: () => closing ??= (async () => {try {await site.runtime.close();} finally {await edge.close();}})()};
  } catch (error) {await edge.close(); throw error;}
}

/** Only provider HTTP responses are doubled; no delivery, token or click is seeded. */
export async function trackingJourney(page: Page, info: TestInfo, prepared: Awaited<ReturnType<typeof prepareTrackingJourney>>) {
  const {commerce, edge, site} = prepared;
  try {
    let cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    const people = ['reader', 'scanner', 'untracked'].map((kind, index) => ({email: `synthetic-mango-${index + 1}@example.test`, name: `Mango ${kind}`}));
    for (const person of people) await confirmedContact(site, edge, cookie, person.email, person.name);
    const clock = await site.control('/_golive/clock', {hold: true});
    const analytics={enabled:true,source:'synthetic-mango',emailMedium:'email',smsMedium:'sms',campaign:'',content:''};
    await json(await site.call('/api/settings/analytics',{method:'PUT',cookie,body:analytics}),200);
    expect((await site.rows("SELECT actor_id FROM lifecycle_audit_entries WHERE action='analytics.settings.changed'"))).toHaveLength(1);
    const destination = 'https://mango-test.myshopify.com/products/garden?collection=autumn&utm_source=author#details';
    // Contact links (MSG-013) travel in the same tracked message as the store link.
    const contactLinks = ['mailto:hello@myshop.example?subject=Order%20question&body=Can%20you%20help%3F', 'tel:+15555550123', 'sms:+15555550123?body=Hi'];
    const contactAnchors = contactLinks.map((href, index) => `<a href="${href.replaceAll('&', '&amp;')}">${['Email', 'Call', 'Text'][index]} the garden</a>`);
    const due = new Date(clock.now + 3600000);
    const campaign = await draftCampaign(site, cookie, 'Tracked garden letter', people.slice(0, 2).map(person => person.email), due);
    await json(await site.call('/api/campaign-revisions/' + campaign.revisionId, {method: 'PATCH', cookie, body: {
      emailBody: `<p><a href="${destination}">Garden collection</a></p><p>${contactAnchors.join(' ')}</p>`, trackingEnabled: true,
    }}), 200);
    const tagged=new URL(destination);tagged.searchParams.set('utm_medium','email');tagged.searchParams.set('utm_campaign','tracked-garden-letter');tagged.searchParams.set('utm_content',campaign.revisionId);
    await approve(site, cookie, campaign);
    await site.control('/_golive/clock', {advanceMs: 3600001, hold: false});
    const recipients = await dispatch(site, campaign.campaignId, due);
    expect(recipients.map(row => row.transport_disposition)).toEqual(['accepted', 'accepted']);
    const sent = people.slice(0, 2).map(person => edge.sends.findLast(send => send.to === person.email && send.body.headers?.['List-Unsubscribe'])!);
    const links = sent.map(send => {
      const html = String(send.body.content.find((part: any) => part.type === 'text/html').value);
      const link = /href="([^"]+\/l\/[^\"]+)"/.exec(html)?.[1];
      expect(link).toBeTruthy();
      expect(new URL(link!).origin).toBe(site.origin);
      expect(html).not.toContain(`href="${destination}"`);
      // Tracking is on, yet every contact link reaches the recipient exactly as authored.
      const text = String(send.body.content.find((part: any) => part.type === 'text/plain').value);
      for (const [index, href] of contactLinks.entries()) {
        expect(html).toContain(contactAnchors[index]);
        expect(text).toContain(`(${href})`);
      }
      return link!;
    });
    expect(new Set(links).size).toBe(2);
    const contacts = await site.rows('SELECT id,email,display_name FROM contacts');
    for (const link of links) for (const person of contacts.filter(row => people.some(person => person.email === row.email))) {
      for (const value of [person.id, person.email, person.display_name, campaign.campaignId, campaign.revisionId]) expect(decodeURIComponent(new URL(link).pathname)).not.toContain(value);
    }
    const result = () => site.call(`/api/campaigns/${campaign.campaignId}/results`, {cookie}).then(response => json(response, 200));
    expect((await result()).engagement).toMatchObject({observedClicks: 0, automatedRequestsRetainedButExcluded: 0});
    const follow = async (link: string, agent: string, ray: string) => {
      const response = await site.call(new URL(link).pathname, {headers: {'User-Agent': agent, 'CF-Ray': ray}});
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe(tagged.href);
      expect(response.headers.get('Set-Cookie')).toBeNull();
      expect(await response.text()).toBe('');
    };
    for (const [index, link] of links.entries()) await follow(link, index ? 'Barracuda LinkProtect' : 'Mozilla/5.0 Garden reader', `synthetic-mango-${index + 1}`);
    expect((await result()).engagement).toMatchObject({observedClicks: 1, automatedRequestsRetainedButExcluded: 1});
    const engagementPath = `/api/campaigns/${campaign.campaignId}/engagement`;
    const map = await json(await site.call(engagementPath, {cookie}), 200);
    // Contact links are authored links with no redirect behind them, so they never record a click.
    expect(map.links).toEqual([expect.objectContaining({destinationUrl: destination, totalClicks: 1, uniqueClicks: 1, automatedRequests: 1}),
      ...contactLinks.map(href => expect.objectContaining({destinationUrl: href, totalClicks: 0, uniqueClicks: 0, automatedRequests: 0}))]);
    expect((await site.rows('SELECT DISTINCT destination_url FROM tracked_links')).map(row => row.destination_url)).toEqual([tagged.href]);
    const csv = parseCsv(await (await site.call(engagementPath + '?format=csv', {cookie})).text());
    expect(csv).toHaveLength(1 + contactLinks.length);
    expect(csv[0]).toMatchObject({clicks: '1', 'unique clickers': '1', 'automated requests': '1'});
    for (const [index, href] of contactLinks.entries()) expect(csv[index + 1]).toMatchObject({destination: href, clicks: '0', 'unique clickers': '0', 'automated requests': '0'});
    const performance = await json(await site.call('/api/insights/campaign-performance', {cookie}), 200);
    expect(performance.rows.find((row: any) => row.campaignId === campaign.campaignId)).toMatchObject({totalClicks: 1, uniqueClicks: 1});

    // The existing per-revision operator control must persist into delivery.
    const disabledDue = new Date((await site.control('/_golive/clock')).now + 3600000);
    const disabled = await draftCampaign(site, cookie, 'Private garden letter', [people[2].email], disabledDue);
    await json(await site.call('/api/campaign-revisions/' + disabled.revisionId, {method: 'PATCH', cookie, body: {emailBody: `<p><a href="${destination}">Garden collection</a></p>`, trackingEnabled: true}}), 200);
    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    await openPage(page, `${site.runtime.url}/app/campaigns/${disabled.campaignId}/review`);
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.getByLabel('Track link clicks', {exact: true}).check();
      await page.getByLabel('Track link clicks', {exact: true}).uncheck();
      const [saved] = await Promise.all([
        page.waitForResponse(response => response.request().method()==='PATCH' && new URL(response.url()).pathname===`/api/campaign-revisions/${disabled.revisionId}`),
        page.getByRole('button', {name: 'Save full draft', exact: true}).click(),
      ]);
      expect(saved.status()).toBe(200);
      await expect(page.getByRole('status').filter({hasText: 'Draft saved.'})).toBeVisible();
      expect((await json(await site.call(`/api/campaigns/${disabled.campaignId}`, {cookie}), 200)).revision.trackingEnabled).toBe(false);
      await page.screenshot({path: info.outputPath(`tracking-control-${width}.png`), fullPage: true});
    }
    await openPage(page,site.runtime.url+'/app/settings');
    const analyticsPanel=page.getByRole('region',{name:'Web analytics tagging',exact:true});
    await analyticsPanel.getByLabel('Campaign draft',{exact:true}).selectOption(disabled.revisionId);
    await analyticsPanel.getByRole('checkbox',{name:"Tag this campaign's links",exact:true}).uncheck();
    await analyticsPanel.getByRole('button',{name:'Save campaign tagging',exact:true}).click();
    await expect(analyticsPanel.getByRole('status')).toContainText('Campaign tagging saved.');
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      await expect(analyticsPanel.getByLabel('UTM source',{exact:true})).toHaveValue('synthetic-mango');
      await expect(analyticsPanel.getByRole('checkbox',{name:"Tag this campaign's links",exact:true})).not.toBeChecked();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
      await analyticsPanel.screenshot({path:info.outputPath(`analytics-settings-${width}.png`)});
    }
    await approve(site, cookie, disabled);
    await site.control('/_golive/clock', {advanceMs: 3600001, hold: false});
    expect((await dispatch(site, disabled.campaignId, disabledDue))[0].transport_disposition).toBe('accepted');
    const untracked = edge.sends.findLast(send => send.to === people[2].email && send.body.headers?.['List-Unsubscribe'])!;
    const html = String(untracked.body.content.find((part: any) => part.type === 'text/html').value);
    expect(html).toContain(`href="${destination.replaceAll('&','&amp;')}"`);
    expect(html).not.toContain('/l/');
    const before = await result();
    await page.route(destination.split('#')[0], route => route.fulfill({status: 200, contentType: 'text/html', body: '<p>Garden collection</p>'}));
    await page.goto(destination);
    await page.unroute(destination.split('#')[0]);
    expect(await result()).toEqual(before);
    expect((await json(await site.call(`/api/campaigns/${disabled.campaignId}/results`, {cookie}), 200)).engagement.observedClicks).toBe(0);
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await openPage(page, site.runtime.url + '/app/insights');
      const row = page.getByRole('table', {name: 'Campaign performance', exact: true}).locator('tbody tr').filter({hasText: 'Tracked garden letter'});
      await expect(row.locator('[data-label="Human clicks"]')).toHaveText('1');
      await expect(row.locator('[data-label="Unique clicks"]')).toHaveText('1');
      await row.getByRole('button', {name: 'View links · revision 1', exact: true}).click();
      await expect(page.getByRole('table', {name: 'Clicks by link'})).toContainText('Garden collection');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
      await page.screenshot({path: info.outputPath(`tracking-${width}.png`), fullPage: true});
      await openPage(page, `${site.runtime.url}/app/campaigns/${campaign.campaignId}/scheduled`);
      const clickMap = page.frameLocator('iframe[title="Campaign click map"]');
      await expect(clickMap.locator('mark')).toHaveText(['[1 clicks · 1 people]', ...contactLinks.map(() => '[0 clicks · 0 people]')]);
      await page.locator('iframe[title="Campaign click map"]').scrollIntoViewIfNeeded();
      await expect(clickMap.locator('mark').first()).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      // axe cannot enter the sandboxed click map; its marks are asserted above.
      expect((await new AxeBuilder({page}).exclude('iframe[title="Campaign click map"]').analyze()).violations).toEqual([]);
      const engagement = page.locator('section').filter({has: page.getByRole('heading', {name: 'Link engagement', exact: true})});
      await engagement.screenshot({path: info.outputPath(`tracking-map-${width}.png`)});
    }
    await attributionJourney({site, edge, commerce, cookie, campaign, links, people, destination, page, info});
    await crossChannelAttributionJourney({site, edge, commerce, destination, page, info});
    // A delivered link forwards for the life of its message; only click recording
    // ends, when the link's recording window closes. Real elapsed time, no seeded click.
    const [{ends}] = await site.rows(`SELECT t.expires_at AS ends FROM tracked_links t JOIN recipient_steps r ON r.id=t.recipient_step_id
      WHERE r.campaign_id='${campaign.campaignId}' AND r.destination='${people[0].email}'`);
    const moveClock = async (at: number) => site.control('/_golive/clock', {advanceMs: at - (await site.control('/_golive/clock')).now});
    await moveClock(Number(ends) - 60000);
    cookie = await site.open();
    await follow(links[0], 'Mozilla/5.0 Garden reader', 'synthetic-mango-window-open');
    const closing = await result();
    expect(closing.engagement).toMatchObject({observedClicks: 2, automatedRequestsRetainedButExcluded: 1});
    const facts = await site.count('link_click_facts');
    await moveClock(Number(ends) + 60000);
    cookie = await site.open();
    await follow(links[0], 'Mozilla/5.0 Garden reader', 'synthetic-mango-window-closed');
    await follow(links[1], 'Barracuda LinkProtect', 'synthetic-mango-window-closed-scanner');
    expect((await result()).engagement).toEqual(closing.engagement);
    expect(await site.count('link_click_facts')).toBe(facts);
    expect(edge.unexpected).toEqual([]);
  } finally {await prepared.close();}
}

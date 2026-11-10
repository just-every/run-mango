import {expect, test} from '@playwright/test';
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {png} from '../support/images';
import {openPage, reloadPage} from '../support/navigation';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {approve, confirmedContact, dispatch, draftCampaign, installation, json, sender, type Installation} from './harness';

// Observe every application table, including populated authority and engagement
// records. The public requests must not create a new requester-history table or
// change an existing record. Private fixture rows stay in memory, never receipts.
async function records(site: Installation) {
  const tables = await site.rows("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name");
  const result: Record<string, unknown[]> = {};
  for (const {name} of tables) {
    const identifier = '"' + String(name).replaceAll('"', '""') + '"';
    const rows = await site.rows(`SELECT * FROM ${identifier}`);
    result[name] = rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  }
  return result;
}

test('[RESULT-010] delivered ordinary images share one URL, retain only a minute counter and never credit opens', async ({page}, info) => {
  const edge = await providerEdge(), signer = eventSigner(), site = await installation(edge, signer);
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    const addresses = [1, 2].map(n => [`synthetic-mango-${n}`, 'example.test'].join('@'));
    for (const [index, address] of addresses.entries()) await confirmedContact(site, edge, cookie, address, `Garden reader ${index + 1}`);
    await json(await site.call('/api/insights/open-tracking', {method: 'PUT', cookie, body: {enabled: true}}), 200);

    const bytes = png(24, 16, 111), sha256 = createHash('sha256').update(bytes).digest('hex');
    const form = new FormData();
    form.append('file', new Blob([bytes], {type: 'image/png'}), 'synthetic-mango-111.png');
    const {asset} = await json(await site.call('/api/campaign-assets', {method: 'POST', cookie, raw: form}), 201);
    expect(asset).toMatchObject({sha256, bytes: bytes.byteLength, url: `${site.origin}/media/${sha256}`});
    const due = new Date((await site.control('/_golive/clock')).now + 3600_000);
    const campaign = await draftCampaign(site, cookie, 'Shared garden image', addresses, due);
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method: 'PATCH', cookie,
      body: {emailBody: `<p>The garden this month.</p><p><img src="${asset.url}" alt="Garden beds" width="24" height="16"></p>`}}), 200);
    await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`, {method: 'POST', cookie, body: {revisionId: campaign.revisionId}}), 200);
    await approve(site, cookie, campaign);
    await site.control('/_golive/clock', {advanceMs: 3600_001, hold: false});
    const recipients = await dispatch(site, campaign.campaignId, due);
    await site.control('/_golive/clock', {hold: true});
    expect(recipients.map(row => ({destination: row.email, disposition: row.transport_disposition})))
      .toEqual(addresses.map(destination => ({destination, disposition: 'accepted'})));
    const sends = edge.sends.filter(send => addresses.includes(send.to) && send.body.headers?.['List-Unsubscribe']);
    expect(sends.map(send => send.to).sort()).toEqual(addresses);
    const delivered = sends.map(send => {
      const html = String(send.body.content.find((part: any) => part.type === 'text/html').value);
      const sources = [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
      expect(sources.filter(src => new URL(src).pathname.startsWith('/media/'))).toEqual([asset.url]);
      const pixels = sources.filter(src => new URL(src).pathname.startsWith('/o/'));
      expect(pixels).toHaveLength(1);
      expect(send.body.tracking_settings.open_tracking.enable).toBe(false);
      return {image: asset.url, pixel: pixels[0]};
    });
    expect(new Set(delivered.map(value => value.image)).size).toBe(1);
    expect(new Set(delivered.map(value => value.pixel)).size).toBe(2);

    const results = () => site.call(`/api/campaigns/${campaign.campaignId}/results`, {cookie}).then(response => json(response, 200));
    const performance = () => site.call('/api/insights/campaign-performance', {cookie}).then(response => json(response, 200));
    const settings = () => site.call('/api/insights/open-tracking', {cookie}).then(response => json(response, 200));
    const beforeResults = await results(), beforePerformance = await performance(), beforeSettings = await settings();
    expect(beforeResults.engagement.opens).toMatchObject({enabled: true, estimatedRecipients: 0});
    expect(beforeSettings).toMatchObject({enabled: true, estimatedRecipients: 0});
    const before = await records(site), key = `media:${sha256}`;
    const priorLimits = before.oa_limits as Array<{key: string; window: number; count: number}>;
    let prior = priorLimits.find(row => row.key === key);
    const probes: Array<{method: string; status: number; window: number; count: number}> = [];
    for (const [index, method] of ['GET', 'HEAD', 'GET', 'HEAD'].entries()) {
      const minute = async () => Number((await site.rows("SELECT CAST(strftime('%s','now') AS INTEGER)/60 AS minute"))[0].minute);
      const earliest = await minute();
      const response = await fetch(site.local(asset.url), {method, headers: {
        'CF-Connecting-IP': `192.0.2.${111 + index}`, 'User-Agent': `synthetic-mango-agent-${index}`,
        Cookie: `synthetic-mango-cookie=${index}`, 'X-Request-ID': `synthetic-mango-request-${index}`,
      }});
      expect(response.status).toBe(200);
      expect(response.headers.get('set-cookie')).toBeNull();
      expect(response.headers.get('content-type')).toBe('image/png');
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(method === 'HEAD' ? new Uint8Array() : bytes);
      const latest = await minute();
      const [counter] = await site.rows(`SELECT * FROM oa_limits WHERE key='${key}'`);
      // D1 uses its own clock. Bracket each fetch instead of assuming a minute
      // never rolls while the browser journey is running.
      expect(Object.keys(counter).sort()).toEqual(['count', 'key', 'window']);
      expect(counter.key).toBe(key);
      expect(counter.window).toBeGreaterThanOrEqual(earliest);
      expect(counter.window).toBeLessThanOrEqual(latest);
      expect(counter.count).toBe(prior?.window === counter.window ? prior.count + 1 : 1);
      probes.push({method, status: response.status, window: counter.window, count: counter.count});
      prior = counter as typeof prior;
    }
    expect((await results()).engagement.opens.estimatedRecipients).toBe(0);
    const after = await records(site);
    expect(after.oa_limits.filter((row: any) => row.key !== key)).toEqual(priorLimits.filter(row => row.key !== key));
    expect({...after, oa_limits: undefined}).toEqual({...before, oa_limits: undefined});
    expect(await results()).toEqual(beforeResults);
    expect(await performance()).toEqual(beforePerformance);
    expect(await settings()).toEqual(beforeSettings);

    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    await openPage(page, site.runtime.url + '/app/insights');
    const estimates = page.getByRole('region', {name: 'Privacy-sensitive open estimates', exact: true});
    const row = page.getByRole('table', {name: 'Campaign performance', exact: true}).locator('tbody tr').filter({hasText: 'Shared garden image'});
    await expect(estimates).toContainText('0 recipient estimates kept.');
    await expect(row.locator('[data-label="Recipients"]')).toHaveText('2');
    await expect(row.locator('[data-label="Open-rate estimate"]')).toHaveText('0.00%');
    await reloadPage(page);
    await expect(estimates).toContainText('0 recipient estimates kept.');
    await expect(row.locator('[data-label="Open-rate estimate"]')).toHaveText('0.00%');
    // Assertions run at desktop width. Record the same real operator page at
    // both required widths for the candidate's separate visual proof.
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.screenshot({path: info.outputPath(`ordinary-images-${width}.png`), fullPage: true});
    }
    await page.setViewportSize({width: 1440, height: 1000});

    // Positive control: the recipient-specific pixel changes only estimates;
    // an inert results surface cannot make the ordinary-image proof pass.
    const pixel = await fetch(site.local(delivered[0].pixel));
    expect(pixel.status).toBe(200);
    expect(pixel.headers.get('set-cookie')).toBeNull();
    expect(await site.count('open_estimate_facts')).toBe(1);
    const positive = await results();
    expect(positive.engagement.opens.estimatedRecipients).toBe(1);
    expect({...positive, engagement: {...positive.engagement, opens: undefined}})
      .toEqual({...beforeResults, engagement: {...beforeResults.engagement, opens: undefined}});
    await reloadPage(page);
    await expect(estimates).toContainText('1 recipient estimates kept.');
    await expect(row.locator('[data-label="Open-rate estimate"]')).toHaveText('50.00%');
    expect(edge.unexpected).toEqual([]);
    await writeFile(info.outputPath('ordinary-images-receipt.json'), JSON.stringify({
      clause: 'RESULT-010', recipients: recipients.length, distinctOrdinaryUrls: 1, distinctPixels: 2,
      probes, unchangedTables: Object.keys(before).filter(name => name !== 'oa_limits'),
      ordinaryOpenEstimates: 0, positiveControlEstimates: 1, assertionsWidth: 1440, proofWidths: [1440, 390],
    }, null, 2) + '\n');
  } finally {await page.close(); await site.runtime.close(); await edge.close();}
});

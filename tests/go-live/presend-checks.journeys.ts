import { png } from '../support/images';
import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve } from './harness';
import { openPage, reloadPage } from '../support/navigation';
import { measureEmailSize, formatEmailSize } from '../../src/core/features/campaigns/email-size';

contract('BUILD-008', 'saved contact previews and located advisories remain separate from contrast blockers', async ({page}, info) => {
  const edge = await providerEdge(), site = await installation(edge, eventSigner());
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    const upload=new FormData();upload.set('file',new File([png(100,100)],'garden.png',{type:'image/png'}));
    const {asset}=await json(await site.call('/api/campaign-assets',{method:'POST',cookie,raw:upload}),201);
    const named = 'ava@example.test', unnamed = 'reader@example.test';
    await confirmedContact(site, edge, cookie, named, 'Ava <b>Gardener</b> & Co');
    await confirmedContact(site, edge, cookie, unnamed, '');
    const clock = await site.control('/_golive/clock', {hold: true});
    const campaign = await draftCampaign(site, cookie, 'Garden preview checks', [named, unnamed], new Date(clock.now + 3600000));
    const path = `/api/campaign-revisions/${campaign.revisionId}`;
    const patch = (body: unknown) => site.call(path, {method: 'PATCH', cookie, body}).then(response => json(response, 200));
    const read = () => site.call(`/api/campaigns/${campaign.campaignId}`, {cookie}).then(response => json(response, 200));
    const review = async () => {await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`, {method: 'POST', cookie, body: {revisionId: campaign.revisionId}}),200);return read();};
    const acknowledge = (check: any, status = 200) => site.call(`/api/campaigns/${campaign.campaignId}/checks/${check.id}/acknowledge`, {
      method: 'POST', cookie, body: {revisionId: campaign.revisionId, findingIdentity: check.findingIdentity},
    }).then(response => json(response, status));
    await patch({emailSubject: 'Act now: your garden letter', preheader: 'For {{displayName | fallback: Garden friend}}',
      emailBody: '<h1>Your garden</h1><h3>Spring notes</h3><p>Hello {{displayName | fallback: Garden friend}}.</p>'
        + '<p style="color:#bbbbbb">Low contrast garden note.</p>'
        + `<img src="${asset.url}" width="100" height="100">`
        + `<img src="${asset.url}.png" width="100" height="100" alt="">`
        + '<p><a href="mailto:garden@example.test">Click here</a></p>'});
    const initial = (await read()).revision;
    const initialSize = measureEmailSize(initial, {publicBaseUrl: site.origin, openTrackingEnabled: true,values:{displayName:'Ava <b>Gardener</b> & Co'}});
    const targetBytes = 95 * 1024;
    await patch({emailBody: initial.emailBody + `<p>${'x'.repeat(targetBytes - initialSize.htmlBytes - 7)}</p>`});
    const saved = (await read()).revision;
    const measured = measureEmailSize(saved, {publicBaseUrl: site.origin, openTrackingEnabled: true,values:{displayName:'Ava <b>Gardener</b> & Co'}});
    expect(measured.htmlBytes).toBe(targetBytes);
    const checked = await review();
    const advisories = checked.checks.filter((check: any) => check.status === 'advisory');
    for (const kind of ['image-alt', 'heading-order', 'link-text', 'spam-wording', 'size-advisory']) {
      const finding = advisories.find((check: any) => check.kind === `message.email-${kind}`);
      expect(finding, kind).toMatchObject({blocking: false});
      expect(finding.findingIdentity).toBeTruthy();
    }
    const alt = advisories.find((check: any) => check.kind === 'message.email-image-alt');
    expect(alt.detail).toContain('HTML body > img[1]');
    expect(alt.detail).not.toContain('img[2]');
    expect(advisories.find((check: any) => check.kind === 'message.email-heading-order').detail).toContain('HTML body > h3[1]');
    expect(advisories.find((check: any) => check.kind === 'message.email-link-text').detail).toContain('Click here');
    expect(advisories.find((check: any) => check.kind === 'message.email-spam-wording').detail).toContain('Email subject');
    const sizeFinding = advisories.find((check: any) => check.kind === 'message.email-size-advisory');
    expect(sizeFinding.detail).toContain(formatEmailSize(measured));
    for (const block of measured.largestBlocks.slice(0, 3)) expect(sizeFinding.detail).toContain(block.location);
    const blocker = checked.checks.find((check: any) => check.kind === 'message.content' && check.blocking);
    expect(blocker.detail).toContain('contrast');

    await page.context().addCookies([{name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url}]);
    await openPage(page, `${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    const altRow = page.locator('.check-list__item').filter({hasText: 'missing alt attribute'});
    await altRow.getByRole('button', {name: 'Acknowledge advisory', exact: true}).click();
    await expect(altRow).toContainText('Acknowledged by');
    for (const check of advisories.filter((check: any) => check.id !== alt.id)) await acknowledge(check);
    await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`, {method: 'POST', cookie,
      body: {revisionId: campaign.revisionId, idempotencyKey: 'contrast-still-blocks'}}), 409);
    expect(await site.count('recipient_steps')).toBe(0);

    // Correcting a blocker changes the exact saved revision and invalidates every prior acknowledgement.
    await patch({emailBody: saved.emailBody.replace('#bbbbbb', '#242821')});
    const corrected = await review();
    const currentAdvisories = corrected.checks.filter((check: any) => check.status === 'advisory');
    expect(currentAdvisories.every((check: any) => !check.acknowledgement)).toBe(true);
    expect(corrected.checks.filter((check: any) => check.blocking)).toEqual([]);
    const currentAlt = currentAdvisories.find((check: any) => check.kind === alt.kind);
    await acknowledge({...currentAlt, findingIdentity: alt.findingIdentity}, 409);

    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await reloadPage(page);
      await page.locator('.approval-checks').screenshot({path:info.outputPath(`presend-findings-${width}.png`)});
      const email = page.locator('.message-preview--email');
      await email.getByText('Preview as a contact', {exact: true}).click();
      await email.getByLabel('Contact email or phone', {exact: true}).fill(named);
      await email.getByRole('button', {name: 'Find preview contact', exact: true}).click();
      const contactSelect = email.getByRole('combobox',{name:'Preview contact',exact:true});
      await expect(contactSelect.locator('option')).toHaveCount(2);
      await contactSelect.selectOption({index: 1});
      const body = page.frameLocator('iframe[title="Saved email preview"]').locator('body');
      await expect(body).toContainText('Hello Ava <b>Gardener</b> & Co.');
      await expect(body.locator('b')).toHaveCount(0);
      await expect(page.locator('.message-preview--plain')).toContainText('Hello Ava <b>Gardener</b> & Co.');
      await expect(email).toContainText('Preheader: For Ava <b>Gardener</b> & Co');
      await email.getByRole('button', {name: 'Mobile email', exact: true}).click();
      await expect(email.locator('.email-preview-frame')).toHaveClass(/--mobile/);
      await email.getByRole('button', {name: 'Dark approximation', exact: true}).click();
      await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('html')).toHaveCSS('filter', 'invert(1) hue-rotate(180deg)');
      await email.screenshot({path: info.outputPath(`contact-dark-mobile-${width}.png`)});
      await email.getByRole('button', {name: 'Desktop email', exact: true}).click();
      await email.getByRole('button', {name: 'Light mode', exact: true}).click();
      await expect(body).toContainText('Hello Ava <b>Gardener</b> & Co.');
      await email.screenshot({path: info.outputPath(`contact-light-desktop-${width}.png`)});
      await email.getByLabel('Contact email or phone', {exact: true}).fill(unnamed);
      await email.getByRole('button', {name: 'Find preview contact', exact: true}).click();
      await expect(contactSelect.locator('option')).toHaveCount(2);
      await contactSelect.selectOption({index: 1});
      await expect(body).toContainText('Hello Garden friend.');
      await expect(page.locator('.message-preview--plain')).toContainText('Hello Garden friend.');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    for (const check of currentAdvisories) await acknowledge(check);
    await approve(site, cookie, campaign);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}`);
      const email=page.locator('.message-preview--email');
      await expect(email.getByRole('button',{name:'Dark approximation',exact:true})).toBeVisible();
      await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('Hello Alex Example.');
      await email.screenshot({path:info.outputPath(`approved-preview-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  } finally { await site.runtime.close(); await edge.close(); }
});

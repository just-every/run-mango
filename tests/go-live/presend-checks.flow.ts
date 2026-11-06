const width = 1440;
import { png } from '../support/images';
import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve } from './harness';
import { openPage, reloadPage } from '../support/navigation';
import { measureEmailSize, formatEmailSize } from '../../src/core/features/campaigns/email-size';



export const walk0 = async ({page}, info) => {
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
    expect(await site.count('campaign_approval_requests')).toBe(0);
    expect((await read()).revision.state).toBe('draft');

    // Correcting a blocker changes the exact saved revision and invalidates every prior acknowledgement.
    await patch({emailBody: saved.emailBody.replace('#bbbbbb', '#242821')});
    const corrected = await review();
    const currentAdvisories = corrected.checks.filter((check: any) => check.status === 'advisory');
    expect(currentAdvisories.every((check: any) => !check.acknowledgement)).toBe(true);
    expect(corrected.checks.filter((check: any) => check.blocking)).toEqual([]);
    const currentAlt = currentAdvisories.find((check: any) => check.kind === alt.kind);
    expect(await acknowledge({...currentAlt, findingIdentity: alt.findingIdentity}, 409)).toMatchObject({error: 'stale_finding'});

     {
      await page.setViewportSize({width, height: 1000});
      await reloadPage(page);
      await page.locator('.approval-checks').screenshot({path:info.outputPath(`presend-findings-${width}.png`)});
      await page.setViewportSize({width: 390, height: 1000});
      await page.locator('.approval-checks').screenshot({path:info.outputPath('presend-findings-390.png')});
      await page.setViewportSize({width, height: 1000});
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
    const approval = await approve(site, cookie, campaign);
    expect(approval).toMatchObject({status: 'scheduled', idempotent: false, revisionDigest: expect.stringMatching(/^[a-f0-9]{64}$/)});
    const approved = await read();
    expect(approved.campaign).toMatchObject({id: campaign.campaignId, state: 'scheduled', activeRevisionId: campaign.revisionId});
    expect(approved.revision).toMatchObject({id: campaign.revisionId, state: 'approved',
      emailBody: corrected.revision.emailBody, contentDigest: approval.revisionDigest, approvedByOperatorId: 'go-live-owner'});
    expect(approved.revision.approvedAt).toBe(new Date(clock.now).toISOString());
    const approvalRecords = () => site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${campaign.campaignId}'`);
    const records = await approvalRecords();
    expect(records).toEqual([expect.objectContaining({idempotency_key: `approve-${campaign.revisionId}`,
      campaign_id: campaign.campaignId, revision_id: campaign.revisionId, revision_digest: approval.revisionDigest,
      operator_id: 'go-live-owner', approved_at: clock.now, created_at: clock.now})]);
    // Replaying approval and attempting an edit cannot replace the approved revision or its authority record.
    expect(await approve(site, cookie, campaign)).toEqual({...approval, idempotent: true});
    expect(await json(await site.call(path, {method: 'PATCH', cookie, body: {emailSubject: 'Changed after approval'}}), 409))
      .toMatchObject({error: 'revision_not_draft'});
    expect((await read()).revision).toEqual(approved.revision);
    expect(await approvalRecords()).toEqual(records);
     {
      await page.setViewportSize({width,height:1000});
      await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}`);
      // Root hydration precedes this page's independent campaign-data request.
      await expect(page.getByRole('region',{name:'Saved revision previews',exact:true})).toBeVisible({timeout:30000});
      const email=page.locator('.message-preview--email');
      await expect(email.getByRole('button',{name:'Dark approximation',exact:true})).toBeVisible();
      await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('Hello Alex Example.');
      await email.screenshot({path:info.outputPath(`approved-preview-${width}.png`)});
      await page.setViewportSize({width: 390, height: 1000});
      await email.screenshot({path:info.outputPath('approved-preview-390.png')});
      await page.setViewportSize({width, height: 1000});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }

    // Separate saved drafts exercise presentation without changing the approved letter above.
    const styled = await draftCampaign(site, cookie, 'synthetic-mango-503 preview styles', [named], new Date(clock.now + 7200000));
    const stylePath = `/api/campaign-revisions/${styled.revisionId}`;
    const readStyled = () => site.call(`/api/campaigns/${styled.campaignId}`, {cookie}).then(response => json(response, 200));
    const authority = async () => ({
      approvals: await site.rows('SELECT * FROM campaign_approval_requests ORDER BY idempotency_key'),
      recipients: await site.rows('SELECT * FROM recipient_steps ORDER BY id'),
      emissions: await site.control('/_golive/emissions'),
      handoffs: structuredClone(edge.sends),
    });
    const authorityBefore = await authority();
    const presentations = [
      {name: 'valid', body: '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr>'
        + '<td bgcolor="#e7f3df" align="right" style="padding:18px"><p style="color:#183c2c;font-family:Georgia,serif;font-size:21px;font-weight:700">'
        + 'synthetic-mango-503 garden invitation</p></td></tr></tbody></table>', text: 'synthetic-mango-503 garden invitation'},
      {name: 'mobile', body: '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tbody><tr>'
        + '<td bgcolor="#e7f3df" align="right" style="padding:18px"><p style="color:#183c2c;font-family:Georgia,serif;font-weight:700">'
        + 'synthetic-mango-505 mobile invitation</p></td></tr></tbody></table>', text: 'synthetic-mango-505 mobile invitation',
        mobile: [{block: 0, contentCell: true, fontSize: 26, lineHeight: 1.75, padding: 14, alignment: 'center'}]},
      {name: 'refused', body: '<table role="presentation" width="90%" cellpadding="12" cellspacing="4" border="0"><tbody><tr>'
        + '<td bgcolor="#efe4cc" align="center" style="padding:24px"><p style="display:none;color:#ffffff;font-family:Georgia,serif;font-size:27px">'
        + 'synthetic-mango-504 essential garden terms</p></td></tr></tbody></table>', text: 'synthetic-mango-504 essential garden terms'},
      {name: 'refused-mobile', body: '<table role="presentation" width="90%" cellpadding="12" cellspacing="4" border="0"><tbody><tr>'
        + '<td bgcolor="#efe4cc" align="center" style="padding:24px"><p style="display:none;color:#ffffff;font-family:Georgia,serif;font-size:27px">'
        + 'synthetic-mango-506 mobile terms</p></td></tr></tbody></table>', text: 'synthetic-mango-506 mobile terms',
        mobile: [{block: 0, contentCell: true, fontSize: 29, lineHeight: 1.5, padding: 16, alignment: 'right'}]},
    ];
    for (const presentation of presentations) {
      await json(await site.call(stylePath, {method: 'PATCH', cookie, body: {emailBody: presentation.body, emailMobile: presentation.mobile ?? []}}), 200);
      const beforeChecks = (await readStyled()).revision;
      if (presentation.mobile) {
        expect(beforeChecks.emailBody).toContain(presentation.text);
        expect(beforeChecks.emailBody).toContain('data-mango-mobile=');
        expect(beforeChecks.emailText).toContain(presentation.text);
      } else expect(beforeChecks.emailBody).toContain(presentation.body);
      await json(await site.call(`/api/campaigns/${styled.campaignId}/checks`, {method: 'POST', cookie, body: {revisionId: styled.revisionId}}), 200);
      const checkedStyle = await readStyled();
      const content = checkedStyle.checks.find((check: any) => check.kind === 'message.content');
      expect(checkedStyle.revision).toEqual(beforeChecks);
      if (!presentation.name.startsWith('refused')) expect(checkedStyle.checks.filter((check: any) => check.blocking)).toEqual([]);
      else {
        expect(content).toMatchObject({blocking: true});
        expect(content.detail).toContain('display');
      }
      await page.setViewportSize({width: 390, height: 1000});
      await openPage(page, `${site.runtime.url}/app/campaigns/${styled.campaignId}/review`);
      const email = page.locator('.message-preview--email');
      const frame = email.locator('iframe[title="Saved email preview"]');
      const body = page.frameLocator('iframe[title="Saved email preview"]').locator('body');
      const text = body.getByText(presentation.text, {exact: true});
      // Both the initial read and a new document must show the saved checker decision.
      for (const reload of [false, true]) {
        if (reload) await reloadPage(page);
        await expect(frame).toHaveAttribute('sandbox', '');
        await expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
        for (const mode of ['Desktop', 'Mobile']) {
          await email.getByRole('button', {name: `${mode} email`, exact: true}).click();
          await expect(email.locator('.email-preview-frame')).toHaveClass(new RegExp(`--${mode.toLowerCase()}`));
          await expect(text).toBeVisible();
          if (!presentation.name.startsWith('refused')) {
            await expect(email.getByRole('alert')).toHaveCount(0);
            await expect(text).toHaveCSS('color', 'rgb(24, 60, 44)');
            await expect(text).toHaveCSS('font-family', 'Georgia, serif');
            await expect(text).toHaveCSS('font-size', presentation.mobile ? '26px' : '21px');
            await expect(text).toHaveCSS('font-weight', '700');
            await expect(body.locator('td')).toHaveCSS('background-color', 'rgb(231, 243, 223)');
            await expect(body.locator('td')).toHaveCSS('padding-top', presentation.mobile ? '14px' : '18px');
            if (presentation.mobile) {
              await expect(text).toHaveCSS('line-height', '45.5px');
              await expect(text).toHaveCSS('text-align', 'center');
              await expect(body.locator('style[data-mango-mobile]')).toHaveCount(0);
              await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('head > style[data-mango-mobile]')).toHaveCount(1);
            }
            await expect(body.locator('td')).toHaveAttribute('align', 'right');
          } else {
            await expect(email.getByRole('alert')).toContainText('shows no styling');
            await expect(email.getByRole('alert')).toContainText('Style property display is not allowed.');
            await expect(body.locator('[style], [class], [bgcolor], [align], [width], [cellpadding], [cellspacing], [border], [role]')).toHaveCount(0);
            await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('style[data-mango-mobile]')).toHaveCount(0);
            await expect(text).toHaveCSS('display', 'block');
            await expect(text).toHaveCSS('font-size', '16px');
            await expect(text).not.toHaveCSS('color', 'rgb(255, 255, 255)');
            await expect(body.locator('td')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
          }
        }
      }
      // Keep the full phone card in the viewport so Chromium paints its child frame in the capture.
      await page.setViewportSize({width: 390, height: 1600});
      await frame.scrollIntoViewIfNeeded();
      await email.screenshot({path: info.outputPath(`saved-styles-${presentation.name}-390.png`)});
      // Browser proof at the second width; behavioural assertions above run only at 390.
      await page.setViewportSize({width: 1440, height: 1000});
      await email.screenshot({path: info.outputPath(`saved-styles-${presentation.name}-1440.png`)});
      const afterPreview = await readStyled();
      expect(afterPreview.revision).toEqual(checkedStyle.revision);
      expect(afterPreview.campaign).toEqual(checkedStyle.campaign);
      expect(afterPreview.campaign).toMatchObject({state: 'draft', activeRevisionId: styled.revisionId});
      expect(await authority()).toEqual(authorityBefore);
    }
  } finally { await site.runtime.close(); await edge.close(); }
};

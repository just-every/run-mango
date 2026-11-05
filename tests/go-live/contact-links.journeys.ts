import {sourceApiEdge,sourceHosts} from './source-api-edge';
import {sourceApiJourney} from './source-api-journey';
import {sourceCsvJourney} from './source-csv-journey';
import {domainJourney} from './domain-journey';
import { test, expect } from '@playwright/test';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve, dispatch } from './harness';
import { openPage, reloadPage } from '../support/navigation';

test('[DELIV-002][MSG-013][RESULT-005] contact links survive authoring, exact approval and delivery without tracking', async ({page}, info) => {
  const source=sourceApiEdge(),edge = await providerEdge({incumbent:source.handle}), site = await installation(edge, eventSigner(),{networkHosts:sourceHosts});
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method:'PUT', cookie, body:sender}), 200);
    await site.control('/_golive/sender-evidence');
    await sourceCsvJourney(site,page,info,cookie);
    const sendsBeforeSources=edge.sends.length;await sourceApiJourney(site,page,info,cookie);expect(edge.sends).toHaveLength(sendsBeforeSources);
    source.setForeignNext(true);expect((await site.call('/api/audience/import-source',{method:'POST',cookie,body:{provider:'klaviyo',endpoint:'https://a.klaviyo.com',key:'synthetic-mango-121-key'}})).status).toBe(422);source.setForeignNext(false);
    await confirmedContact(site, edge, cookie, 'iris@example.test', 'Iris');
    const clock = await site.control('/_golive/clock', {hold:true});
    const due = new Date(clock.now + 3600000);
    // The source-import acceptance continues through the existing approved
    // campaign and real mail-edge handoff, rather than ending at a profile row.
    const importedReader='synthetic-mango-110-active@example.test';
    expect((await site.rows("SELECT c.email_status FROM contacts c JOIN incumbent_consent_links l ON l.contact_id=c.id JOIN consent_attestations a ON a.id=l.attestation_id WHERE c.email='synthetic-mango-110-active@example.test' AND a.revoked_at IS NULL"))[0].email_status).toBe('subscribed');
    const campaign = await draftCampaign(site, cookie, 'Ask the garden team', [importedReader], due);
    const importedReview=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);expect(importedReview.eligibleCount).toBe(1);expect(importedReview.incumbentHeldCount).toBe(1);
    await page.context().addCookies([{name:cookie.split('=')[0], value:cookie.split('=')[1], url:site.runtime.url}]);
    const path = `/api/campaign-revisions/${campaign.revisionId}`;
    // The same public save/check/approve doors judge authored HTML, not only the link tool.
    for (const destination of ['mailto:a@x.example,b@x.example', 'mailto:a@x.example?bcc=c@x.example', 'mailto:a@x.example?subject=%0d%0aBcc%3Ac@x.example', 'tel:call-me', 'javascript:alert(1)', 'http://myshop.example']) {
      await json(await site.call(path, {method:'PATCH', cookie, body:{emailBody:`<p>Questions? <a href="${destination}">Contact us</a></p>`, links:[]}}), 200);
      const checks = await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`, {method:'POST', cookie, body:{revisionId:campaign.revisionId}}), 200);
      expect(checks.checks.some((check:any) => check.blocking && check.status === 'blocked' && check.detail.includes(destination))).toBe(true);
      expect((await site.call(`/api/campaigns/${campaign.campaignId}/approve`, {method:'POST', cookie, body:{revisionId:campaign.revisionId, idempotencyKey:`invalid-${destination}`}})).status).toBe(409);
    }
    await json(await site.call('/api/settings/link-hosts', {method:'PUT', cookie, body:{hosts:'shop.example.test'}}), 200);
    await json(await site.call(path, {method:'PATCH', cookie, body:{emailBody:'<p>Questions about your order?</p>', links:[]}}), 200);
    await page.setViewportSize({width:1440, height:1000});
    await openPage(page, `${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    const tool = page.locator('details.rich-email-link');
    await tool.locator('summary').click();
    const insert = async (kind:string, label:string, destination:string, subject='', body='') => {
      await tool.getByLabel('Link kind').selectOption(kind);
      await tool.getByLabel('Link text', {exact:true}).fill(label);
      await tool.getByLabel(kind === 'web' ? 'Link URL' : kind === 'email' ? 'Email address' : 'Phone number', {exact:true}).fill(destination);
      if (kind === 'email') await tool.getByLabel('Email link subject').fill(subject);
      if (kind === 'email' || kind === 'text') await tool.getByLabel('Link message').fill(body);
      await tool.getByRole('button', {name:'Insert link', exact:true}).click();
    };
    await insert('email', 'Email the garden', 'hello@myshop.example', 'Order question', 'Can you help?');
    await insert('phone', 'Call the garden', '+15555550123');
    await insert('text', 'Text the garden', '+15555550123', '', 'Hi');
    const phoneForms = [
      {label:'US digits', number:'4155550101', encoded:'4155550101'},
      {label:'US separators', number:'(415) 555-0102', encoded:'(415)%20555-0102'},
      {label:'International separators', number:'+1 (415).555-0103', encoded:'+1%20(415).555-0103'},
    ];
    for (const form of phoneForms) {
      await insert('phone', `Call ${form.label}`, form.number);
      await insert('text', `Text ${form.label}`, form.number, '', 'When & where?');
    }
    const web = 'https://shop.example.test/questions';
    await insert('web', 'Garden questions online', web);
    // HTML mode goes through the same save and approval doors with separately
    // authored destinations, including literal and encoded visual separators.
    const authored = [
      {label:'HTML international call', uri:'tel:+14155550104', review:'Phone: +14155550104'},
      {label:'HTML international text', uri:'sms:+14155550104?body=HTML%20question', review:'Text: +14155550104 · Body: HTML question'},
      {label:'HTML US call', uri:'tel:4155550105', review:'Phone: 4155550105'},
      {label:'HTML US text', uri:'sms:4155550105', review:'Text: 4155550105'},
      {label:'HTML separated call', uri:'tel:(415) 555-0106', review:'Phone: (415) 555-0106'},
      {label:'HTML separated text', uri:'sms:(415)%20555-0106?body=HTML%20%26%20question', review:'Text: (415) 555-0106 · Body: HTML & question'},
      {label:'HTML web', uri:'https://shop.example.test/html-questions', review:'https://shop.example.test/html-questions'},
    ];
    await page.getByRole('button', {name:'HTML mode', exact:true}).click();
    const htmlEditor = page.getByRole('textbox', {name:'Email body', exact:true});
    await htmlEditor.fill(await htmlEditor.inputValue() + authored.map(link => `<p><a href="${link.uri.replaceAll('&','&amp;')}">${link.label}</a></p>`).join(''));
    await page.getByRole('button', {name:'Save full draft', exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    const saved = await json(await site.call(`/api/campaigns/${campaign.campaignId}`, {cookie}), 200);
    const links = saved.links.map((link:any) => link.destinationUrl);
    const expectedLinks = ['mailto:hello@myshop.example?subject=Order%20question&body=Can%20you%20help%3F', 'tel:+15555550123', 'sms:+15555550123?body=Hi',
      ...phoneForms.flatMap(form => [`tel:${form.encoded}`, `sms:${form.encoded}?body=When%20%26%20where%3F`]), web, ...authored.map(link => link.uri)];
    expect(links).toEqual(expectedLinks);
    for (const link of links) expect(saved.revision.emailText).toContain(link);
    for (const link of expectedLinks) expect(saved.revision.emailBody).toContain(`href="${link.replaceAll('&','&amp;')}"`);
    await reloadPage(page);
    const reopened = await json(await site.call(`/api/campaigns/${campaign.campaignId}`, {cookie}), 200);
    expect(reopened.links.map((link:any) => link.destinationUrl)).toEqual(expectedLinks);
    expect(reopened.revision.emailBody).toBe(saved.revision.emailBody);
    expect(reopened.revision.emailText).toBe(saved.revision.emailText);
    await page.getByRole('button', {name:'HTML mode', exact:true}).click();
    for (const link of expectedLinks) await expect(page.getByRole('textbox', {name:'Email body', exact:true})).toContainText(`href="${link.replaceAll('&','&amp;')}"`);
    const list = page.locator('.message-preview--links');
    for (const form of phoneForms) {
      await expect(list).toContainText(`Phone: ${form.number}`);
      await expect(list).toContainText(`Text: ${form.number} · Body: When & where?`);
    }
    for (const link of authored) await expect(list).toContainText(link.review);
    await expect(list).toContainText(web);
    expect(await site.count('campaign_approval_requests')).toBe(0);
    expect(await site.count('recipient_steps')).toBe(0);
    for (const width of [1440]) {
      await page.setViewportSize({width, height:1000});
      await reloadPage(page);
      await page.locator('details.rich-email-link summary').click();
      await expect(page.getByLabel('Link kind')).toBeVisible();
      await page.getByLabel('Link kind').selectOption('email');
      await page.getByLabel('Link text', {exact:true}).fill('Ask about an order');
      await page.getByLabel('Email address', {exact:true}).fill('hello@myshop.example');
      await page.getByLabel('Email link subject').fill('Order question');
      await page.getByLabel('Link message').fill('Can you help?');
      await page.locator('.rich-email-fieldset').screenshot({path:info.outputPath(`contact-link-editor-${width}.png`)});
      const list = page.locator('.message-preview--links');
      await expect(list).toContainText('Email: hello@myshop.example · Subject: Order question · Body: Can you help?');
      await expect(list).toContainText('Phone: +15555550123');
      await expect(list).toContainText('Text: +15555550123 · Body: Hi');
      await expect(list).toContainText('No click tracking');
      await list.screenshot({path:info.outputPath(`contact-link-review-${width}.png`)});
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    // Capture the same saved controls and decoded destinations on a phone.
    // Behaviour assertions above run once at desktop width.
    await page.setViewportSize({width:390,height:1000});
    await tool.getByLabel('Link kind').selectOption('phone');
    await tool.getByLabel('Phone number', {exact:true}).fill('(415) 555-0102');
    await page.locator('.rich-email-fieldset').screenshot({path:info.outputPath('contact-link-editor-390.png')});
    await list.screenshot({path:info.outputPath('contact-link-review-390.png')});
    await page.setViewportSize({width:1440,height:1000});
    await approve(site, cookie, campaign);
    await site.control('/_golive/clock', {advanceMs:3600001});
    expect((await dispatch(site, campaign.campaignId, due))[0].transport_disposition).toBe('accepted');
    const sent = edge.sends.findLast(send => send.to === importedReader && send.body.headers?.['List-Unsubscribe'])!;
    const html = sent.body.content.find((part:any) => part.type === 'text/html').value;
    const plain = sent.body.content.find((part:any) => part.type === 'text/plain').value;
    for (const link of links) {
      expect(html).toContain(link.replaceAll('&','&amp;'));
      expect(plain).toContain(link);
    }
    expect(html).not.toContain('/l/');
    expect(await site.count('tracked_links')).toBe(0);
    expect(await site.count('link_click_facts')).toBe(0);
    await domainJourney(site, edge, cookie, page, info);
  } finally {await site.runtime.close(); await edge.close();}
});

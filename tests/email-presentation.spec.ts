import { expect, type Page } from '@playwright/test';
import { test } from './support/database-fixture';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { managedFooter, normalizeAuthoredContent } from '../src/core/features/campaigns/authoring-content';
import { inspectEmailHtml } from '../src/core/features/campaigns/email-html-policy';
import { renderMessageContent } from '../src/core/features/campaigns/message-content';
import { prepareDeliveryRequest } from '../src/core/features/lifecycle/message-renderer';
import type { LifecycleRuntime } from '../src/core/features/lifecycle/types';
import { refusedAsWritten, rejectedPresentation } from './support/adversarial-email.mjs';

const require = createRequire(import.meta.url);
const {build} = createRequire(require.resolve('wrangler'))('esbuild');

// A real compiled design (12ui LayerDoc → 600px table email), re-hosted on the test shop host.
const designed = readFileSync(new URL('./support/designed-email.html', import.meta.url), 'utf8').trim();
const offer = 'https://shop.example.test/season';
const image = '<img src="https://shop.example.test/offer.png" width="200" height="100" alt="Offer"';

test('[MSG-009] a designed email is admissible and delivery transmits its authored markup unchanged', async ({database}) => {
  expect(inspectEmailHtml(designed).issues).toEqual([]);
  // Hand-written presentation within the tightened grammar: light text on a dark cell, a rounded button whose padding
  // keeps its text out of the corners, right-to-left text in a cell, columns as cells, a fluid table and image, and an
  // outer wrapper div whose text also reads on white.
  for (const html of [
    '<div lang="en" dir="ltr" style="background-color:#f9f7f1;padding:16px 0"><p style="color:#345440;line-height:24px">Letter from the orchard</p></div>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#1f2a24" style="background-color:#1f2a24;color:#f4f1e8;padding:24px"><h1 style="font-size:32px;margin:0">Autumn letter</h1><p>Fresh from the orchard.</p></td></tr></table>',
    `<table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#314e36" style="background-color:#314e36;border-radius:24px;padding:14px 32px"><a href="${offer}" style="color:#faf8ed;text-decoration:none">Shop the season</a></td></tr></table>`,
    '<table role="presentation" width="100%"><tr><td dir="rtl" style="text-align:right;color:#222222">مرحبا بكم في رسالتنا</td></tr></table>',
    `<table role="presentation" width="100%" style="max-width:600px"><tr><td width="290" valign="middle">${image} style="width:100%;height:auto;vertical-align:bottom"></td><td width="20"></td><td width="290" valign="middle"><p style="font-family:Georgia, serif;font-size:18px;line-height:1.4;color:#345440">Harvest time is near.</p></td></tr></table>`,
  ]) expect(inspectEmailHtml(html + managedFooter).issues, html).toEqual([]);
  const revision = {
    id: 'designed', campaignId: 'campaign', emailSubject: 'Good things', preheader: 'Harvest news', emailBody: designed,
    emailText: `Explore the Season (${offer})\n{{physical_address}}\nUnsubscribe ({{unsubscribe_url}})`, smsBody: '', physicalAddress: '1 Orchard Road',
    senderName: 'Orchard', fromEmail: 'news@example.test', replyToEmail: 'help@example.test', trackingEnabled: false,
  };
  const runtime = {
    platform: {database, config: {publicBaseUrl: new URL('https://mango.example.test')}},
    audience: {async issueMarketingUnsubscribe() { return {token: 'synthetic-unsubscribe-token'}; }},
  } as unknown as LifecycleRuntime;
  const envelope = {
    recipient: {id: 'recipient', contactId: 'contact', channel: 'email', idempotencyKey: 'handoff:recipient', sendByAt: new Date('2026-10-14T00:00:00.000Z')},
    revision, links: [{label: 'Explore the Season', destinationUrl: offer}],
  } as unknown as Parameters<typeof prepareDeliveryRequest>[1];
  const eligibility = {eligible: true as const, contact: {contactId: 'contact', destination: 'ada@example.test', personalisation: {}}};
  const {request} = await prepareDeliveryRequest(runtime, envelope, eligibility, new Date('2026-10-13T00:00:00.000Z'));
  const expected = renderMessageContent(revision, {unsubscribeUrl: 'https://mango.example.test/unsubscribe/synthetic-unsubscribe-token'});
  expect(request.content).toMatchObject({html: expected.html});
  const [before, after] = designed.split('{{unsubscribe_url}}');
  expect(request.content.html).toContain(before.split('{{physical_address}}')[0]);
  expect(request.content.html).toContain(after.split('{{physical_address}}')[0]);
});

test('[MSG-009] markup valid under the earlier grammar stays admissible, including loosely nested markup', () => {
  for (const html of [
    `<h2>News</h2><p><strong>Offer</strong> <a href="${offer}">Read</a></p><ul><li>One</li></ul><table><tr><td colspan="2">Cell</td></tr></table>${image}>`,
    '<p>One<p>Two<ul><li>a<li>b</ul><table><tr><td>Cell</table><div><span>Open</div>',
    '<p>Price < p> list, as it was written</p>',
  ]) expect(inspectEmailHtml(html).issues).toEqual([]);
  // Text that runs past the email column lands on the page it is read on: long addresses, personalised and other
  // languages' headings, a wide image's caption and pasted right-to-left names stay approvable, and deliverable.
  for (const html of [
    '<h1>Hello {{first_name|fallback:"friend"}}!</h1><p>Our spring range is here.</p>',
    '<p>Questions? Write to customer.service.department@shop.example.test</p>',
    '<h1>Достопримечательности</h1><h2>Qualitätssicherungsmaßnahmen</h2>',
    '<ul><li><blockquote>Read https://shop.example.test/blog/2026/10/announcing-our-spring-collection-in-full</blockquote></li></ul>',
    `<table><tr><td>${image.replace('width="200"', 'width="640"')}></td></tr><tr><td>Caption text</td></tr></table>`,
    '<p>Thanks to \u2068Ada Lovelace\u2069 for the photos.</p>',
  ]) expect(inspectEmailHtml(html + managedFooter).issues, html).toEqual([]);
});

test('[MSG-012][MSG-009] approval rejects every hidden, deceptive or remote-loading presentation, as written and as saved', () => {
  for (const [name, html] of rejectedPresentation) {
    expect.soft(inspectEmailHtml(html).issues.length, `${name}: ${html}`).toBeGreaterThan(0);
    expect.soft(inspectEmailHtml(normalizeAuthoredContent({emailBody: html}).emailBody!).issues.length, `${name} (saved): ${html}`).toBeGreaterThan(0);
  }
});

// Every text run with its colour and the first background painted behind it, as Chromium lays the body out
// without a doctype (quirks mode, as many mail clients render email) or with one (standards mode).
async function rendering(page: Page, html: string, doctype: boolean) {
  await page.setContent(`${doctype ? '<!doctype html>' : ''}<html><body style="background-color:#ffffff">${html}</body></html>`);
  return page.evaluate(() => {
    const runs: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!node.textContent?.trim()) continue;
      let box = node.parentElement!, background = 'rgba(0, 0, 0, 0)';
      for (let at: Element | null = box; at && background === 'rgba(0, 0, 0, 0)'; at = at.parentElement) background = getComputedStyle(at).backgroundColor;
      runs.push(`${node.textContent.trim()}: ${getComputedStyle(box).color} on ${background}`);
    }
    return runs;
  });
}

test('[MSG-012][CAMP-003] markup mail clients read differently from how it is written is refused as written and saved as they read it', async ({page}) => {
  for (const [name, html] of refusedAsWritten) {
    expect.soft(inspectEmailHtml(html).issues.length, `${name}: ${html}`).toBeGreaterThan(0);
    const saved = normalizeAuthoredContent({emailBody: html}).emailBody!;
    expect.soft(await rendering(page, saved, false), name).toEqual(await rendering(page, saved, true));
  }
  // The differential is real: as written, quirks mode paints the claim white on white where standards mode shows it.
  const [, written] = refusedAsWritten.find(([name]) => name.includes('quirks mode'))!;
  expect(await rendering(page, written, false)).not.toEqual(await rendering(page, written, true));
});

// The saved-revision preview, mounted in Chromium from the shipped component.
async function mountPreview(page: Page) {
  const source = `import React,{useState} from 'react';import{createRoot}from'react-dom/client';import{RevisionPreviews}from'./src/core/features/campaigns/ui/revision-previews';
function App(){const[body,setBody]=useState('');(window as any).setBody=setBody;return body?<RevisionPreviews key={body} links={[]} revision={{id:'r',campaignId:'c',version:1,state:'draft',name:'Designed',emailSubject:'Subject',emailBody:body,emailText:'Text',preheader:'Preheader',smsBody:'',senderName:'Orchard',fromEmail:'news@example.test',replyToEmail:'help@example.test',smsSender:'',physicalAddress:'1 Orchard Road',inclusionRuleJson:'{}',exclusionRulesJson:'[]',messageCategory:'news',updatedAt:body} as any}/>:null}
createRoot(document.getElementById('root')!).render(<App/>);`;
  const output = await build({stdin: {contents: source, resolveDir: process.cwd(), sourcefile: 'preview.tsx', loader: 'tsx'}, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', alias: {'@': path.join(process.cwd(), 'src')}, define: {'process.env.NODE_ENV': '"test"'}});
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({content: output.outputFiles[0].text});
  await page.waitForFunction(() => Boolean((window as any).setBody));
  return async (body: string) => {
    await page.evaluate(value => (window as any).setBody(value), body);
    return page.frameLocator('iframe[title="Saved email preview"]');
  };
}

test('[MSG-009][MSG-012][BASE-INPUT-002] preview keeps validated presentation and shows a failing design unstyled', async ({page}) => {
  const show = await mountPreview(page);
  let frame = await show(designed);
  await expect(frame.locator('h1')).toContainText('Good Things');
  await expect(frame.locator('h1')).toHaveCSS('color', 'rgb(52, 84, 64)');
  await expect(frame.locator('td[bgcolor="#314e36"]')).toHaveCSS('background-color', 'rgb(49, 78, 54)');
  await expect(page.getByRole('alert')).toHaveCount(0);
  frame = await show(designed.replace('{{physical_address}}</p>', '{{physical_address}}</p><p style="color:#f9f7f1">salted claim</p>'));
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(frame.locator('body')).toContainText('salted claim');
  await expect(frame.locator('[style],[bgcolor],[role],[cellpadding]')).toHaveCount(0);
  await expect(frame.getByText('salted claim')).toHaveCSS('color', 'rgb(36, 40, 33)');
});

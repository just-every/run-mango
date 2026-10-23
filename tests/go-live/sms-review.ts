import {confirmSmsReply} from './sms-confirm-reply';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { json, rule, availableTransport, consent, type Installation } from './harness';
import { smsDisclosure, smsProgramme, smsSender } from './sms-bindings';
import { openPage } from '../support/navigation';
import type { providerEdge } from './edge';

/** MSG-005: review renders each SMS example with the programme identity, STOP text, frequency and exact segment count. */
export async function smsReviewJourney(site: Installation, edge: Awaited<ReturnType<typeof providerEdge>>, owner: string, page: Page, info: TestInfo, now: number) {
  const policy = smsProgramme(), disclosure = JSON.parse(smsDisclosure());
  await availableTransport(site);
  // Marketing texts follow the programme's quiet hours; review runs at Brisbane noon whatever the real hour.
  const before = await site.control('/_golive/clock');
  const clock = await site.control('/_golive/clock', {advanceMs:(43_200_000 - ((before.now + 36_000_000) % 86_400_000) + 86_400_000) % 86_400_000, hold:true});
  now = clock.now;
  await json(await site.call('/api/contacts/consent', {method:'POST', cookie:owner, body:{
    ...consent,permissionMethod:'in-person',affirmed:true,expressWrittenConsent:true, channel:'sms', smsProgram:policy.programme, brandOrLegalSender:policy.brand, messageCategory:policy.category, frequencyDisclosure:policy.frequency,
    destinationJurisdiction:policy.jurisdiction, consentText:disclosure.text, consentVersion:disclosure.version, captureSource:'Market stall text sign-up',
    timeZone:'Australia/Brisbane', locationSource:'operator-entry', locationRecordedAt:new Date(clock.now).toISOString(),
    contact:{email:'sms-reader@example.test', phone:'+61411111111', displayName:'SMS reader'}, occurredAt:new Date(clock.now).toISOString()}}), 201);
  await site.control('/_golive/cron');
  await expect.poll(async () => edge.sms.sends.length || JSON.stringify(await site.rows('SELECT purpose,state,reason FROM sms_service_messages')), {timeout:60000, intervals:[1000]}).toBe(1);
  await confirmSmsReply(site,edge);
  const { campaignId, revisionId } = await json(await site.call('/api/campaigns', {method:'POST', cookie:owner, body:{}}), 201);
  const at = new Date(now + 7200000);
  const smsBody = 'Seedlings are in at the Saturday market. Bring a pot.';
  await json(await site.call(`/api/campaign-revisions/${revisionId}`, {method:'PATCH', cookie:owner, body:{
    name:'Market text', smsBody, smsSender, audienceRule:'Named contacts', inclusionRuleJson:rule(['sms-reader@example.test']), exclusionRulesJson:'[]', messageCategory:policy.category,
    steps:[{channel:'sms', timezone:'Australia/Brisbane', scheduledAt:at.toISOString(), sendByAt:new Date(at.getTime() + 2 * 3600_000).toISOString(), whyThisTime:'Owner chose this time'}]}}), 200);
  await json(await site.call(`/api/campaigns/${campaignId}/checks`, {method:'POST', cookie:owner, body:{revisionId}}), 200);
  const detail = await json(await site.call(`/api/campaigns/${campaignId}/review`, {cookie:owner}), 200);
  const [example] = detail.smsPreview.examples;
  expect(example.destination).toContain('61411111111');
  for (const part of [smsBody, `${policy.brand} | ${policy.programme}`, policy.frequency, `Sender ${smsSender}`, 'Reply STOP to unsubscribe.', policy.support]) expect(example.text).toContain(part);
  expect(example.segments).toBeGreaterThanOrEqual(1);
  await page.context().clearCookies();
  await page.context().addCookies([{name:owner.split('=')[0], value:owner.split('=')[1], url:site.runtime.url}]);
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:1000});
    await openPage(page, `${site.runtime.url}/app/campaigns/${campaignId}/review`);
    const preview = page.locator('.preview-plain-text').filter({hasText:'Reply STOP to unsubscribe.'}).first();
    await expect(preview).toContainText(`${policy.brand} | ${policy.programme}`);
    await expect(preview).toContainText(policy.frequency);
    await expect(page.getByText(`${example.segments} SMS segments`)).toBeVisible();
    await preview.locator('xpath=..').screenshot({path:info.outputPath(`sms-review-${width}.png`)});
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
}

import { expect, test } from '@playwright/test';
import { runApprovalChecks } from '../src/core/features/lifecycle/checks';
import type { LifecycleRepository } from '../src/core/features/lifecycle/repository';
import type { CampaignRevisionSnapshot, LifecyclePlatform } from '../src/core/features/lifecycle/types';
import { fixture } from './sender-verification/fixture';

let senderRuntime: Awaited<ReturnType<typeof fixture>>;
test.beforeAll(async () => { senderRuntime = await fixture(false); });
test.afterAll(async () => { await senderRuntime?.dispose(); });

const offer = 'https://shop.example.test/offer';
const other = 'https://shop.example.test/other';
const address = '<p>{{physical_address}}</p>';
const unsubscribe = '<a href="{{unsubscribe_url}}">Unsubscribe</a>';
const now = new Date('2026-10-02T02:00:00.000Z');
function snapshot(html = `<p><a href="${offer}">Read offer</a></p>${address}${unsubscribe}`, text = `Read offer ${offer}\n{{physical_address}}\nUnsubscribe {{unsubscribe_url}}`, destinations = [offer]): CampaignRevisionSnapshot {
  return {
    campaign: {id: 'campaign', state: 'draft', activeRevisionId: null, updatedAt: now},
    revision: {
      id: 'revision', campaignId: 'campaign', state: 'draft', version: 1, name: 'Offer', audienceRule: 'Customer source',
      inclusionRuleJson: JSON.stringify({version: 1, operator: 'all', predicates: [{sourceType: 'customer', field: 'state', comparator: 'eq', value: 'observed'}]}),
      exclusionRulesJson: '[]', sourceTypesJson: '["customer"]', emailSubject: 'Reviewed offer', preheader: 'Read this offer',
      emailBody: html, emailText: text, smsBody: '', senderName: 'Mango', fromEmail: 'offers@example.test', replyToEmail: 'help@example.test', smsSender: '',
      physicalAddress: '5 Main Street', messageCategory: 'offers', trackingEnabled: false, updatedAt: now,
    },
    steps: [{id: 'step', channel: 'email', sequence: 0, timezone: 'Etc/UTC', scheduledAt: now, sendByAt: new Date(now.getTime() + 86400000), whyThisTime: 'Synthetic fixture'}],
    links: destinations.map((destinationUrl, sequence) => ({id: `link-${sequence}`, label: 'Offer', destinationUrl, sequence})),
  };
}
async function check(saved: CampaignRevisionSnapshot) {
  const capabilities = {configured: true, canSendMarketing: true, effectiveDeduplication: true, effectiveReconciliation: true,
    deduplicationWindowMs: 7 * 86400000, reconciliationWindowMs: 7 * 86400000,
    authentication: {spf: true, dkim: true, dmarc: true, aligned: true}, detail: 'Synthetic checks; no providers'};
  const sender = {async inspectSender() {return {ready:true,reason:'authentication-observed',checkedAt:now.getTime(),expiresAt:now.getTime()+300000,
    lease:{id:'test-inspection',stateId:'test-state',generation:1,bindingDigest:'test-binding',configurationDigest:'test-configuration',observationId:'test-observation',expiresAt:now.getTime()+300000},
    authentication:{spf:true,dkim:true,dmarc:true,aligned:true}}},async capabilities() {return capabilities}, async validateSender() {return {ready: true, detail: 'Synthetic validation'}}};
  const platform = {
    database: senderRuntime.platform.database,
    config: {allowedLinkHosts: ['shop.example.test'], unresolvedProviderOutcomeHours: 1, providerReconciliationIntervalMinutes: 1, deliverabilityReportingWindowDays: 30,
      mailSender: {displayName: 'Mango', fromEmail: 'offers@example.test', replyToEmail: 'help@example.test', physicalAddress: '5 Main Street'}},
    mailer: sender, sms: sender,
    linkInspector: {async inspect(url: string) {return {ok: url.startsWith('https://shop.example.test/'), finalUrl: url, detail: 'Synthetic local inspection'}}},
  } as unknown as LifecyclePlatform;
  const repository = {async reputation() {return {delivered: 0, complained: 0, hardBounced: 0, attempted: 0, complaintRate: 0, hardBounceRate: 0}}} as unknown as LifecycleRepository;
  const result = await runApprovalChecks({snapshot: saved, platform, repository, now,
    candidates: [{contactId: 'contact', contactIdentityKey: 'contact', channels: {email: {destination: 'customer@example.test', consents: [{destination: 'customer@example.test', brandOrLegalSender: 'Mango', category: 'offers', jurisdiction: 'email'}]}}}],
  });
  return new Map(result.checks.map(finding => [finding.kind, finding]));
}
function expectBlocked(checks: Awaited<ReturnType<typeof check>>, kind: string) {
  expect(checks.get(kind), kind).toMatchObject({status: 'blocked', blocking: true});
}

test('[MSG-003][MSG-009][CAMP-004] title-only offer and text-only unsubscribe cannot pass approval', async () => {
  const checks = await check(snapshot(`<p title="${offer}">Buy this offer</p>${address}<p>{{unsubscribe_url}}</p>`));
  expectBlocked(checks, 'message.email-unsubscribe');
  expectBlocked(checks, 'message.multipart-equivalence');
});

test('[MSG-003][MSG-009] visible managed unsubscribe and exact saved HTML/plain destinations pass', async () => {
  const checks = await check(snapshot());
  expect([...checks.values()].filter(item => item.blocking)).toEqual([]);
  expect(checks.get('message.email-unsubscribe')).toMatchObject({status: 'passed', blocking: false});
  expect(checks.get('message.multipart-equivalence')).toMatchObject({status: 'passed', blocking: false});
});

test('[MSG-009] an undeclared HTML link absent from plain text blocks multipart equivalence', async () => {
  const checks = await check(snapshot(`<a href="${offer}">Offer</a><a href="${other}">Another offer</a>${address}${unsubscribe}`));
  expectBlocked(checks, 'message.multipart-equivalence');
});

test('[MSG-009] plain-text destination absent from HTML and saved links blocks multipart equivalence', async () => {
  const checks = await check(snapshot(undefined, `${offer}\n${other}\n{{physical_address}}\n{{unsubscribe_url}}`));
  expectBlocked(checks, 'message.multipart-equivalence');
});

for (const label of ['', '  ', '<br>', '&nbsp;', '&#8203;', '\u200b']) {
  test(`[MSG-003] unsubscribe with nonvisible label ${JSON.stringify(label)} is blocked`, async () => {
    const checks = await check(snapshot(`<a href="${offer}">Offer</a>${address}<a href="{{unsubscribe_url}}">${label}</a>`));
    expectBlocked(checks, 'message.email-unsubscribe');
  });
}
for (const markup of [
  '<a href="{{unsubscribe_url}}"><a href="https://shop.example.test/offer">Unsubscribe</a></a>',
  '<a href="{{unsubscribe_url}}"><div>Unsubscribe</div></a>',
  '<a href="{{unsubscribe_url}}">Unsubscribe',
]) {
  test(`[CAMP-004] structurally unsafe unsubscribe anchor is blocked: ${JSON.stringify(markup)}`, async () => {
    const checks = await check(snapshot(`<a href="${offer}">Offer</a>${address}${markup}`));
    expectBlocked(checks, 'message.content');
  });
}


test('[MSG-003] visible inline formatted unsubscribe label remains valid', async () => {
  const checks = await check(snapshot(`<a href="${offer}">Offer</a>${address}<a href="{{unsubscribe_url}}"><strong>Unsubscribe</strong></a>`));
  expect([...checks.values()].filter(item => item.blocking)).toEqual([]);
});

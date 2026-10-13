import { sqlStatements } from '../operations/sql-statements.mjs';
import {expect, test} from '@playwright/test';
import {createRequire} from 'node:module';
import {readFile, readdir} from 'node:fs/promises';
import {createAppServices} from '../src/core/app/app';
import {createLifecycleServices} from '../src/core/features/lifecycle';
import {createCampaignCompositionRepository} from '../src/core/features/campaigns/composition-repository';
import {syntheticReviewPlatform} from './review/platform';
import {prepareSyntheticReview} from './review/scenario';

const require = createRequire(import.meta.url);
const {Miniflare} = createRequire(require.resolve('wrangler/package.json'))('miniflare');
async function fixture(legacy = false) {
  const worker = new Miniflare({workers: [{config: {name: 'personalisation-review', type: 'worker', compatibilityDate: '2026-09-08',
    manifest: {mainModule: 'worker.js', modules: {'worker.js': {type: 'esm', contents: 'export default {fetch(){return new Response("synthetic")}}'}}}, env: {DB: {type: 'd1', id: crypto.randomUUID()}}}}]});
  const binding: D1Database = await worker.getD1Database('DB');
  const migrate = async (file: string) => binding.batch(sqlStatements((await readFile(`migrations/core/${file}`, 'utf8'))).map(sql => binding.prepare(sql)));
  for (const file of (await readdir('migrations/core')).filter(name => name.endsWith('.sql')).sort()) {
    if (!legacy || Number(file.slice(0, 4)) <= 11) await migrate(file);
  }
  const platform = syntheticReviewPlatform({DB: binding, MANGO_JOBS: {}, ASSETS_BUCKET: {}, LOCAL_BOOTSTRAP_TOKEN: 'personalisation-test'} as never);
  const services = createAppServices(platform);
  const lifecycle = createLifecycleServices(services.lifecycleRuntime);
  return {worker, binding, platform, services, lifecycle, migrate};
}
const personalised = '{{displayName | fallback: "Friend"}}';
async function prepare(f: Awaited<ReturnType<typeof fixture>>) {
  const originalSync = f.platform.commerce.synchronize.bind(f.platform.commerce);
  f.platform.commerce.synchronize = async (type, cursor) => {
    const result = await originalSync(type, cursor);
    if (!cursor) result.records.push({sourceType: 'customer', sourceId: 'blank-name', occurredAt: new Date(), payload: {email: 'blank@example.test', segment: 'synthetic-review', state: 'observed'}});
    return result;
  };
  const identity = await prepareSyntheticReview(f.platform);
  await f.services.audienceService.captureConsent({contact: {email: 'blank@example.test'}, channel: 'email', brandOrLegalSender: 'Synthetic Mango', messageCategory: 'offers',
    frequencyDisclosure: 'Weekly synthetic offers', destinationJurisdiction: 'AU', captureMethod: 'task-fixture', captureSource: 'task-fixture', consentText: 'Synthetic affirmative consent', consentVersion: 'v1', occurredAt: new Date(), confirmationRequired: false});
  // An empty historical name is legal persisted data; handoff maps it directly.
  await f.binding.prepare("UPDATE contacts SET display_name = '' WHERE email IN ('blank@example.test','opted-out@example.test','no-consent@example.test')").run();
  await f.services.campaignService.updateDraft(identity.revisionId, {emailSubject: personalised, preheader: personalised,
    emailBody: `<p>${personalised} ${personalised}</p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>`, emailText: `${personalised} ${personalised} {{physical_address}} Unsubscribe: {{unsubscribe_url}}`});
  await f.binding.prepare(`INSERT INTO campaign_steps (id, revision_id, sequence, channel, timezone, scheduled_at, send_by_at, why_this_time, created_at, updated_at)
    SELECT 'second-email', revision_id, 2, channel, timezone, scheduled_at + 1000, send_by_at + 1000, why_this_time, created_at, updated_at FROM campaign_steps WHERE revision_id = ? LIMIT 1`).bind(identity.revisionId).run();
  const counts = async () => (await createAppServices(f.platform).campaignService.campaignDetail(identity.campaignId))!.audienceChannelCounts;
  return {...identity, counts};
}

test('[MSG-008][AUD-002][CAMP-005] saved D1 review counts actual handoff fallbacks once per eligible contact and freezes winning approval', async () => {
  const f = await fixture();
  try {
    const p = await prepare(f);
    const contacts = await f.services.audienceService.list();
    const blank = contacts.find(value => value.email === 'blank@example.test')!;
    const actual = await f.services.lifecycleRuntime.audience.recheckHandoffEligibility({contactId: blank.id, channel: 'email', sourceTypes: ['customer'], now: new Date()});
    expect(actual).toMatchObject({eligible: true, contact: {personalisation: {displayName: ''}}});
    expect((await f.lifecycle.approval.preview(p)).kind).toBe('preview');
    expect(await p.counts()).toEqual([expect.objectContaining({channel: 'email', eligibleContactCount: 2, fallbackContactCount: 1, recipientStepCount: 4})]);
    const stale = (await f.lifecycle.repository.readRevisionSnapshot(p.campaignId, p.revisionId))!;
    await createCampaignCompositionRepository(f.platform.database).saveDraft(p.revisionId, {emailSubject: 'Changed saved subject'}, stale.revision.updatedAt);
    const edited = (await f.lifecycle.repository.readRevisionSnapshot(p.campaignId, p.revisionId))!;
    expect(edited.revision.updatedAt.getTime()).toBeGreaterThan(stale.revision.updatedAt.getTime());
    expect(await p.counts()).toEqual([]);
    expect((await f.services.campaignService.campaignDetail(p.campaignId))!.checks).toEqual([]);
    expect(await f.lifecycle.repository.saveDraftReview({snapshot: stale, checks: [], now: new Date(), audience: {candidateCount: 99, eligibleCount: 99, exclusions: [], channelCounts: [{channel: 'email', recipientStepCount: 99, eligibleContactCount: 99, fallbackContactCount: 99}]}})).toBe(false);
    expect(await p.counts()).toEqual([]);
    await f.lifecycle.approval.preview(p);
    expect(await p.counts()).toEqual([expect.objectContaining({eligibleContactCount: 2, fallbackContactCount: 1, recipientStepCount: 4})]);
    const losing = (await f.lifecycle.repository.readRevisionSnapshot(p.campaignId, p.revisionId))!;
    const request = {...p, operatorId: 'synthetic-operator', idempotencyKey: 'fallback-winning-approval'};
    const approved = await f.lifecycle.approval.approve(request);
    expect(approved.kind).toBe('approved');
    const frozen = await p.counts();
    await f.binding.prepare("UPDATE contacts SET display_name = 'Now resolved' WHERE id = ?").bind(blank.id).run();
    expect((await f.lifecycle.approval.approve(request)).kind).toBe('approved');
    expect(await f.lifecycle.repository.saveDraftReview({snapshot: losing, checks: [], now: new Date(), audience: {candidateCount: 99, eligibleCount: 99, exclusions: [], channelCounts: [{channel: 'email', recipientStepCount: 99, eligibleContactCount: 99, fallbackContactCount: 99}]}})).toBe(false);
    expect(await p.counts()).toEqual(frozen);
    expect(await f.binding.prepare('SELECT COUNT(*) AS n FROM recipient_steps WHERE revision_id = ?').bind(p.revisionId).first()).toEqual({n: 4});
  } finally {await f.worker.dispose()}
});

test('[MSG-008] channel-specific eligibility counts stay separate in persisted local review', async () => {
  const f = await fixture();
  try {
    const p = await prepare(f);
    await f.services.campaignService.updateDraft(p.revisionId, {smsSender: 'Synthetic SMS', smsBody: 'Synthetic SMS {{smsOnly | fallback: "Guest"}} {{smsOnly | fallback: "Guest"}} Reply STOP to unsubscribe'});
    await f.binding.prepare(`INSERT INTO campaign_steps (id, revision_id, sequence, channel, timezone, scheduled_at, send_by_at, why_this_time, created_at, updated_at)
      SELECT 'sms-step', revision_id, 3, 'sms', timezone, scheduled_at, send_by_at, why_this_time, created_at, updated_at FROM campaign_steps WHERE revision_id = ? LIMIT 1`).bind(p.revisionId).run();
    // Bounded SMS eligibility double: email identity/consent/mapping stay actual.
    // This tests channel aggregation, not real SMS consent or location policy.
    const audience = f.services.lifecycleRuntime.audience;
    const resolve = audience.resolveFrozenCandidates.bind(audience);
    const recheck = audience.recheckHandoffEligibility.bind(audience);
    audience.resolveFrozenCandidates = async input => {
      const result = await resolve({...input, channels: ['email']});
      if (result.status === 'ok') for (const candidate of result.candidates) candidate.channels.sms = {destination: `+6140000000${candidate.channels.email!.destination.startsWith('blank') ? '1' : '2'}`, country: 'AU', timeZone: 'Australia/Brisbane', timeZoneEvidenceAt: new Date(), timeZoneEvidenceSource: 'synthetic-fixture', consents: []};
      return result;
    };
    audience.recheckHandoffEligibility = async input => {
      if (input.channel === 'email') return recheck(input);
      const email = await recheck({...input, channel: 'email'});
      if (!email.eligible) return email;
      const blank = email.contact.personalisation?.displayName === '';
      return {eligible: true, contact: {...email.contact, destination: blank ? '+61400000001' : '+61400000002', personalisation: {smsOnly: ''}}};
    };
    await createLifecycleServices(f.services.lifecycleRuntime).approval.preview(p);
    expect(await p.counts()).toEqual(expect.arrayContaining([
      expect.objectContaining({channel: 'email', eligibleContactCount: 2, fallbackContactCount: 1, recipientStepCount: 4}),
      expect.objectContaining({channel: 'sms', eligibleContactCount: 2, fallbackContactCount: 2, recipientStepCount: 2}),
    ]));
    expect(await p.counts()).toHaveLength(2);
  } finally {await f.worker.dispose()}
});

test('[MSG-008][BASE-DATA-002] prior count rows migrate to unknown usage without changing preserved data', async () => {
  const f = await fixture(true);
  try {
    await f.binding.prepare("INSERT INTO campaign_audience_channel_counts (id, audience_id, channel, recipient_step_count, created_at, updated_at) VALUES ('legacy-count','legacy-audience','email',7,100,200)").run();
    const before = await f.binding.prepare('SELECT * FROM campaign_audience_channel_counts').first();
    await f.migrate('0012_personalisation_usage.sql');
    expect(await f.binding.prepare('SELECT * FROM campaign_audience_channel_counts').first()).toEqual({...before, eligible_contact_count: null, fallback_contact_count: null});
  } finally {await f.worker.dispose()}
});

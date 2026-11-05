import {expect, type Page, type TestInfo} from '@playwright/test';
import {openPage} from '../support/navigation';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {draftCampaign, json, rule, type Installation} from '../go-live/harness';
import {consentEvidence, installation, record, screenshotPath} from './support';
import type {ImportInput} from '../../src/core/features/audience/import-types';

const day = 86400000;

/** Original source facts enter through the same reviewed import as the Import page. */
async function importSource(site: Installation, cookie: string, input: ImportInput) {
  const preview = await json(await site.call('/api/audience/import-preview', {
    method: 'POST', cookie, body: input,
  }), 200);
  let {job} = await json(await site.call('/api/audience/imports', {
    method: 'POST', cookie, body: {fingerprint: preview.fingerprint},
  }), 200);
  while (['queued', 'applying'].includes(job.state)) {
    ({job} = await json(await site.call('/api/audience/imports/' + job.id + '/resume', {
      method: 'POST', cookie, body: {},
    }), 200));
  }
  expect(job.state).toBe('completed');
  return {preview, job};
}

export async function dormancySourceJourney(page: Page, info: TestInfo) {
  const edge = await providerEdge(), signer = eventSigner();
  const site = await installation(edge, signer);
  try {
    const {now} = await site.control('/_golive/clock', {hold: true});
    const cookie = await site.open();
    const ago = (days: number) => new Date(now - days * day).toISOString();
    const address = (n: number) => 'synthetic-mango-' + n + String.fromCharCode(64) + 'example.test';
    // Each date is independent of import time. Old consent cannot mask an order
    // regression, and a recent open cannot rescue an old order or old consent.
    const fixtures = [
      {email: address(1), consentDays: 700, kind: 'order' as const, activityDays: 60, eligible: true},
      {email: address(2), consentDays: 700, kind: 'order' as const, activityDays: 500, eligible: false},
      {email: address(3), consentDays: 40, kind: undefined, activityDays: 0, eligible: true},
      {email: address(4), consentDays: 700, kind: undefined, activityDays: 0, eligible: false},
      {email: address(5), consentDays: 700, kind: 'open' as const, activityDays: 1, eligible: false},
      {email: address(6), consentDays: 700, kind: 'click' as const, activityDays: 70, eligible: true},
    ];
    const history = fixtures.flatMap(f => f.kind ? [{
      email: f.email, kind: f.kind, occurredAt: ago(f.activityDays), data: {order_id: 'synthetic-mango-10'},
    }] : []);
    const input: ImportInput = {
      files: [{name: 'synthetic-mango-11.csv', preset: 'csv-subscribed',
        csv: ['Email Address,OPTIN_TIME,CONFIRM_TIME', ...fixtures.map(f =>
          [f.email, ago(f.consentDays), ago(f.consentDays - 1)].join(','))].join('\n')}],
      consent: consentEvidence,
      sourceExtras: {notes: [], templates: [], segments: [], history},
    };
    const imported = await importSource(site, cookie, input);
    const permissions = async () => ({
      contacts: await site.rows('SELECT id,email,email_status,sms_status FROM contacts ORDER BY id'),
      addresses: await site.rows('SELECT * FROM contact_email_addresses ORDER BY id'),
      consent: await site.rows('SELECT * FROM consent_evidence ORDER BY id'),
      capture: await site.rows('SELECT * FROM consent_capture_metadata ORDER BY id'),
      confirmations: await site.rows('SELECT * FROM consent_confirmations ORDER BY id'),
      suppressions: await site.rows('SELECT * FROM contact_suppressions ORDER BY id'),
      optOuts: await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id'),
    });
    const before = await permissions();
    expect(before.contacts).toHaveLength(fixtures.length);
    for (const f of fixtures) {
      const contact = before.contacts.find(c => c.email === f.email)!;
      expect(contact).toMatchObject({email_status: 'subscribed', sms_status: 'non-subscribed'});
      const detail = await json(await site.call('/api/contacts/' + contact.id, {cookie}), 200);
      expect(detail.consent).toHaveLength(1);
      expect(detail.consent[0]).toMatchObject({
        channel: 'email', destination: f.email, occurredAt: ago(f.consentDays),
        confirmedAt: ago(f.consentDays - 1), ...consentEvidence,
      });
      const sourceFacts = detail.history.filter((h: any) => h.kind.startsWith('incumbent-'));
      expect(sourceFacts.map((h: any) => [h.kind, h.occurredAt])).toEqual(
        f.kind ? [['incumbent-' + f.kind, ago(f.activityDays)]] : []);
      const stored = before.consent.filter(c => c.contact_id === contact.id);
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        occurred_at: now - f.consentDays * day,
        confirmed_at: now - (f.consentDays - 1) * day,
        created_at: now,
      });
    }
    expect(await site.rows("SELECT kind,occurred_at,created_at FROM contact_history WHERE kind IN ('incumbent-order','incumbent-click','incumbent-open') ORDER BY occurred_at"))
      .toEqual([...history].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).map(h => ({
        kind: 'incumbent-' + h.kind, occurred_at: Date.parse(h.occurredAt), created_at: now,
      })));
    const campaign = await draftCampaign(site, cookie, 'Original source dormancy',
      fixtures.map(f => f.email), new Date(now + 3600000));
    const checks = () => site.call('/api/campaigns/' + campaign.campaignId + '/checks', {
      method: 'POST', cookie, body: {revisionId: campaign.revisionId},
    }).then(r => json(r, 200));
    const setWindow = async (windowDays: number) => json(await site.call(
      '/api/campaigns/' + campaign.campaignId + '/dormancy', {
        method: 'PUT', cookie, body: {revisionId: campaign.revisionId,
          policy: {enabled: true, windowDays, includeOpenOnly: false}},
      }), 200);
    // Intersect the actual review with each independently known identity. Equal
    // aggregate totals alone would miss a recent and an old contact swapping places.
    await setWindow(90);
    const observed: Array<{email: string; eligible: number; exclusions: unknown}> = [];
    for (const f of fixtures) {
      await json(await site.call('/api/campaign-revisions/' + campaign.revisionId, {
        method: 'PATCH', cookie, body: {inclusionRuleJson: rule([f.email])},
      }), 200);
      const review = await checks();
      expect(review).toMatchObject({candidateCount: 1, eligibleCount: Number(f.eligible)});
      expect(review.exclusions).toEqual(f.eligible ? [] : [{reason: 'dormant', count: 1}]);
      observed.push({email: f.email, eligible: review.eligibleCount, exclusions: review.exclusions});
    }
    await json(await site.call('/api/campaign-revisions/' + campaign.revisionId, {
      method: 'PATCH', cookie, body: {inclusionRuleJson: rule(fixtures.map(f => f.email))},
    }), 200);
    expect(await checks()).toMatchObject({candidateCount: 6, eligibleCount: 3,
      exclusions: [{reason: 'dormant', count: 3}]});
    await setWindow(30);
    expect(await checks()).toMatchObject({candidateCount: 6, eligibleCount: 0,
      exclusions: [{reason: 'dormant', count: 6}]});
    await setWindow(365);
    expect(await checks()).toMatchObject({candidateCount: 6, eligibleCount: 3,
      exclusions: [{reason: 'dormant', count: 3}]});
    // Replaying the accepted import cannot refresh activity or rewrite permission.
    const replay = await json(await site.call('/api/audience/imports', {
      method: 'POST', cookie, body: {fingerprint: imported.preview.fingerprint},
    }), 200);
    expect(replay.job.id).toBe(imported.job.id);
    expect(await permissions()).toEqual(before);
    expect(await site.count('campaign_revision_candidates')).toBe(0);
    expect(await site.count('campaign_approval_requests')).toBe(0);
    expect(await site.count('recipient_steps')).toBe(0);
    expect(edge.sends).toEqual([]);
    await page.context().addCookies([{
      name: cookie.split('=')[0], value: cookie.split('=')[1], url: site.runtime.url,
    }]);
    await openPage(page, site.runtime.url + '/app/campaigns/' + campaign.campaignId + '/review');
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 1000});
      await page.screenshot({path: screenshotPath('original-source-review-' + width + '.png',
        info.outputPath('original-source-review-' + width + '.png')), fullPage: true});
    }
    await record('original-source-dormancy.json', {observed, windows: {30: 0, 90: 3, 365: 3},
      originalTimesRetained: true, permissionUnchanged: true});
  } finally {
    await site.runtime.close();
    await edge.close();
  }
}

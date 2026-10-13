import { expect } from '@playwright/test';
import { ownedTables } from '../../src/core/features/audience/import-target';
import { consumeLifecycleQueue } from '../../src/core/features/lifecycle';
import { consent, type native } from './native';
import type { authenticatedRequests } from './request-runtime';

type Harness = Awaited<ReturnType<typeof native>>;
type Http = Awaited<ReturnType<typeof authenticatedRequests>>;
export async function audienceState(h: Harness) {
  return Object.fromEntries(await Promise.all([...ownedTables, 'mango_import_revisions'].map(async table =>
    [table, (await h.f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results])));
}
export async function applyReviewed(http: Http, input: unknown) {
  const preview = await http.json('/api/audience/import-preview', input);
  let { job } = await http.json('/api/audience/imports', { fingerprint: preview.fingerprint });
  for (let attempt = 0; ['queued', 'applying'].includes(job.state); attempt++) {
    expect(attempt).toBeLessThan(50);
    ({ job } = await http.json(`/api/audience/imports/${job.id}/resume`, {}));
  }
  expect(job.state).toBe('completed');
  return { preview, job };
}
export async function undoReviewed(http: Http, id: string) {
  let { job } = await http.json(`/api/audience/imports/${id}/undo`, {});
  for (let attempt = 0; job.state === 'undoing'; attempt++) {
    expect(attempt).toBeLessThan(50);
    ({ job } = await http.json(`/api/audience/imports/${id}/resume`, {}));
  }
  expect(job.state).toBe('undone');
}

/** Freeze a real approval before importing an opt-out, then enter the production
 * queue consumer. Only the fixture's provider/DNS/receiver network edge is fake. */
export async function proveImportedOptOutAtDispatch(h: Harness, http: Http, csv: string) {
  const email = 'late-unsubscribed@example.test';
  await applyReviewed(http, { consent, files: [{ name: 'original-evidence.csv', preset: 'csv-subscribed',
    csv: `Email,OPTIN_TIME,CONFIRM_TIME\n${email},2026-09-01 10:00:00,2026-09-01 10:05:00` }] });
  const now = Date.now();
  const rule = JSON.stringify({ version: 1, operator: 'all', predicates: [{ sourceType: 'contact', field: 'email', comparator: 'eq', value: email }] });
  const composition = {
    name: 'Imported opt-out dispatch', emailSubject: 'Newsletter', preheader: 'A newsletter',
    emailBody: '<p>Newsletter</p>', emailText: 'Newsletter', senderName: 'Mango',
    fromEmail: 'offers@example.test', replyToEmail: 'reply@example.test', physicalAddress: '1 Test Street',
    messageCategory: 'newsletter', inclusionRuleJson: rule, exclusionRulesJson: '[]',
    steps: [{ channel: 'email', timezone: 'UTC', scheduledAt: new Date(now - 1000).toISOString(),
      sendByAt: new Date(now + 3600000).toISOString(), whyThisTime: 'Reviewed newsletter time' }],
  };
  const response = await http.response('/api/campaigns', { composition });
  const campaign = await response.json() as { campaignId: string; revisionId: string };
  expect(response.status, JSON.stringify(campaign)).toBe(201);
  await h.f.prove();
  const approved = await http.json(`/api/campaigns/${campaign.campaignId}/approve`, {
    revisionId: campaign.revisionId, idempotencyKey: 'move-in-opt-out-approval',
  });
  expect(approved.status).toBe('scheduled');
  expect(await h.f.db.prepare('SELECT transport_disposition FROM recipient_steps WHERE campaign_id=?').bind(campaign.campaignId).first())
    .toEqual({ transport_disposition: 'queued' });
  const imported = await applyReviewed(http, { files: [{ name: 'late-opt-out.csv', preset: 'csv-unsubscribed', csv }] });
  expect(imported.preview.counts).toMatchObject({ created: 0, updated: 1, rejected: 0, unsubscribed: 1, suppressed: 0 });
  const reviewResponse = await http.response('/api/campaigns', { composition });
  expect(reviewResponse.status).toBe(201);
  const reviewDraft = await reviewResponse.json() as { campaignId: string; revisionId: string };
  const checks = await http.json(`/api/campaigns/${reviewDraft.campaignId}/checks`, { revisionId: reviewDraft.revisionId });
  expect(checks).toMatchObject({ candidateCount: 1, eligibleCount: 0, exclusions: [{ reason: 'email-unsubscribed', count: 1 }] });
  const review = await http.json(`/api/campaigns/${reviewDraft.campaignId}/review`);
  expect(review.audience).toMatchObject({ candidateCount: 1, eligibleCount: 0 });
  expect(JSON.stringify(review.audience)).toContain('email-unsubscribed');
  const beforeSend = h.f.outbound.length;
  let acknowledged = 0, retried = 0;
  const command = h.f.jobs.find((job: any) => job.kind === 'campaign.dispatch') as any;
  expect(command).toBeTruthy();
  await consumeLifecycleQueue({ messages: [{ body: command, ack() { acknowledged++; }, retry() { retried++; } }] }, h.f.services.lifecycleRuntime);
  expect({ acknowledged, retried }).toEqual({ acknowledged: 1, retried: 0 });
  expect(h.f.outbound).toHaveLength(beforeSend);
  expect(await h.f.db.prepare('SELECT transport_disposition,skip_reason,outbound_request_json,handed_off_at,provider_message_id FROM recipient_steps WHERE campaign_id=?').bind(campaign.campaignId).first())
    .toEqual({ transport_disposition: 'skipped', skip_reason: 'channel-not-subscribed', outbound_request_json: null, handed_off_at: null, provider_message_id: null });
  expect(await h.f.db.prepare("SELECT count(*) AS count FROM sender_verification_associations WHERE kind='handoff'").first()).toEqual({ count: 0 });
  console.log('Move-in dispatch: imported opt-out excluded; zero provider handoffs.');
}

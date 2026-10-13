import { createAudienceRepository } from '../../src/core/features/audience/repository';
import { createLifecycleServices } from '../../src/core/features/lifecycle';
import { sql } from 'drizzle-orm';
import { createAppServices } from '../../src/core/app/app';
import type { Platform } from '../../src/core/shared/platform';
export async function prepareSyntheticReview(platform: Platform, campaignId = 'synthetic-review') {
  if (!/^synthetic-review(?:-[a-z0-9-]{1,60})?$/.test(campaignId)) throw new Error('Invalid synthetic scenario identity');
  const revisionId = `${campaignId}-v1`;
  const stepId = `${campaignId}-email`;
  const audienceId = `${campaignId}-audience`;
  const channelCountId = `${campaignId}-email-count`;
  const {audienceService, lifecycleRuntime, database} = createAppServices(platform);
  const existingSource = await database.$client.prepare("SELECT id FROM source_sync_runs WHERE provider = 'task-synthetic' AND source_type = 'customer' LIMIT 1").first();
  if (!existingSource) await lifecycleRuntime.synchronizeCommerce!({sourceType: 'customer', provider: 'task-synthetic'});
  for (const name of ['subscribed', 'opted-out']) {
    const existing = await createAudienceRepository(database).getConsent(`review-consent-v2-${name}`);
    await audienceService.captureConsent({
      idempotencyKey: `review-consent-v2-${name}`, contact: {email: `${name}@example.test`, displayName: `Synthetic ${name}`},
      channel: 'email', brandOrLegalSender: 'Synthetic Mango', messageCategory: 'offers', destinationJurisdiction: 'AU',
      frequencyDisclosure: 'Weekly synthetic offers', captureMethod: 'task-fixture', captureSource: 'synthetic-review',
      consentText: 'Synthetic affirmative consent for local approval testing only.', consentVersion: 'review-v1',
      occurredAt: existing?.occurredAt ?? new Date(), confirmationRequired: false,
    });
  }
  await audienceService.recordChannelOptOut({channel: 'email', destination: 'opted-out@example.test', occurredAt: new Date(), reason: 'synthetic-review-opt-out'});
  const now = Date.now();
  const rule = JSON.stringify({version: 1, operator: 'all', predicates: [{sourceType: 'customer', field: 'segment', comparator: 'eq', value: 'synthetic-review'}]});
  await database.run(sql`INSERT OR IGNORE INTO campaigns (id, state, created_at, updated_at) VALUES (${campaignId}, 'draft', ${now}, ${now})`);
  await database.run(sql`UPDATE campaigns SET active_revision_id = ${revisionId} WHERE id = ${campaignId} AND active_revision_id IS NULL`);
  await database.run(sql`INSERT OR IGNORE INTO campaign_revisions (id, campaign_id, version, state, name, email_subject, email_body, email_text, preheader, sms_body, sender_name, from_email, reply_to_email, physical_address, message_category, audience_rule, inclusion_rule_json, exclusion_rules_json, created_at, updated_at)
    VALUES (${revisionId}, ${campaignId}, 1, 'draft', 'Synthetic review — sends disabled', 'A local approval exercise', '<p>Synthetic offer</p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>', 'Synthetic offer. {{physical_address}} Unsubscribe: {{unsubscribe_url}}', 'Local synthetic approval', '', 'Synthetic Mango', 'offers@example.test', 'support@example.test', '1 Synthetic Street', 'offers', 'Synthetic review customers', ${rule}, '[]', ${now}, ${now})`);
  await database.run(sql`INSERT OR IGNORE INTO campaign_steps (id, revision_id, sequence, channel, timezone, scheduled_at, send_by_at, created_at, updated_at) VALUES (${stepId}, ${revisionId}, 1, 'email', 'Etc/UTC', ${now + 3600000}, ${now + 7200000}, ${now}, ${now})`);
  await database.run(sql`UPDATE campaign_steps SET why_this_time = 'One hour after this local fixture was created; no forecast or store recommendation.' WHERE id = ${stepId} AND why_this_time = '' AND EXISTS (SELECT 1 FROM campaign_revisions WHERE id = ${revisionId} AND state = 'draft')`);
  await createLifecycleServices(lifecycleRuntime).approval.preview({campaignId, revisionId});
  return {campaignId, revisionId, review: `/app/campaigns/${campaignId}/review`};
}

export async function prepareSuppressionReview(platform: Platform) {
  const {audienceService, database} = createAppServices(platform);
  const repository = createAudienceRepository(database);
  const consentId = 'task-synthetic-suppression-review-consent';
  const previous = await repository.getConsent(consentId);
  const occurredAt = previous?.occurredAt ?? new Date();
  const {contact} = await audienceService.captureConsent({
    idempotencyKey: consentId, contact: {email: 'provider-blocked@example.test', displayName: 'Synthetic provider suppression'}, channel: 'email',
    brandOrLegalSender: 'Synthetic Mango', messageCategory: 'offers', frequencyDisclosure: 'Weekly synthetic offers', destinationJurisdiction: 'AU',
    captureMethod: 'task-fixture', captureSource: 'synthetic-review', consentText: 'Synthetic affirmative consent; no provider hand-off.',
    consentVersion: 'review-v1', occurredAt, confirmationRequired: false,
  });
  await audienceService.recordProviderSuppression({destination: 'provider-blocked@example.test', channel: 'email',
    cause: 'Task-owned synthetic provider suppression; no real provider event or send.', occurredAt: new Date(occurredAt.getTime() + 1), providerEventId: 'task-synthetic-suppression-review'});
  return {review: `/app/audience/${contact.id}`};
}

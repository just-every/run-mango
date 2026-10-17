import type { createAudienceService } from '@/core/features/audience/service';
import type { Platform } from '@/core/shared/platform';
import { sha256, stableJson } from '@/core/shared/ids';
import { createCredentialStore, createIntegrationAudit } from './credentials';
import { createIntegrationContacts } from './contacts';
import { IntegrationError } from './schema';

export function createIntegrationService(platform: Platform, audience: ReturnType<typeof createAudienceService>) {
  const db = platform.database.$client;
  const contacts = createIntegrationContacts(db, audience, platform.config.contactHashSalt);
  return {
    credentials: createCredentialStore(db), audit: createIntegrationAudit(db), contacts,
    async available() {
      if (await db.prepare("SELECT 1 FROM audience_erasures WHERE state='pending' LIMIT 1").first()) throw new IntegrationError('contact_erasure_in_progress', 503);
    },
    async events(cursor: string, limit: number) {
      const events = (await db.prepare(`SELECT e.id,e.sequence,e.type,e.contact_id AS contactId,e.channel,CASE WHEN e.channel='email' THEN e.destination ELSE NULL END AS email,e.cause,e.occurred_at AS occurredAt
        FROM integration_events e WHERE e.sequence>? ORDER BY e.sequence LIMIT ?`)
        .bind(Number(cursor), limit).all<{sequence: number}>()).results;
      return {events, nextCursor: String(events.at(-1)?.sequence ?? cursor)};
    },
    async suppress(credentialId: string, input: {email: string; reason: string; idempotencyKey: string; occurredAt?: string}) {
      const providerEventId = `integration:${credentialId}:${await sha256(input.idempotencyKey)}`;
      const prior = await db.prepare('SELECT occurred_at AS at,destination_hash AS hash,cause FROM contact_suppressions WHERE provider_event_id=?').bind(providerEventId).first<{at: number; hash: string; cause: string}>();
      const source = await db.prepare('SELECT email,cause,occurred_at AS at FROM integration_suppression_sources WHERE provider_event_id=?').bind(providerEventId).first<{email: string; cause: string; at: number}>();
      const occurredAt = input.occurredAt ? Date.parse(input.occurredAt) : prior?.at ?? source?.at ?? Date.now();
      if (occurredAt > Date.now()) throw new IntegrationError('suppression_in_future', 400);
      if (prior && (prior.at !== occurredAt || prior.hash !== await sha256(`${platform.config.contactHashSalt}:${input.email}`) || prior.cause !== input.reason)) throw new IntegrationError('idempotency_conflict', 409);
      // Capture this API's known destination before the existing atomic safety
      // writer fires its ledger trigger. Never reintroduce an erased address.
      await db.prepare(`INSERT INTO integration_suppression_sources(provider_event_id,email,cause,occurred_at,contact_id)
        SELECT ?,?,?,?,(SELECT contact_id FROM contact_email_addresses WHERE email=?)
        WHERE NOT EXISTS(SELECT 1 FROM surviving_opt_outs WHERE destination_hash=? AND reason='erasure-opt-out') ON CONFLICT DO NOTHING`)
        .bind(providerEventId, input.email, input.reason, occurredAt, input.email, await sha256(`${platform.config.contactHashSalt}:${input.email}`)).run();
      const captured = await db.prepare('SELECT email,cause,occurred_at AS at FROM integration_suppression_sources WHERE provider_event_id=?').bind(providerEventId).first<{email: string; cause: string; at: number}>();
      if (captured && (captured.email !== input.email || captured.cause !== input.reason || captured.at !== occurredAt)) throw new IntegrationError('idempotency_conflict', 409);
      const result = await audience.recordProviderSuppression({destination: input.email, channel: 'email', cause: input.reason, occurredAt: new Date(occurredAt), providerEventId});
      return {status: result.kind};
    },
    async send(credentialId: string, campaignId: string, input: {revisionId: string; segmentId: string}) {
      if (platform.config.authMail && platform.config.mailProvider === 'rer') throw new IntegrationError('not available yet', 503);
      await contacts.ownedSegment(credentialId, input.segmentId);
      const revision = await db.prepare(`SELECT r.inclusion_rule_json AS inclusion,r.exclusion_rules_json AS exclusions
        FROM campaign_revisions r JOIN campaigns c ON c.id=r.campaign_id
        WHERE c.id=? AND r.id=? AND c.active_revision_id=r.id AND r.state='approved'
        AND r.approved_at IS NOT NULL AND r.approved_by_operator_id IS NOT NULL AND c.state IN ('scheduled','dispatching')`)
        .bind(campaignId, input.revisionId).first<{inclusion: string; exclusions: string}>();
      if (!revision) throw new IntegrationError('owner_approved_revision_required', 409);
      const segment = await db.prepare('SELECT inclusion_rule_json AS inclusion,exclusion_rules_json AS exclusions FROM audience_segments WHERE id=?').bind(input.segmentId).first<{inclusion: string; exclusions: string}>();
      if (!segment || stableJson(JSON.parse(revision.inclusion)) !== stableJson(JSON.parse(segment.inclusion)) || stableJson(JSON.parse(revision.exclusions)) !== stableJson(JSON.parse(segment.exclusions))) throw new IntegrationError('approved_segment_mismatch', 409);
      const now = Date.now();
      const steps = (await db.prepare('SELECT id,channel,scheduled_at AS scheduledAt FROM campaign_steps WHERE revision_id=? AND scheduled_at<=? AND send_by_at>? ORDER BY sequence')
        .bind(input.revisionId, now, now).all<{id: string; channel: string; scheduledAt: number}>()).results;
      if (!steps.length) throw new IntegrationError('no_approved_step_due', 409);
      // Existing dispatch enforces revision, sender, frozen recipients, opt-out,
      // provider capability and timing again at handoff. This grants no approval.
      for (const step of steps) await platform.jobs.enqueue({kind: 'campaign.dispatch', idempotencyKey: `dispatch:${step.id}:${new Date(step.scheduledAt).toISOString()}`,
        payload: {campaignId, revisionId: input.revisionId, stepId: step.id, channel: step.channel}});
      return {status: 'queued', revisionId: input.revisionId, steps: steps.map(step => step.id)};
    },
  };
}

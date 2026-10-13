import { summarizeAudienceRules } from '@/core/features/campaigns/audience-summary';
import { normalizeAuthoredContent } from '@/core/features/campaigns/authoring-content';
import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';

import { generatedProposalSchema, type GeneratedProposal, type ProposalEvidence } from './generation';

export function createProposalRepository(database: Database) {
  const client = database.$client;
  return {
    async saveGenerated(input: {
      proposalId: string;
      campaignId: string;
      revisionId: string;
      output: GeneratedProposal;
      evidence: ProposalEvidence[];
      now: Date;
      sendByAt: Date;
      generation: { provider: string; model: string; billableUnits: number; reportedCostMicros?: number; currency?: string };
    }) {
      const { now } = input;
      const output = generatedProposalSchema.parse(input.output);
      const audienceRule = summarizeAudienceRules(JSON.stringify(output.audience.inclusion), JSON.stringify(output.audience.exclusions));
      const content=normalizeAuthoredContent({emailBody:output.email?.html??'',links:output.links});
      const sourceTypes = [...new Set([
        ...output.audience.inclusion.predicates.map((item) => item.sourceType),
        ...output.audience.exclusions.map((item) => item.predicate.sourceType),
      ])];
      const statements: D1PreparedStatement[] = [
        client.prepare(
          `INSERT INTO proposals
           (id, state, title, summary, evidence, audience_rule, source_data_as_of, send_by_at, campaign_id,
            trigger_events_json, lookback_start_at, inclusion_rule_json, exclusion_rules_json, generation_error,
            created_at, updated_at)
           VALUES (?, 'proposed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        ).bind(
          input.proposalId, output.title, output.summary.text,
          JSON.stringify(input.evidence.map((item) => ({ key: item.key, sourceRecordId: item.sourceRecordId }))),
          audienceRule,
          Math.max(...input.evidence.map((item) => item.occurredAt.getTime())),
          input.sendByAt.getTime(), input.campaignId,
          JSON.stringify(input.evidence.map((item) => item.sourceRecordId)),
          Math.min(...input.evidence.map((item) => item.occurredAt.getTime())),
          JSON.stringify(output.audience.inclusion), JSON.stringify(output.audience.exclusions),
          now.getTime(), now.getTime(),
        ),
        client.prepare(
          `INSERT INTO campaigns (id, proposal_id, state, active_revision_id, created_at, updated_at)
           VALUES (?, ?, 'draft', ?, ?, ?)`,
        ).bind(input.campaignId, input.proposalId, input.revisionId, now.getTime(), now.getTime()),
        client.prepare(
          `INSERT INTO campaign_revisions
           (id, campaign_id, version, state, name, email_subject, email_body, email_text, preheader, sms_body,
            sender_name, from_email, audience_rule, reply_to_email, sms_sender, physical_address, message_category,
            inclusion_rule_json, exclusion_rules_json, source_types_json, tracking_enabled, created_at, updated_at)
           VALUES (?, ?, 1, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        ).bind(
          input.revisionId, input.campaignId, output.title, output.email?.subject ?? '', content.emailBody!,
          content.emailText!, output.email?.preheader ?? '', output.sms?.body ?? '', output.sender.displayName,
          output.sender.fromEmail, audienceRule, output.sender.replyToEmail, output.sender.smsSender,
          output.sender.physicalAddress, output.messageCategory, JSON.stringify(output.audience.inclusion), JSON.stringify(output.audience.exclusions),
          JSON.stringify(sourceTypes), now.getTime(), now.getTime(),
        ),
      ];
      for (const [index, step] of output.steps.entries()) {
        statements.push(client.prepare(
          `INSERT INTO proposal_steps
           (id, proposal_id, sequence, channel, scheduled_at, timezone, send_by_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(ulid(now.getTime()), input.proposalId, index + 1, step.channel, Date.parse(step.scheduledAt), step.timezone, Date.parse(step.sendByAt), now.getTime(), now.getTime()));
        statements.push(client.prepare(
          `INSERT INTO campaign_steps
           (id, revision_id, sequence, channel, timezone, scheduled_at, send_by_at, why_this_time, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(ulid(now.getTime()), input.revisionId, index + 1, step.channel, step.timezone, Date.parse(step.scheduledAt), Date.parse(step.sendByAt), step.whyThisTime.text, now.getTime(), now.getTime()));
      }
      for (const [index, link] of (content.links ?? []).entries()) {
        statements.push(client.prepare(
          `INSERT INTO campaign_revision_links
           (id, revision_id, sequence, label, destination_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind(ulid(now.getTime()), input.revisionId, index + 1, link.label, link.destinationUrl, now.getTime(), now.getTime()));
      }
      for (const item of input.evidence) {
        statements.push(client.prepare(
          `INSERT INTO proposal_evidence_items
           (id, proposal_id, source_record_id, source_type, claim_key, observed_value_json, occurred_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(ulid(now.getTime()), input.proposalId, item.sourceRecordId, item.sourceType, item.key, JSON.stringify(item.observedValue), item.occurredAt.getTime(), now.getTime()));
      }
      if (output.forecast) {
        statements.push(client.prepare(
          `INSERT INTO proposal_forecasts
           (id, proposal_id, metric, value_minor, method, campaign_ids_json, source_event_ids_json, sample_size, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).bind(
          ulid(now.getTime()), input.proposalId, output.forecast.metric, output.forecast.valueMinor,
          output.forecast.method, JSON.stringify(output.forecast.campaignIds), JSON.stringify(output.forecast.sourceEventIds),
          output.forecast.sampleSize, now.getTime(),
        ));
      }
      statements.push(client.prepare(
        `INSERT INTO external_cost_facts
         (id, campaign_id, provider, operation, model_or_channel, billable_units, reported_cost_micros, currency, occurred_at, created_at)
         VALUES (?, ?, ?, 'ai-proposal-generation', ?, ?, ?, ?, ?, ?)`,
      ).bind(
        ulid(now.getTime()), input.campaignId, input.generation.provider, input.generation.model,
        input.generation.billableUnits, input.generation.reportedCostMicros ?? null, input.generation.currency ?? null,
        now.getTime(), now.getTime(),
      ));
      await client.batch(statements);
    },

    async saveFailure(input: {
      proposalId: string;
      evidence: ProposalEvidence[];
      error: string;
      now: Date;
      sendByAt: Date;
      generation?: { provider: string; model: string; billableUnits: number; reportedCostMicros?: number; currency?: string };
    }) {
      const statements: D1PreparedStatement[] = [client.prepare(
        `INSERT INTO proposals
         (id, state, title, summary, evidence, audience_rule, source_data_as_of, send_by_at,
          trigger_events_json, lookback_start_at, inclusion_rule_json, exclusion_rules_json, generation_error, created_at, updated_at)
         VALUES (?, 'failed', 'Proposal generation failed', '', ?, '', ?, ?, ?, ?, '', '[]', ?, ?, ?)`,
      ).bind(
        input.proposalId, JSON.stringify(input.evidence.map((item) => item.key)),
        Math.max(...input.evidence.map((item) => item.occurredAt.getTime())), input.sendByAt.getTime(),
        JSON.stringify(input.evidence.map((item) => item.sourceRecordId)),
        Math.min(...input.evidence.map((item) => item.occurredAt.getTime())), input.error,
        input.now.getTime(), input.now.getTime(),
      )];
      if (input.generation) {
        statements.push(client.prepare(
          `INSERT INTO external_cost_facts
           (id, proposal_id, provider, operation, model_or_channel, billable_units, reported_cost_micros, currency, occurred_at, created_at)
           VALUES (?, ?, ?, 'ai-proposal-generation-failed', ?, ?, ?, ?, ?, ?)`,
        ).bind(
          ulid(input.now.getTime()), input.proposalId, input.generation.provider, input.generation.model,
          input.generation.billableUnits, input.generation.reportedCostMicros ?? null, input.generation.currency ?? null,
          input.now.getTime(), input.now.getTime(),
        ));
      }
      await client.batch(statements);
    },

    async transition(proposalId: string, toState: 'dismissed' | 'expired', actorId: string, reason: string, now: Date) {
      const statements = [
        client.prepare(
          `UPDATE proposals SET state = ?, updated_at = ? WHERE id = ? AND state = 'proposed'`,
        ).bind(toState, now.getTime(), proposalId),
        client.prepare(
          `INSERT INTO proposal_transitions
           (id, proposal_id, from_state, to_state, actor_id, reason, occurred_at, created_at)
           SELECT ?, ?, 'proposed', ?, ?, ?, ?, ? WHERE changes() = 1`,
        ).bind(ulid(now.getTime()), proposalId, toState, actorId, reason, now.getTime(), now.getTime()),
      ];
      const [updated] = await client.batch(statements);
      return updated.meta.changes === 1;
    },

    async expireDue(now: Date) {
      const due = await client.prepare(
        `SELECT id FROM proposals WHERE state = 'proposed' AND send_by_at <= ?`,
      ).bind(now.getTime()).all<{ id: string }>();
      if (due.results.length === 0) return 0;
      const statements = due.results.flatMap(({ id }) => [
        client.prepare(
          `UPDATE proposals SET state = 'expired', updated_at = ? WHERE id = ? AND state = 'proposed' AND send_by_at <= ?`,
        ).bind(now.getTime(), id, now.getTime()),
        client.prepare(
          `INSERT INTO proposal_transitions
           (id, proposal_id, from_state, to_state, actor_id, reason, occurred_at, created_at)
           SELECT ?, ?, 'proposed', 'expired', 'system:send-by-deadline', 'send-by instant passed', ?, ? WHERE changes() = 1`,
        ).bind(ulid(now.getTime()), id, now.getTime(), now.getTime()),
      ]);
      const results = await client.batch(statements);
      return results.filter((_, index) => index % 2 === 0).reduce((count, result) => count + Number(result.meta.changes), 0);
    },
  };
}

export type ProposalRepository = ReturnType<typeof createProposalRepository>;

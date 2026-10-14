import {completeInclusionRuleSchema,completeExclusionRuleSchema} from '@/core/features/lifecycle/rules';
import { recordExternalCost } from '@/core/features/insights/cost-recording';
import type { AiGenerationResult } from '@/core/shared/platform';
import type { ProposalDecisionContext } from './forecast';
import { summarizeAudienceRules } from '@/core/features/campaigns/audience-summary';
import { normalizeAuthoredContent } from '@/core/features/campaigns/authoring-content';
import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';

import { validateGrounding, type GeneratedProposal, type ProposalEvidence } from './generation';

export function createProposalRepository(database: Database) {
  const client = database.$client;
  return {
    recordGenerationCost(proposalId:string, generation:AiGenerationResult, now:Date, campaignId?:string, outcome = 'reported') {
      return recordExternalCost(database,{key:`ai:${proposalId}`,proposalId,campaignId,outcome,provider:generation.provider,operation:'ai-proposal-generation',modelOrChannel:generation.model,billableUnits:generation.billableUnits,unitKind:generation.unitKind??'tokens',reportedCostMicros:generation.reportedCostMicros,currency:generation.currency,occurredAt:now});
    },
    async saveGenerated(input: {
      actorId?: string;
      decisionContext?: ProposalDecisionContext;
      proposalId: string;
      campaignId: string;
      revisionId: string;
      output: GeneratedProposal;
      evidence: ProposalEvidence[];
      now: Date;
      sendByAt: Date;
      generation: AiGenerationResult;
    }) {
      const { now } = input;
      const output = input.output;
      completeInclusionRuleSchema.parse(output.audience.inclusion);
      for(const rule of output.audience.exclusions)completeExclusionRuleSchema.parse(rule);
      validateGrounding(output,input.evidence);
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
            trigger_events_json, lookback_start_at, inclusion_rule_json, exclusion_rules_json, generation_error, decision_context_json,
            created_at, updated_at)
           VALUES (?, 'proposed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        ).bind(
          input.proposalId, output.title, output.summary.text,
          JSON.stringify(input.evidence.map((item) => ({ key: item.key, sourceRecordId: item.sourceRecordId }))),
          audienceRule,
          Math.max(...input.evidence.map((item) => item.occurredAt.getTime())),
          input.sendByAt.getTime(), input.campaignId,
          JSON.stringify(input.evidence.map((item) => item.sourceRecordId)),
          Math.min(...input.evidence.map((item) => item.occurredAt.getTime())),
          JSON.stringify(output.audience.inclusion), JSON.stringify(output.audience.exclusions),
          JSON.stringify({...input.decisionContext, explanation:output.audience.explanation.text, timing:output.steps.map(step=>step.whyThisTime.text)}),
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
      if (input.decisionContext) {
        const {audience, forecast} = input.decisionContext;
        const audienceId = ulid(now.getTime());
        statements.push(client.prepare(`INSERT INTO proposal_audiences (id,proposal_id,as_of_at,candidate_count,excluded_count,eligible_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).bind(audienceId,input.proposalId,audience.asOf.getTime(),audience.candidateCount,audience.excludedCount,audience.eligibleCount,now.getTime(),now.getTime()));
        for (const channel of audience.channelCounts) statements.push(client.prepare(`INSERT INTO proposal_audience_channel_counts (id,audience_id,channel,recipient_step_count,created_at,updated_at) VALUES (?,?,?,?,?,?)`).bind(ulid(now.getTime()),audienceId,channel.channel,channel.recipientStepCount,now.getTime(),now.getTime()));
        for (const exclusion of audience.exclusions) statements.push(client.prepare(`INSERT INTO proposal_exclusions (id,proposal_id,reason,count,created_at,updated_at) VALUES (?,?,?,?,?,?)`).bind(ulid(now.getTime()),input.proposalId,exclusion.reason,exclusion.count,now.getTime(),now.getTime()));
        statements.push(client.prepare(`INSERT INTO proposal_forecasts (id,proposal_id,metric,value_minor,method,campaign_ids_json,source_event_ids_json,sample_size,created_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(ulid(now.getTime()),input.proposalId,forecast.metric,forecast.valueMinor,forecast.method,JSON.stringify(forecast.campaignIds),JSON.stringify(forecast.sourceEventIds),forecast.sampleSize,now.getTime()));
      }
      statements.push(client.prepare(`INSERT INTO proposal_transitions (id,proposal_id,from_state,to_state,actor_id,reason,occurred_at,created_at) VALUES (?,?,'generating','proposed',?,'grounded-generation',?,?)`).bind(ulid(now.getTime()),input.proposalId,input.actorId ?? 'system:proposal-generation',now.getTime(),now.getTime()));
      statements.push(client.prepare('UPDATE external_cost_facts SET campaign_id=? WHERE id=?').bind(input.campaignId,`ai:${input.proposalId}`));
      await client.batch(statements);
    },

    async saveFailure(input: {
      actorId?: string;
      decisionContext?: ProposalDecisionContext;
      proposalId: string;
      evidence: ProposalEvidence[];
      error: string;
      now: Date;
      sendByAt: Date;
      generation?: AiGenerationResult;
    }) {
      if(input.generation) await recordExternalCost(database,{key:`ai:${input.proposalId}`,proposalId:input.proposalId,provider:input.generation.provider,operation:'ai-proposal-generation',modelOrChannel:input.generation.model,billableUnits:input.generation.billableUnits,unitKind:input.generation.unitKind??'tokens',reportedCostMicros:input.generation.reportedCostMicros,currency:input.generation.currency,occurredAt:input.now});
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
      statements.push(client.prepare(`INSERT INTO proposal_transitions (id,proposal_id,from_state,to_state,actor_id,reason,occurred_at,created_at) VALUES (?,?,'generating','failed',?,?,?,?)`).bind(ulid(input.now.getTime()),input.proposalId,input.actorId ?? 'system:proposal-generation',input.error,input.now.getTime(),input.now.getTime()));
      await client.batch(statements);
    },

    async transition(proposalId: string, toState: 'dismissed', actorId: string, reason: string, now: Date) {
      const statements = [
        client.prepare(
          `UPDATE proposals SET state = ?, updated_at = ? WHERE id = ? AND state = 'proposed' AND send_by_at > ?`,
        ).bind(toState, now.getTime(), proposalId, now.getTime()),
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

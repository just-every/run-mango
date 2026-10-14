import { z } from 'zod';

import type { AiGenerationResult, AiProvider } from '@/core/shared/platform';
import { ulid, stableJson } from '@/core/shared/ids';

import { generatedProposalSchema, generatedProposalWireSchema, validateGrounding, evidenceClaim } from './generation';
import type { ProposalEvidence, GeneratedProposal } from './generation';
import type { ProposalDecisionContext } from './forecast';
import type { ProposalRepository } from './repository';

export function createProposalService(repository: ProposalRepository, ai: AiProvider) {
  return {
    async generate(input: {
      evidence: ProposalEvidence[];
      configuredKnowledge: Array<{ key: string; value: string }>;
      actorId?: string;
      prepare?: (output: GeneratedProposal, now: Date) => Promise<ProposalDecisionContext>;
      sendByAt: Date;
      now?: Date;
    }) {
      if (input.evidence.length === 0) throw new Error('Proposal generation requires deployment-owned evidence.');
      const now = input.now ?? new Date();
      const proposalId = ulid(now.getTime());
      const campaignId = ulid(now.getTime());
      let generation: AiGenerationResult | undefined;
      let outputValidated = false;
      try {
        if(ai.costIdentity) await repository.recordGenerationCost(proposalId,{...ai.costIdentity,output:null,billableUnits:null},now,undefined,'unknown');
        generation = await ai.generateGroundedJson({
          instructions: [
            'Create one Mango campaign proposal using only the supplied deployment evidence and configured knowledge.',
            'The server names the proposal and linked campaign from the source record cited by summary. Do not return a title.',
            'summary, audience.explanation and whyThisTime must copy the supplied allowedClaim text exactly, with its original citation key and observedValueJson string. Multiple observations may be joined with one space. No other explanatory prose is allowed.',
            'Do not use cross-store benchmarks, generic marketing claims, or unsupported copy.',
            'Return exactly the supplied strict JSON schema. forecast must be null: the server computes it. Omit displayRule. Each exclusion reason must be the literal label Matches an exclusion condition; the condition itself supplies its meaning. Timing is an operator-reviewable suggestion based on the cited observation, not a claim of optimality. Use a real IANA timezone and future instants within the supplied deadline.',
          ].join(' '),
          evidence: {
            items: input.evidence.map((item) => ({ ...item, occurredAt: item.occurredAt.toISOString(), observedValueJson:stableJson(item.observedValue), allowedClaim: evidenceClaim(item) })),
            configuredKnowledge: input.configuredKnowledge,
            now: now.toISOString(), sendByAt: input.sendByAt.toISOString(),
          },
          schema: z.toJSONSchema(generatedProposalWireSchema) as Record<string, unknown>,
        });
        await repository.recordGenerationCost(proposalId,generation,now);
        const output = generatedProposalSchema.parse(generation.output);
        validateGrounding(output, input.evidence);
        const completedAt=input.now??new Date();
        for (const step of output.steps) {
          if(/^[+-]/.test(step.timezone))throw new Error('An IANA timezone is required.');
          new Intl.DateTimeFormat('en', {timeZone:step.timezone});
          if (Date.parse(step.scheduledAt) <= completedAt.getTime() || Date.parse(step.sendByAt) <= Date.parse(step.scheduledAt) || Date.parse(step.sendByAt) > input.sendByAt.getTime()) throw new Error('Invalid proposal schedule.');
        }
        const decisionContext = await input.prepare?.(output, now);
        outputValidated = true;
        const revisionId = ulid(now.getTime());
        await repository.saveGenerated({ proposalId, campaignId, revisionId, output, evidence: input.evidence, now, sendByAt: new Date(Math.min(...output.steps.map(step=>Date.parse(step.sendByAt)))), generation, actorId:input.actorId, decisionContext });
        return { kind: 'proposed' as const, proposalId, campaignId, revisionId, provider: generation.provider, model: generation.model,
          cost: { billableUnits: generation.billableUnits, reportedCostMicros: generation.reportedCostMicros ?? null, currency: generation.currency ?? null } };
      } catch (error) {
        const failure = generation
          ? outputValidated
            ? 'proposal_storage_failed'
            : 'invalid_ai_output'
          : error instanceof z.ZodError
            ? 'invalid_ai_output'
            : error instanceof DOMException && error.name === 'TimeoutError'
              ? 'ai_provider_timeout'
              : 'ai_provider_failed';
        await repository.saveFailure({
          proposalId, evidence: input.evidence, error: failure, now, sendByAt: input.sendByAt, generation, actorId:input.actorId,
        });
        return { kind: 'failed' as const, proposalId, error: failure };
      }
    },

    async dismiss(proposalId: string, operatorId: string, reason: string, now = new Date()) {
      if (!reason.trim()) return false;
      await repository.expireDue(now);
      return repository.transition(proposalId, 'dismissed', operatorId, reason, now);
    },
  };
}

import { z } from 'zod';

import type { AiGenerationResult, AiProvider } from '@/core/shared/platform';
import { ulid } from '@/core/shared/ids';

import { generatedProposalSchema, validateGrounding } from './generation';
import type { ProposalEvidence, TrustedForecast } from './generation';
import type { ProposalRepository } from './repository';

export function createProposalService(repository: ProposalRepository, ai: AiProvider) {
  return {
    async generate(input: {
      evidence: ProposalEvidence[];
      configuredKnowledge: Array<{ key: string; value: string }>;
      trustedForecasts?: TrustedForecast[];
      sendByAt: Date;
      now?: Date;
    }) {
      if (input.evidence.length === 0) throw new Error('Proposal generation requires deployment-owned evidence.');
      const now = input.now ?? new Date();
      const proposalId = ulid(now.getTime());
      let generation: AiGenerationResult | undefined;
      let outputValidated = false;
      try {
        generation = await ai.generateGroundedJson({
          instructions: [
            'Create one Mango campaign proposal using only the supplied deployment evidence and configured knowledge.',
            'Every explanatory, timing, and forecast claim must cite one or more supplied evidence keys.',
            'Do not use cross-store benchmarks, generic marketing claims, or unsupported copy.',
            'Return exactly the supplied JSON schema. A missing evidence basis must produce a null forecast value.',
          ].join(' '),
          evidence: {
            items: input.evidence.map((item) => ({ ...item, occurredAt: item.occurredAt.toISOString() })),
            configuredKnowledge: input.configuredKnowledge,
            trustedForecasts: input.trustedForecasts ?? [],
          },
          schema: z.toJSONSchema(generatedProposalSchema) as Record<string, unknown>,
        });
        const output = generatedProposalSchema.parse(generation.output);
        validateGrounding(output, input.evidence, input.trustedForecasts);
        outputValidated = true;
        const campaignId = ulid(now.getTime());
        const revisionId = ulid(now.getTime());
        await repository.saveGenerated({ proposalId, campaignId, revisionId, output, evidence: input.evidence, now, sendByAt: input.sendByAt, generation });
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
          proposalId, evidence: input.evidence, error: failure, now, sendByAt: input.sendByAt, generation,
        });
        return { kind: 'failed' as const, proposalId, error: failure };
      }
    },

    dismiss(proposalId: string, operatorId: string, reason: string, now = new Date()) {
      return repository.transition(proposalId, 'dismissed', operatorId, reason, now);
    },
  };
}

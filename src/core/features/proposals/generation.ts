import { z } from 'zod';

import { completeExclusionRuleSchema, completeInclusionRuleSchema } from '@/core/features/lifecycle/rules';
import { stableJson } from '@/core/shared/ids';

const citedEvidence = z.object({
  key: z.string().min(1),
  observedValue: z.unknown(),
});

const citedClaim = z.object({
  text: z.string().min(1).max(4_000),
  citations: z.array(citedEvidence).min(1).max(100),
});

const generatedStep = z.object({
  channel: z.enum(['email', 'sms']),
  scheduledAt: z.string().datetime({ offset: true }),
  sendByAt: z.string().datetime({ offset: true }),
  timezone: z.string().min(1).max(100),
  whyThisTime: citedClaim,
});

export const generatedProposalSchema = z.object({
  title: z.string().min(1).max(160),
  summary: citedClaim,
  audience: z.object({
    displayRule: z.string().min(1).max(4_000),
    inclusion: completeInclusionRuleSchema,
    exclusions: z.array(completeExclusionRuleSchema).max(50),
    explanation: citedClaim,
  }),
  email: z.object({
    subject: z.string().min(1).max(250),
    html: z.string().min(1).max(102_400),
    text: z.string().min(1).max(102_400),
    preheader: z.string().min(1).max(250),
  }).optional(),
  sms: z.object({ body: z.string().min(1).max(1_600) }).optional(),
  sender: z.object({
    displayName: z.string().min(1),
    fromEmail: z.string().email(),
    replyToEmail: z.string().email(),
    physicalAddress: z.string().min(1),
    smsSender: z.string().min(1),
  }),
  messageCategory: z.string().min(1).max(160),
  links: z.array(z.object({ label: z.string().min(1), destinationUrl: z.string().url() })).max(50),
  steps: z.array(generatedStep).min(1).max(10),
  forecast: z.object({
    metric: z.string().min(1),
    valueMinor: z.number().int().nonnegative().nullable(),
    method: z.string().min(1),
    campaignIds: z.array(z.string()),
    sourceEventIds: z.array(z.string()),
    sampleSize: z.number().int().nonnegative(),
    claim: citedClaim,
  }).nullable(),
}).superRefine((value, context) => {
  const channels = new Set(value.steps.map((step) => step.channel));
  if (channels.has('email') && !value.email) context.addIssue({ code: 'custom', message: 'Email content is required for an email step.' });
  if (channels.has('sms') && !value.sms) context.addIssue({ code: 'custom', message: 'SMS content is required for an SMS step.' });
});

export type GeneratedProposal = z.infer<typeof generatedProposalSchema>;

export type ProposalEvidence = {
  key: string;
  sourceRecordId: string;
  sourceType: string;
  observedValue: unknown;
  occurredAt: Date;
};

export type TrustedForecast = {
  metric: string;
  valueMinor: number;
  method: string;
  campaignIds: string[];
  sourceEventIds: string[];
  sampleSize: number;
};

function forecastFingerprint(forecast: TrustedForecast) {
  return stableJson({
    ...forecast,
    campaignIds: [...forecast.campaignIds].sort(),
    sourceEventIds: [...forecast.sourceEventIds].sort(),
  });
}

export function validateGrounding(
  output: GeneratedProposal,
  evidence: ProposalEvidence[],
  trustedForecasts: TrustedForecast[] = [],
) {
  const available = new Map(evidence.map((item) => [item.key, item]));
  if (available.size !== evidence.length) throw new Error('Proposal evidence keys must be unique.');
  const claims = [output.summary, output.audience.explanation, ...output.steps.map((step) => step.whyThisTime)];
  if (output.forecast) claims.push(output.forecast.claim);
  for (const claim of claims) {
    for (const citation of claim.citations) {
      const supplied = available.get(citation.key);
      if (!supplied) throw new Error(`AI output cited evidence not supplied by this deployment: ${citation.key}`);
      if (stableJson(supplied.observedValue) !== stableJson(citation.observedValue)) {
        throw new Error(`AI output changed the observed value for evidence: ${citation.key}`);
      }
    }
  }
  if (output.forecast) {
    if (output.forecast.valueMinor === null) {
      if (output.forecast.sampleSize !== 0 || output.forecast.campaignIds.length || output.forecast.sourceEventIds.length) {
        throw new Error('An unavailable forecast cannot claim campaign or source-event provenance.');
      }
      return;
    }
    const fingerprint = forecastFingerprint({
      metric: output.forecast.metric,
      valueMinor: output.forecast.valueMinor,
      method: output.forecast.method,
      campaignIds: output.forecast.campaignIds,
      sourceEventIds: output.forecast.sourceEventIds,
      sampleSize: output.forecast.sampleSize,
    });
    if (!trustedForecasts.some((forecast) => forecastFingerprint(forecast) === fingerprint)) {
      throw new Error('A forecast value must exactly match deployment-owned attribution history.');
    }
  }
}

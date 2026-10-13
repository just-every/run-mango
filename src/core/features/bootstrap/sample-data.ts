import { z } from 'zod';

import rawSample from '../../../../sample-data/initial.json';

const schedule = z.object({
  timezone: z.string().min(1),
  scheduledOffsetDays: z.number().int().positive(),
  sendByOffsetDays: z.number().int().positive(),
  whyThisTime: z.string().min(1),
});
const step = z.object({
  id: z.string().min(1),
  sequence: z.number().int().positive(),
  channel: z.enum(['email', 'sms']),
  schedule,
});
const revision = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  name: z.string().min(1),
  emailSubject: z.string().min(1),
  emailBody: z.string().min(1),
  emailText: z.string().min(1),
  smsBody: z.string().min(1),
  senderName: z.string().min(1),
  fromEmail: z.string().email(),
  replyToEmail: z.string().email(),
  smsSender: z.string().min(1),
  links: z.array(z.object({ label: z.string().min(1), destinationUrl: z.string().url() })),
  steps: z.array(step).min(1),
});

const sampleSchema = z.object({
  id: z.string().min(1),
  operator: z.object({ id: z.string().min(1), email: z.string().email(), displayName: z.string().min(1) }),
  providerCapabilities: z.array(
    z.object({
      id: z.string().min(1),
      adapter: z.string().min(1),
      configured: z.boolean(),
      status: z.string().min(1),
      detail: z.string().min(1),
    }),
  ),
  sourceSyncs: z.array(z.string().min(1)),
  contacts: z.array(
    z.object({
      id: z.string().min(1),
      email: z.string().email(),
      displayName: z.string().min(1),
      emailStatus: z.string().min(1),
      smsStatus: z.string().min(1),
      history: z.array(z.object({ kind: z.string().min(1), detail: z.string().min(1) })),
    }),
  ),
  audience: z.object({ rule: z.string().min(1), candidateHistoryKind: z.string().min(1) }),
  proposals: z.array(z.object({
    id: z.string().min(1),
    campaignId: z.string().min(1).optional(),
    title: z.string().min(1),
    summary: z.string().min(1),
    evidence: z.string().min(1),
    steps: z.array(step).min(1),
  })).min(1),
  campaigns: z.array(
    z.object({
      id: z.string().min(1),
      proposalId: z.string().min(1).optional(),
      state: z.enum(['draft', 'scheduled']),
      revision,
    }),
  ),
});

export type SampleData = z.infer<typeof sampleSchema>;

export const sampleData = sampleSchema.parse(rawSample);

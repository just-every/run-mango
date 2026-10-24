import { completeInclusionRuleSchema, completeExclusionRuleSchema } from '@/core/features/lifecycle/rules';
import { z } from 'zod';
import {parseAnalyticsPolicy} from '@/core/features/settings/analytics-policy';
import { resolveLocalInstant } from '@/core/features/lifecycle/schedule';

const channel = z.enum(['email', 'sms']);
const resolvedInstant = z.string().datetime({ offset: true });

function isIanaTimeZone(value: string) {
  if (/^[+-]/.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en-AU', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const draftStep = z
  .object({
    channel,
    timezone: z.string().min(1).max(100).refine(isIanaTimeZone, 'An IANA time zone is required.'),
    scheduledAt: resolvedInstant.optional(),
    localScheduledAt: z.string().optional(),
    sendByAt: resolvedInstant.optional(),
    localSendByAt: z.string().optional(),
    whyThisTime: z.string().min(1).max(1_000),
  })
  .transform((step, context) => {
    const resolve = (local: string | undefined, instant: string | undefined, field: string) => {
      if (local !== undefined) {
        const result = resolveLocalInstant(local, step.timezone);
        if (result.status !== 'resolved') { context.addIssue({code:'custom', path:[field], message:result.detail}); return ''; }
        if (instant && Date.parse(instant) !== Date.parse(result.instant)) context.addIssue({code:'custom', path:[field], message:'Local time and resolved UTC instant disagree.'});
        return result.instant;
      }
      if (!instant) context.addIssue({code:'custom', path:[field], message:'Choose a local date and time.'});
      return instant ?? '';
    };
    const scheduledAt = resolve(step.localScheduledAt, step.scheduledAt, 'localScheduledAt');
    const sendByAt = resolve(step.localSendByAt ?? (step.localScheduledAt && !step.sendByAt ? step.localScheduledAt.slice(0,10) + 'T23:59' : undefined), step.sendByAt, 'localSendByAt');
    if (Date.parse(sendByAt) <= Date.parse(scheduledAt)) context.addIssue({code:'custom', message:'Send-by must be after the resolved send instant.'});
    return {channel:step.channel, timezone:step.timezone, scheduledAt, sendByAt, whyThisTime:step.whyThisTime};
  });

const draftLink = z.object({
  label: z.string().min(1).max(160),
  destinationUrl: z.string().url().max(2_000),
});

export const draftCompositionSchema = z
  .object({
    name: z.string().max(160).optional(),
    designTemplateKey: z.string().uuid().optional(),
    // Accepted for older clients only. Persistence always overwrites it from the rules.
    audienceRule: z.string().max(4_000).optional(),
    emailSubject: z.string().max(250).optional(),
    emailBody: z.string().optional(),
    emailText: z.string().optional(),
    preheader: z.string().max(250).optional(),
    smsBody: z.string().max(1_600).optional(),
    senderName: z.string().max(160).optional(),
    fromEmail: z.union([z.string().email(), z.literal('')]).optional(),
    replyToEmail: z.union([z.string().email(), z.literal('')]).optional(),
    smsSender: z.string().max(160).optional(),
    physicalAddress: z.string().max(500).optional(),
    messageCategory: z.string().min(1).max(160).optional(),
    inclusionRuleJson: z.string().min(1).max(20_000).refine(value=>{try{const result=completeInclusionRuleSchema.safeParse(JSON.parse(value));return result.success;}catch{return false;}}, 'Use valid structured audience conditions.').optional(),
    exclusionRulesJson: z.string().min(2).max(20_000).refine(value=>{try{const result=z.array(completeExclusionRuleSchema).max(50).safeParse(JSON.parse(value));return result.success;}catch{return false;}}, 'Use valid structured exclusions.').optional(),
    sourceTypesJson: z.string().min(2).max(2_000).optional(),
    trackingEnabled: z.boolean().optional(),
    utmPolicyJson: z.string().max(2000).nullable().refine(value=>{try{if(value!==null)parseAnalyticsPolicy(JSON.parse(value));return true;}catch{return false;}},'Use valid static analytics defaults.').optional(),
    links: z.array(draftLink).max(50).optional(),
    steps: z.array(draftStep).max(25).optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'At least one draft composition field is required.',
  });

export type DraftComposition = z.infer<typeof draftCompositionSchema>;
export type DraftStep = z.infer<typeof draftStep>;

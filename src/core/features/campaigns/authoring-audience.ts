import { z } from 'zod';

/** Channels-only clients represent one step per selected channel. */
export const authoringAudienceSchema = z.object({
  inclusionRuleJson:z.string().max(20_000),
  exclusionRulesJson:z.string().max(20_000),
  channels:z.array(z.enum(['email','sms'])).min(1).max(2),
  stepCounts:z.object({email:z.number().int().min(0).max(25),sms:z.number().int().min(0).max(25)}).strict().optional(),
}).superRefine((value,context)=>{
  if (!value.stepCounts) return;
  if (value.stepCounts.email + value.stepCounts.sms < 1 || value.stepCounts.email + value.stepCounts.sms > 25) context.addIssue({code:'custom',path:['stepCounts'],message:'Select between 1 and 25 steps.'});
  for (const channel of ['email','sms'] as const) if (value.channels.includes(channel) !== (value.stepCounts[channel] > 0)) context.addIssue({code:'custom',path:['stepCounts',channel],message:'Step counts must match the selected channels.'});
});

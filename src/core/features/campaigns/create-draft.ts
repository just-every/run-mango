import type { BatchItem } from 'drizzle-orm/batch';
import { z } from 'zod';
import { summarizeAudienceRules } from './audience-summary';
import { normalizeAuthoredContent } from './authoring-content';
import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';
import { draftCompositionSchema, type DraftComposition } from './draft-composition';
import { campaigns, campaignRevisions, campaignRevisionLinks, campaignSteps, campaignStateTransitions } from './campaign-schema';
import { parseStructuredRules } from '@/core/features/lifecycle/rules';

// Explicit composition clients keep the complete-create contract. The blank and
// recorded-signal branches deliberately allow the operator to start unfinished.
const completeCompositionSchema = draftCompositionSchema.superRefine((composition, context) => {
  const required = ['name', 'emailSubject', 'emailBody', 'emailText', 'senderName',
    'fromEmail', 'replyToEmail', 'physicalAddress', 'messageCategory',
    'inclusionRuleJson'] as const;
  for (const field of required) {
    if (!composition[field]?.trim()) {
      context.addIssue({ code: 'custom', path: [field], message: 'Required when creating an explicit composition.' });
    }
  }
  if (!composition.steps?.length) {
    context.addIssue({ code: 'custom', path: ['steps'], message: 'An explicit composition requires a saved step.' });
  }
});

export const createDraftSchema = z.union([
  z.object({ mode: z.literal('blank').optional() }).strict()
    .transform(() => ({ mode: 'blank' as const })),
  z.object({ starterSourceId: z.string().min(1) }).strict()
    .transform(value => ({ mode: 'store-signal' as const, ...value })),
  z.object({ composition: completeCompositionSchema }).strict()
    .transform(value => ({ mode: 'composition' as const, ...value })),
]);

/** A single transaction creates authored content; it never approves or queues it. */
/** `alongside` adds statements that must commit in the same batch as the new draft. */
export async function createDraft(database: Database, composition: DraftComposition, operatorId: string,
  alongside: (draft: {campaignId: string; revisionId: string; createdAt: Date}) => BatchItem<'sqlite'>[] = () => []) {
  const parsed = normalizeAuthoredContent({name:'Untitled campaign', emailSubject:'', emailBody:'', emailText:'', senderName:'', fromEmail:'', replyToEmail:'', physicalAddress:'', messageCategory:'newsletter', inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'}]}), ...draftCompositionSchema.parse(composition)});
  const now = new Date(), campaignId = ulid(), revisionId = ulid();
  const rules = parseStructuredRules(parsed.inclusionRuleJson!, parsed.exclusionRulesJson ?? '[]');
  if (!rules.ok) throw new Error('Invalid audience rules.');
  const revision = { id:revisionId,campaignId,version:1,state:'draft',name:parsed.name!,emailSubject:parsed.emailSubject!,
    emailBody:parsed.emailBody!,emailText:parsed.emailText!,preheader:parsed.preheader ?? '',smsBody:parsed.smsBody ?? '',
    senderName:parsed.senderName!,fromEmail:parsed.fromEmail!,replyToEmail:parsed.replyToEmail!,smsSender:parsed.smsSender ?? '',
    physicalAddress:parsed.physicalAddress!,messageCategory:parsed.messageCategory!,audienceRule:summarizeAudienceRules(parsed.inclusionRuleJson!, parsed.exclusionRulesJson ?? '[]'),
    inclusionRuleJson:parsed.inclusionRuleJson!,exclusionRulesJson:parsed.exclusionRulesJson ?? '[]',sourceTypesJson:JSON.stringify(rules.sourceTypes),
    trackingEnabled:parsed.trackingEnabled ?? false,createdAt:now,updatedAt:now };
  const statements = [database.insert(campaigns).values({id:campaignId,state:'draft',activeRevisionId:revisionId,createdAt:now,updatedAt:now}),
    database.insert(campaignRevisions).values(revision),
    database.insert(campaignStateTransitions).values({id:ulid(),campaignId,fromState:'draft',toState:'draft',actorType:'operator',actorId:operatorId,reason:'draft-created',occurredAt:now,createdAt:now}),
    ...(parsed.steps ?? []).map((step,index) => database.insert(campaignSteps).values({id:ulid(),revisionId,sequence:index+1,channel:step.channel,
      timezone:step.timezone,scheduledAt:new Date(step.scheduledAt),sendByAt:new Date(step.sendByAt),whyThisTime:step.whyThisTime,createdAt:now,updatedAt:now})),
    ...(parsed.links ?? []).map((link,index) => database.insert(campaignRevisionLinks).values({id:ulid(),revisionId,sequence:index+1,...link,createdAt:now,updatedAt:now})),
    ...alongside({campaignId,revisionId,createdAt:now}),
  ];
  await database.batch(statements as [typeof statements[0], ...typeof statements]);
  return {campaignId,revisionId};
}

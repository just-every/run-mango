import {z} from 'zod';
import {audiencePredicateSchema,completeInclusionRuleSchema,completeExclusionRuleSchema} from '@/core/features/lifecycle/rules';
import {stableJson} from '@/core/shared/ids';

const citedClaim=z.strictObject({
  text:z.string().min(1).max(4000),
  citations:z.array(z.strictObject({key:z.string().min(1),observedValueJson:z.string().min(1)})).min(1).max(100),
});
const predicate=z.strictObject({
  sourceType:audiencePredicateSchema.shape.sourceType,field:audiencePredicateSchema.shape.field,
  comparator:audiencePredicateSchema.shape.comparator,value:audiencePredicateSchema.shape.value,
  lookbackDays:z.number().int().min(0).max(3650).nullable(),
});
const inclusion=z.strictObject({version:z.literal(1),operator:z.enum(['all','any']),predicates:z.array(predicate).min(1).max(50)});
const exclusion=z.strictObject({version:z.literal(1),reason:z.literal('Matches an exclusion condition'),predicate});

/** Provider wire schema: every object is closed and every field required. Nullable fields
 * are explicit absence; domain normalization below removes them, without substituting content. */
export const generatedProposalWireSchema=z.strictObject({
  summary:citedClaim,
  audience:z.strictObject({inclusion,exclusions:z.array(exclusion).max(50),explanation:citedClaim}),
  email:z.strictObject({subject:z.string().min(1).max(250),html:z.string().min(1).max(102400),text:z.string().min(1).max(102400),preheader:z.string().min(1).max(250)}).nullable(),
  sms:z.strictObject({body:z.string().min(1).max(1600)}).nullable(),
  sender:z.strictObject({displayName:z.string().min(1),fromEmail:z.string().email(),replyToEmail:z.string().email(),physicalAddress:z.string().min(1),smsSender:z.string().min(1)}),
  messageCategory:z.string().min(1).max(160),
  links:z.array(z.strictObject({label:z.string().min(1),destinationUrl:z.string().min(1)})).max(50),
  steps:z.array(z.strictObject({channel:z.enum(['email','sms']),scheduledAt:z.string().datetime({offset:true}),sendByAt:z.string().datetime({offset:true}),timezone:z.string().min(1).max(100),whyThisTime:citedClaim})).min(1).max(10),
  forecast:z.null(),
});
export type GeneratedProposalWire=z.infer<typeof generatedProposalWireSchema>;
const domainPredicate=({lookbackDays,...rest}:z.infer<typeof predicate>)=>({...rest,...(lookbackDays===null?{}:{lookbackDays})});
export const generatedProposalSchema=generatedProposalWireSchema.transform(value=>({...value,
  email:value.email??undefined,sms:value.sms??undefined,
  audience:{...value.audience,inclusion:{...value.audience.inclusion,predicates:value.audience.inclusion.predicates.map(domainPredicate)},exclusions:value.audience.exclusions.map(rule=>({...rule,predicate:domainPredicate(rule.predicate)}))},
})).superRefine((value,context)=>{
  if(value.links.some(link=>!z.string().url().safeParse(link.destinationUrl).success))context.addIssue({code:'custom',message:'Every destination must be a valid URL.'});
  const channels=new Set(value.steps.map(step=>step.channel));
  if(channels.has('email')&&!value.email)context.addIssue({code:'custom',message:'Email content is required for an email step.'});
  if(channels.has('sms')&&!value.sms)context.addIssue({code:'custom',message:'SMS content is required for an SMS step.'});
  if(!completeInclusionRuleSchema.safeParse(value.audience.inclusion).success||value.audience.exclusions.some(rule=>!completeExclusionRuleSchema.safeParse(rule).success))context.addIssue({code:'custom',message:'Complete every audience condition.'});
});
export type GeneratedProposal=z.infer<typeof generatedProposalSchema>;
export type ProposalEvidence={key:string;sourceRecordId:string;sourceType:string;observedValue:unknown;occurredAt:Date};

/** A real citation does not entail arbitrary prose. Only supplied observation text is accepted. */
export function evidenceClaim(evidence:Pick<ProposalEvidence,'key'|'observedValue'>) {
  return `Observed ${evidence.key}: ${stableJson(evidence.observedValue)}.`;
}
export function validateGrounding(output:GeneratedProposal,evidence:ProposalEvidence[]) {
  const available=new Map(evidence.map(item=>[item.key,item]));
  if(available.size!==evidence.length)throw new Error('Proposal evidence keys must be unique.');
  for(const claim of [output.summary,output.audience.explanation,...output.steps.map(step=>step.whyThisTime)]) {
    const observations=claim.citations.map(citation=>{
      const supplied=available.get(citation.key);
      if(!supplied)throw new Error('AI output cited evidence not supplied by this deployment.');
      if(stableJson(supplied.observedValue)!==citation.observedValueJson)throw new Error('AI output changed the observed value for evidence.');
      return evidenceClaim(supplied);
    });
    if(claim.text!==observations.join(' '))throw new Error('AI explanatory prose is not derivable from the cited observations.');
  }
}

export function deriveProposalTitle(output:Pick<GeneratedProposal,'summary'>,evidence:ProposalEvidence[]) {
  const citation=output.summary.citations[0];
  const source=evidence.find(item=>item.key===citation.key);
  if(!source)throw new Error('Proposal naming requires supplied cited evidence.');
  return `${source.sourceType} · ${source.sourceRecordId}`;
}

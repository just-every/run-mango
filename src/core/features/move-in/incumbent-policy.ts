import {z} from 'zod';
export const attestationVersion='mailchimp-incumbent.v1';
export const attestationKeys=['brand','category','frequency','jurisdiction','wording','notPurchased'] as const;
export type AttestationKey=typeof attestationKeys[number];
const answer=z.enum(['','yes','not-sure']);
export const attestationInputSchema=z.object({nonce:z.string().uuid(),sourceKey:z.string().min(1).max(1000),typedSource:z.string().max(200),
  exportCreatedAt:z.string().datetime({offset:true}).optional(),answers:z.object({brand:answer,category:answer,frequency:answer,jurisdiction:answer,wording:answer,notPurchased:answer}).strict()}).strict();
export const attestationsSchema=z.array(attestationInputSchema).max(10).refine(rows=>new Set(rows.map(row=>row.sourceKey)).size===rows.length,'Each source needs one attestation.');
export type AttestationInput=z.infer<typeof attestationInputSchema>;
export type AttestationScope=Record<'brandOrLegalSender'|'messageCategory'|'frequencyDisclosure'|'destinationJurisdiction'|'consentText'|'consentVersion',string>;
export function attestationWording(scope:AttestationScope) {
  return {
    brand:`This audience was collected by ${scope.brandOrLegalSender||'the brand or legal sender named above'}.`,
    category:`The source consent covered ${scope.messageCategory||'the message category named above'}.`,
    frequency:`The disclosed frequency was ${scope.frequencyDisclosure||'the frequency named above'}.`,
    jurisdiction:`The consent covered destinations in ${scope.destinationJurisdiction||'the jurisdiction named above'}.`,
    wording:scope.consentText?`The original consent wording was: ${scope.consentText}`:'The original consent wording is held by Mailchimp and is not available.',
    notPurchased:'This list was not purchased, rented or scraped.',
  };
}
export function sourceOf(path:string) {
  const parts=path.split('/');parts.pop();const key=parts.join('/')||'Mailchimp audience';
  return {key,name:parts.at(-1)||'Mailchimp audience'};
}
export type IncumbentFile={id:string;sourceIdentifier:string;sourceKey:string;sourceName:string;accepted:boolean;reason?:string;exportCreatedAt?:number};

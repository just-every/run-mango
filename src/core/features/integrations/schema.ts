import { z } from 'zod';

export const integrationScopes = ['contacts:read', 'contacts:write', 'events:read', 'events:write', 'campaigns:send'] as const;
export type IntegrationScope = typeof integrationScopes[number];
const text = z.string().trim().min(1).max(2000);
export const credentialInput = z.object({
  name: z.string().trim().min(1).max(160),
  scopes: z.array(z.enum(integrationScopes)).min(1).max(5).transform(values => [...new Set(values)]),
}).strict();
export const consentInput = z.object({
  source: text, evidence: text, brandOrLegalSender: text, messageCategory: text,
  frequencyDisclosure: text, destinationJurisdiction: text, consentVersion: text,
  occurredAt: z.iso.datetime({ offset: true }),
}).strict();
export const contactInput = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  displayName: z.string().trim().min(1).max(200).optional(),
  fields: z.record(z.string().min(1).max(100), z.union([z.string().max(2000), z.number().finite(), z.boolean(), z.array(z.string().max(160)).max(100), z.null()])).refine(value => Object.keys(value).length <= 50).optional(),
  tags: z.array(z.string().trim().min(1).max(100)).max(50).transform(values => [...new Set(values)].sort()).optional(),
  segmentId: z.string().min(1).max(160).optional(),
  segmentName: z.string().trim().min(1).max(160).optional(),
  subscribe: z.boolean().optional(),
  consent: consentInput.optional(),
}).strict().refine(value => Boolean(value.segmentId) !== Boolean(value.segmentName), 'Supply segmentId or segmentName.')
  .refine(value => !value.subscribe || Boolean(value.consent), 'Subscription requires consent evidence.');
export type ContactInput = z.infer<typeof contactInput>;
export const suppressionInput = z.object({
  email: z.string().trim().toLowerCase().email().max(320), reason: z.string().trim().min(1).max(160),
  idempotencyKey: z.string().min(8).max(200), occurredAt: z.iso.datetime({ offset: true }).optional(),
}).strict();
export const sendInput = z.object({revisionId: z.string().min(1).max(160), segmentId: z.string().min(1).max(160)}).strict();
export const pageInput = z.object({cursor: z.string().regex(/^\d{1,15}$/).default('0'), limit: z.coerce.number().int().min(1).max(100).default(50)});

export class IntegrationError extends Error {
  constructor(readonly code: string, readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 503) { super(code); }
}

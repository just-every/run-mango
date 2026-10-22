import { z } from 'zod';
import { sha256, stableJson } from '@/core/shared/ids';
import { IntegrationError } from '@/core/features/integrations/schema';

export const conversionEventInput = z.object({
  eventId: z.string().trim().min(1).max(160), metric: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/),
  contactId: z.string().min(1).max(160), occurredAt: z.iso.datetime({offset: true}),
  valueMinor: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  currency: z.string().refine(value => Intl.supportedValuesOf('currency').includes(value)),
  kind: z.enum(['conversion', 'refund', 'cancellation']), conversionId: z.string().trim().min(1).max(160).optional(),
}).strict().refine(value => value.kind === 'conversion' ? !value.conversionId : Boolean(value.conversionId))
  .refine(value => value.kind !== 'cancellation' || value.valueMinor === 0);

type Input = z.infer<typeof conversionEventInput>;
/** Integrations record facts under their own credential namespace. Replays must
 * match the original immutable body; a reversal names that credential's conversion.
 * Existing source custody supplies contact merge, erasure and portable export. */
export async function recordConversionEvent(db: D1Database, credentialId: string, input: Input) {
  const now = Date.now(), occurredAt = Date.parse(input.occurredAt);
  if (occurredAt > now) throw new IntegrationError('event_in_future', 400);
  const provider = `integration:${credentialId}`, providerId = await sha256(input.eventId);
  const id = `conversion:${credentialId}:${providerId}`;
  const parentId = input.conversionId ? `conversion:${credentialId}:${await sha256(input.conversionId)}` : null;
  const payload = stableJson({...input, occurredAt: new Date(occurredAt).toISOString(), schema: 'native-conversion-v1', conversionSourceRecordId: parentId});
  const digest = await sha256(payload);
  const prior = await db.prepare('SELECT payload_digest FROM source_records WHERE id=?').bind(id).first<{payload_digest: string}>();
  if (prior && prior.payload_digest !== digest) throw new IntegrationError('idempotency_conflict', 409);
  if (!await db.prepare('SELECT id FROM contacts WHERE id=?').bind(input.contactId).first()) throw new IntegrationError('contact_not_found', 404);
  if (parentId) {
    const parent = await db.prepare(`SELECT contact_id,occurred_at,payload FROM source_records WHERE id=? AND provider=? AND source_type='conversion-event'`)
      .bind(parentId, provider).first<{contact_id: string; occurred_at: number; payload: string}>();
    if (!parent) throw new IntegrationError('conversion_not_found', 404);
    const original = JSON.parse(parent.payload) as Input;
    if (original.kind !== 'conversion' || parent.contact_id !== input.contactId || original.metric !== input.metric || original.currency !== input.currency || parent.occurred_at > occurredAt)
      throw new IntegrationError('conversion_mismatch', 409);
  }
  const guard = `EXISTS(SELECT 1 FROM integration_credentials WHERE id=? AND revoked_at IS NULL
    AND EXISTS(SELECT 1 FROM json_each(scopes_json) WHERE value='events:write'))`;
  const [written, stored] = await db.batch<{payload_digest: string}>([
    db.prepare(`INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,occurred_at,payload,payload_digest,created_at,updated_at)
      SELECT ?,?,'conversion-event',?,?,?,?,?,?,? WHERE ${guard}
        AND EXISTS(SELECT 1 FROM contacts WHERE id=?)
        AND (? IS NULL OR EXISTS(SELECT 1 FROM source_records WHERE id=? AND contact_id=? AND occurred_at<=?
          AND json_extract(payload,'$.kind')='conversion' AND json_extract(payload,'$.metric')=? AND json_extract(payload,'$.currency')=?))
      ON CONFLICT DO NOTHING`)
      .bind(id, provider, providerId, input.contactId, occurredAt, payload, digest, now, now, credentialId, input.contactId,
        parentId, parentId, input.contactId, occurredAt, input.metric, input.currency),
    db.prepare(`SELECT payload_digest FROM source_records WHERE id=? AND ${guard}`).bind(id, credentialId),
    db.prepare(`INSERT INTO source_activities(id,contact_id,source_record_id,kind,activity_key,state,occurred_at,created_at,updated_at)
      SELECT ?,contact_id,id,?,'',?,?,?,? FROM source_records WHERE id=? AND payload_digest=? AND ${guard}
      ON CONFLICT DO NOTHING`)
      .bind(id, `conversion:${input.metric}`, input.kind, occurredAt, now, now, id, digest, credentialId),
  ]);
  if (!stored.results[0]) throw new IntegrationError('event_authority_changed', 409);
  if (stored.results[0].payload_digest !== digest) throw new IntegrationError('idempotency_conflict', 409);
  return {id, eventId: input.eventId, status: written.meta.changes ? 'recorded' : 'replayed'};
}

import {z} from 'zod';
import {sha256,stableJson} from '@/core/shared/ids';
import {IntegrationError} from './schema';

export const customEventInput=z.object({
  name:z.string().regex(/^[a-z][a-z0-9_.-]{0,79}$/),
  contactId:z.string().min(1).max(160),
  idempotencyKey:z.string().min(8).max(200),
  occurredAt:z.iso.datetime({offset:true}),
  properties:z.record(z.string().min(1).max(100),z.union([z.string().max(2000),z.number().finite(),z.boolean(),z.null()]))
    .refine(value=>Object.keys(value).length<=50).default({}),
}).strict();
export type CustomEventInput=z.infer<typeof customEventInput>;

/** Native source custody already covers export, merge, archive and erasure.
 * A custom fact never identifies a new contact, changes consent or sends mail. */
export async function recordCustomEvent(db:D1Database,credentialId:string,input:CustomEventInput) {
  const now=Date.now(),at=Date.parse(input.occurredAt);
  if(at>now)throw new IntegrationError('event_in_future',400);
  const provider=`integration:${credentialId}`,key=await sha256(input.idempotencyKey),id=`custom:${credentialId}:${key}`;
  const {idempotencyKey:_,...fact}=input;
  const payload=stableJson({...fact,occurredAt:new Date(at).toISOString(),schema:'custom-event-v1'}),digest=await sha256(payload);
  if(new TextEncoder().encode(payload).length>16*1024)throw new IntegrationError('event_properties_too_large',400);
  if(!await db.prepare('SELECT id FROM contacts WHERE id=? AND merge_lock IS NULL').bind(input.contactId).first())throw new IntegrationError('contact_not_found',404);
  const guard=`EXISTS(SELECT 1 FROM integration_credentials WHERE id=? AND revoked_at IS NULL
    AND EXISTS(SELECT 1 FROM json_each(scopes_json) WHERE value='events:write'))`;
  const [written,stored]=await db.batch<{payload_digest:string}>([
    db.prepare(`INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,occurred_at,payload,payload_digest,created_at,updated_at)
      SELECT ?,?,'custom-event',?,?,?,?,?,?,? WHERE ${guard}
        AND EXISTS(SELECT 1 FROM contacts WHERE id=? AND merge_lock IS NULL)
      ON CONFLICT DO NOTHING`).bind(id,provider,key,input.contactId,at,payload,digest,now,now,credentialId,input.contactId),
    db.prepare(`SELECT payload_digest FROM source_records WHERE id=? AND ${guard}`).bind(id,credentialId),
    db.prepare(`INSERT INTO source_activities(id,contact_id,source_record_id,kind,activity_key,state,occurred_at,created_at,updated_at)
      SELECT ?,contact_id,id,?,'','recorded',?,?,? FROM source_records WHERE id=? AND payload_digest=? AND ${guard}
      ON CONFLICT DO NOTHING`).bind(id,input.name,at,now,now,id,digest,credentialId),
  ]);
  if(!stored.results[0])throw new IntegrationError('event_authority_changed',409);
  if(stored.results[0].payload_digest!==digest)throw new IntegrationError('idempotency_conflict',409);
  return {id,status:written.meta.changes?'recorded':'replayed'};
}

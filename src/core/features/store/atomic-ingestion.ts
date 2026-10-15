import {commerceContactPlanner} from './commerce-contact';
import {commerceAttributionStatements} from '@/core/features/insights/commerce-attribution';
import type {Database} from '@/core/platform/db/client';
import type {NormalizedCommerceRecord} from './service';
import type {SyncWriteFence} from './sync-write-fence';
import {sha256, stableJson, ulid} from '@/core/shared/ids';

export type CommerceReceipt = {ids: string[]; digest: string};
/** Native D1 batch is the transaction boundary: receipts, latest projection and
 * all product activities either commit together or are replayable together. */
export function createAtomicCommerceIngestion(database: Database) {
  const db = database.$client;
  return async (provider: string, records: NormalizedCommerceRecord[], now: Date, fence?: SyncWriteFence, receipt?: CommerceReceipt, contactHashSalt?: string) => {
    const statements: D1PreparedStatement[] = [];
    const planContact=commerceContactPlanner(db,contactHashSalt,now);
    if (fence) statements.push(db.prepare(`INSERT INTO commerce_transaction_guard SELECT CASE WHEN EXISTS
      (SELECT 1 FROM source_sync_runs WHERE id=? AND state='running' AND lease_token=? AND lease_expires_at>max(?,CAST(unixepoch('subsec')*1000 AS INTEGER))) THEN 1 ELSE 0 END`).bind(fence.runId,fence.token,fence.now().getTime()));
    for (const id of receipt?.ids ?? []) statements.push(db.prepare(`INSERT INTO commerce_receipts(id,digest,received_at) VALUES(?,?,?)
      ON CONFLICT(id) DO UPDATE SET digest=CASE WHEN commerce_receipts.digest=excluded.digest THEN excluded.digest ELSE NULL END`).bind(await sha256(id),receipt!.digest,now.getTime()));
    for (const input of records) {
      const record={...input};
      const payload = stableJson(record.payload), digest = await sha256(payload);
      const prior = await db.prepare('SELECT id,coalesce(provider_updated_at,occurred_at) version FROM source_records WHERE provider=? AND source_type=? AND provider_source_id=?').bind(provider,record.sourceType,record.providerSourceId).first<{id:string;version:number}>();
      const id = prior?.id ?? `source_${await sha256(`${provider}:${record.sourceType}:${record.providerSourceId}`)}`, version = (record.providerUpdatedAt ?? record.occurredAt).getTime();
      if(prior && prior.version>version)continue;
      // A newer source accepted after planning must abort the whole identity and
      // source transaction. Retrying reads that authority and skips stale work.
      statements.push(db.prepare(`INSERT INTO commerce_transaction_guard SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM source_records WHERE provider=? AND source_type=? AND provider_source_id=? AND coalesce(provider_updated_at,occurred_at)>?) THEN 1 ELSE 0 END`).bind(provider,record.sourceType,record.providerSourceId,version));
      if(record.contact){const contact=await planContact(record.contact);record.contactId=contact.id;statements.push(...contact.statements);}
      if(record.contactId)statements.push(db.prepare(`INSERT INTO commerce_transaction_guard SELECT CASE WHEN EXISTS(SELECT 1 FROM contacts WHERE id=? AND merge_lock IS NULL) AND NOT EXISTS(SELECT 1 FROM contacts WHERE merge_lock IS NOT NULL) THEN 1 ELSE 0 END`).bind(record.contactId));
      if (record.contactId && record.payload.identity === 'shopify-signed-logged-in-customer' && record.payload.observation !== 'privacy_revoked') {
        statements.push(db.prepare('INSERT INTO commerce_transaction_guard SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM commerce_privacy_controls WHERE contact_id=? AND revoked_at>=?) THEN 1 ELSE 0 END').bind(record.contactId,record.occurredAt.getTime()));
      }
      statements.push(db.prepare(`INSERT INTO source_records(id,provider,source_type,provider_source_id,contact_id,occurred_at,payload,payload_digest,created_at,updated_at,provider_updated_at,snapshot_run_id)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(provider,source_type,provider_source_id) DO UPDATE SET
        contact_id=excluded.contact_id,occurred_at=excluded.occurred_at,payload=excluded.payload,payload_digest=excluded.payload_digest,updated_at=excluded.updated_at,provider_updated_at=excluded.provider_updated_at,snapshot_run_id=coalesce(excluded.snapshot_run_id,source_records.snapshot_run_id)
        WHERE coalesce(source_records.provider_updated_at,source_records.occurred_at)<=excluded.provider_updated_at`).bind(id,provider,record.sourceType,record.providerSourceId,record.contactId??null,record.occurredAt.getTime(),payload,digest,now.getTime(),now.getTime(),version,fence?.runId??null));
      statements.push(...commerceAttributionStatements(database, {sourceRecordId: id, sourceType: record.sourceType, providerSourceId: record.providerSourceId, contactId: record.contactId, payload: record.payload, occurredAt: record.occurredAt, updatedAt: record.providerUpdatedAt ?? record.occurredAt}));
      const current = `SELECT id FROM source_records WHERE provider=? AND source_type=? AND provider_source_id=? AND payload_digest=? AND provider_updated_at=?`;
      const identity = [provider,record.sourceType,record.providerSourceId,digest,version];
      statements.push(db.prepare(`DELETE FROM source_activities WHERE source_record_id IN (${current})`).bind(...identity));
      if(record.contactId && (record.activity?.kind==='order'||record.activity?.kind==='click'))statements.push(db.prepare(`UPDATE contacts SET last_activity_at=?,updated_at=? WHERE id=? AND (last_activity_at IS NULL OR last_activity_at<?) AND EXISTS(${current})`).bind(record.occurredAt.getTime(),now.getTime(),record.contactId,record.occurredAt.getTime(),...identity));
      for (const activity of record.activities ?? (record.activity ? [record.activity] : [])) {
        if (!record.contactId) continue;
        statements.push(db.prepare(`INSERT INTO source_activities(id,contact_id,source_record_id,kind,product_id,activity_key,state,occurred_at,created_at,updated_at)
          SELECT ?,?,id,?,?,?,?,?,?,? FROM source_records WHERE id IN (${current})
          ON CONFLICT(contact_id,source_record_id,kind,activity_key) DO NOTHING`).bind(ulid(),record.contactId,activity.kind,activity.productId??null,activity.productId??'',activity.state,record.occurredAt.getTime(),now.getTime(),now.getTime(),...identity));
      }
    }
    statements.push(db.prepare('DELETE FROM commerce_transaction_guard'));
    if (statements.length) await db.batch(statements);
  };
}

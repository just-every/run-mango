import {z} from 'zod';
import type {Database} from '@/core/platform/db/client';
import type {SourceRecordInput} from '@/core/shared/platform';
import {sha256,stableJson} from '@/core/shared/ids';

export type ChannelHealth = {id: string; shop: string; installation_id: string; pixel_id: string | null; coverage_start: number; retention_start: number; log_revision: number; healthy_at: number; last_error: string | null};
const cursorSchema = z.object({v:z.literal(1),channel:z.string(),type:z.enum(['cart','browsing-event']),after:z.number().int().nonnegative(),through:z.number().int().nonnegative(),floor:z.number().int(),revision:z.number().int().nonnegative(),started:z.number().int()}).strict();
type Observation = {sequence:number; source_type:string; source_id:string; contact_id:string|null; occurred_at:number; provider_updated_at:number; payload:string};
export function createCommerceEventLog(database: Database, channel: string) {
  const db = database.$client;
  async function health(now = Date.now()) {
    const row = await db.prepare('SELECT * FROM commerce_channels WHERE id=?').bind(channel).first<ChannelHealth>();
    if (!row || row.last_error || row.healthy_at < now-3600000) throw new Error('Shopify observation channel installation/health is unverified, failed or expired.');
    return row;
  }
  return {
    health,
    async append(record: SourceRecordInput, eventId: string, digest: string) {
      const now = Date.now(); await health(now);
      const withdrawal: D1PreparedStatement[] = record.payload.observation==='privacy_revoked' && record.contactId ? [
        db.prepare('INSERT INTO commerce_privacy_controls(contact_id,revoked_at) VALUES(?,?) ON CONFLICT(contact_id) DO UPDATE SET revoked_at=max(revoked_at,excluded.revoked_at)').bind(record.contactId,record.occurredAt.getTime()),
        db.prepare("DELETE FROM source_activities WHERE source_record_id IN (SELECT id FROM source_records WHERE contact_id=? AND provider='shopify' AND json_extract(payload,'$.identity')='shopify-signed-logged-in-customer' AND occurred_at<=?)").bind(record.contactId,record.occurredAt.getTime()),
        db.prepare("DELETE FROM source_records WHERE contact_id=? AND provider='shopify' AND json_extract(payload,'$.identity')='shopify-signed-logged-in-customer' AND occurred_at<=?").bind(record.contactId,record.occurredAt.getTime()),
        db.prepare('DELETE FROM commerce_observations WHERE channel=? AND contact_id=? AND occurred_at<=? AND event_id<>?').bind(channel,record.contactId,record.occurredAt.getTime(),eventId),
      ] : [];
      await db.batch([
        db.prepare("INSERT INTO commerce_transaction_guard SELECT CASE WHEN ?='privacy_revoked' OR NOT EXISTS(SELECT 1 FROM commerce_privacy_controls WHERE contact_id=? AND revoked_at>=?) THEN 1 ELSE 0 END").bind(String(record.payload.observation),record.contactId??null,record.occurredAt.getTime()),
        db.prepare(`INSERT INTO commerce_receipts(id,digest,received_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET digest=CASE WHEN commerce_receipts.digest=excluded.digest THEN excluded.digest ELSE NULL END`).bind(await sha256(`observation:${channel}:${eventId}`),digest,now),
        ...withdrawal,
        db.prepare(`INSERT INTO commerce_observations(channel,event_id,source_type,source_id,contact_id,occurred_at,provider_updated_at,received_at,payload,digest) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(channel,event_id) DO NOTHING`).bind(channel,eventId,record.sourceType,record.sourceId,record.contactId??null,record.occurredAt.getTime(),(record.updatedAt??record.occurredAt).getTime(),now,stableJson(record.payload),digest),
        db.prepare('UPDATE commerce_channels SET last_observation_at=(SELECT max(received_at) FROM commerce_observations WHERE channel=?) WHERE id=?').bind(channel,channel),
        db.prepare('DELETE FROM commerce_transaction_guard'),
      ]);
    },
    async read(type: string, cursor?: string) {
      if (type !== 'cart' && type !== 'browsing-event') throw new Error('Invalid observation source.');
      const state = await health();
      const high = await db.prepare('SELECT coalesce(max(sequence),0) AS high FROM commerce_observations WHERE channel=?').bind(channel).first<{high:number}>();
      const range = cursor ? cursorSchema.parse(JSON.parse(cursor)) : {v:1 as const,channel,type,after:0,through:high!.high,floor:state.retention_start,revision:state.log_revision,started:Date.now()};
      if (range.channel!==channel || range.type!==type || range.after>range.through || range.through>high!.high || range.floor!==state.retention_start || range.revision!==state.log_revision || range.started < Date.now()-86400000) throw new Error('Observation replay range is invalid or has a retention/privacy gap. Restart the bounded range.');
      // Page across the entire channel, not just matching types. This makes the
      // pinned high watermark and progress explicit even for quiet source types.
      const rows = (await db.prepare(`SELECT sequence,source_type,source_id,contact_id,occurred_at,provider_updated_at,payload FROM commerce_observations WHERE channel=? AND sequence>? AND sequence<=? ORDER BY sequence LIMIT 100`).bind(channel,range.after,range.through).all<Observation>()).results;
      const afterRead = await health();
      if(afterRead.log_revision!==state.log_revision || afterRead.retention_start!==state.retention_start)throw new Error('Observation log changed during replay. Restart the bounded range.');
      const after = rows.at(-1)?.sequence ?? range.after;
      if (!rows.length && after<range.through) throw new Error('Observation log has an unexplained gap.');
      const records: SourceRecordInput[] = rows.filter(row=>row.source_type===type).map(row=>({sourceType:type,sourceId:row.source_id,contactId:row.contact_id??undefined,occurredAt:new Date(row.occurred_at),updatedAt:new Date(row.provider_updated_at),payload:JSON.parse(row.payload)}));
      return {records,nextCursor:after<range.through?JSON.stringify({...range,after}):undefined,
        coverage:{mode:'observations' as const,channel,from:state.retention_start,through:range.through,complete:after===range.through,exhaustive:false}};
    },
  };
}

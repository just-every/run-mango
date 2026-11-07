import type {BulkJob} from './types';
/** Queued work retains its initiating native session and role boundary. */
export const bulkAuthoritySql=`EXISTS(SELECT 1 FROM oa_sessions s JOIN oa_operators o ON o.id=s.operator_id
  LEFT JOIN operator_product_roles r ON r.operator_id=o.id
  WHERE s.token_hash=? AND o.id=? AND o.status='active' AND s.operator_version=o.version
  AND s.revoked_at IS NULL AND s.expires_at>CAST(ROUND((julianday('now')-2440587.5)*86400000) AS INTEGER)
  AND (o.role='owner' OR r.role IN ('owner','admin')))`;
export const bulkAuthority=(job:Pick<BulkJob,'session_hash'|'principal_id'>)=>({sql:bulkAuthoritySql,params:[job.session_hash,job.principal_id]});
export async function authorized(db:D1Database,job:BulkJob){const rule=bulkAuthority(job);return Boolean(await db.prepare(`SELECT 1 WHERE ${rule.sql}`).bind(...rule.params).first());}

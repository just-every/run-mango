import { sha256, ulid } from '@/core/shared/ids';
import { IntegrationError, type IntegrationScope } from './schema';

export type Credential = {id: string; name: string; prefix: string; scopes: IntegrationScope[]; createdBy: string; createdAt: number; revokedAt: number | null; lastUsedAt: number | null};
type Row = {id: string; name: string; prefix: string; scopes_json: string; created_by: string; created_at: number; revoked_at: number | null; last_used_at: number | null};
function metadata(row: Row): Credential {
  return {id: row.id, name: row.name, prefix: row.prefix, scopes: JSON.parse(row.scopes_json), createdBy: row.created_by,
    createdAt: row.created_at, revokedAt: row.revoked_at, lastUsedAt: row.last_used_at};
}
export function createCredentialStore(db: D1Database) {
  return {
    async list() { return (await db.prepare('SELECT * FROM integration_credentials ORDER BY created_at DESC,id').all<Row>()).results.map(metadata); },
    async create(input: {name: string; scopes: IntegrationScope[]}, actor: string) {
      const id = ulid(), now = Date.now(), prefix = `mango_${id}`;
      const secret = [...crypto.getRandomValues(new Uint8Array(32))].map(byte => byte.toString(16).padStart(2, '0')).join('');
      const token = `${prefix}.${secret}`;
      await db.prepare('INSERT INTO integration_credentials(id,name,prefix,token_hash,scopes_json,created_by,created_at) VALUES(?,?,?,?,?,?,?)')
        .bind(id, input.name, prefix, await sha256(token), JSON.stringify(input.scopes), actor, now).run();
      return {credential: {id, name: input.name, prefix, scopes: input.scopes, createdBy: actor, createdAt: now, revokedAt: null, lastUsedAt: null}, token};
    },
    async revoke(id: string) {
      const row = await db.prepare('UPDATE integration_credentials SET revoked_at=COALESCE(revoked_at,?) WHERE id=? RETURNING *').bind(Date.now(), id).first<Row>();
      if (!row) throw new IntegrationError('not_found', 404);
      return {credential: metadata(row)};
    },
    async identify(request: Request) {
      const header = request.headers.get('Authorization') ?? '';
      if (!/^Bearer mango_[0-9A-HJKMNP-TV-Z]{26}\.[a-f0-9]{64}$/.test(header)) return null;
      const row = await db.prepare('SELECT * FROM integration_credentials WHERE token_hash=?').bind(await sha256(header.slice(7))).first<Row>();
      return row ? metadata(row) : null;
    },
    async takeAllowance(id: string) {
      const now = Date.now(), window = Math.floor(now / 60_000);
      const row = await db.prepare(`UPDATE integration_credentials SET last_used_at=?,rate_count=CASE WHEN rate_window=? THEN rate_count+1 ELSE 1 END,rate_window=?
        WHERE id=? AND revoked_at IS NULL RETURNING rate_count`).bind(now, window, window, id).first<{rate_count: number}>();
      if (!row) throw new IntegrationError('credential_revoked', 401);
      if (row.rate_count > 60) throw new IntegrationError('rate_limited', 429);
    },
  };
}

/** Settings page views were logged until they were left out; rows already stored stay hidden from every list. */
export const visibleOperation = (column: string) => `${column} NOT IN ('settings.credentials.get','settings.audit.get')`;

export function createIntegrationAudit(db: D1Database) {
  return {
    async begin(operation: string, credentialId: string | null, actorId: string | null) {
      const id = ulid();
      await db.prepare('INSERT INTO integration_audit(id,credential_id,actor_id,operation,occurred_at) VALUES(?,?,?,?,?)')
        .bind(id, credentialId, actorId, operation, Date.now()).run();
      return id;
    },
    async finish(id: string, status: number, outcome: string, credentialId?: string) {
      await db.prepare('UPDATE integration_audit SET status=?,outcome=?,credential_id=COALESCE(?,credential_id) WHERE id=?').bind(status, outcome, credentialId ?? null, id).run();
    },
    async attribute(id: string, credentialId: string) {
      await db.prepare('UPDATE integration_audit SET credential_id=? WHERE id=?').bind(credentialId, id).run();
    },
    async list(cursor: string, limit: number) {
      const audit = (await db.prepare(`SELECT a.id,a.sequence,a.credential_id AS credentialId,c.name AS credentialName,a.actor_id AS actorId,o.display_name AS operatorName,a.operation,a.status,a.outcome,a.occurred_at AS occurredAt
        FROM integration_audit a LEFT JOIN integration_credentials c ON c.id=a.credential_id LEFT JOIN operators o ON o.id=a.actor_id
        WHERE (?=0 OR a.sequence<?) AND ${visibleOperation('a.operation')} ORDER BY a.sequence DESC LIMIT ?`).bind(Number(cursor), Number(cursor), limit).all<{sequence: number}>()).results;
      return {audit, nextCursor: String(audit.at(-1)?.sequence ?? cursor)};
    },
  };
}

import type { Database } from '@/core/platform/db/client';
import type { SenderInspection, SenderLease } from './types';

export type AuthorityState = { id: string; generation: number; binding_digest: string; configuration_digest: string | null;
  observation_id: string | null; revoked_at: number | null; reason: string };
export const leaseGuard = `EXISTS (SELECT 1 FROM sender_verification_inspections si
  JOIN sender_verification_state ss ON ss.id = si.state_id
  WHERE si.id = ? AND si.ready = 1 AND si.generation = ? AND ss.generation = si.generation
  AND si.binding_digest = ? AND ss.binding_digest = si.binding_digest
  AND si.configuration_digest = ? AND ss.configuration_digest = si.configuration_digest
  AND si.observation_id = ? AND ss.observation_id = si.observation_id AND ss.revoked_at IS NULL
  AND si.expires_at > MAX(?, CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)) AND si.checked_at <= ?)`;
export const leaseValues = (lease: SenderLease, now: number) => [lease.id, lease.generation, lease.bindingDigest,
  lease.configurationDigest, lease.observationId, now, now];
export function associationStatement(client: D1Database, lease: SenderLease, kind: 'approval' | 'handoff', entityId: string,
  attempt: string, now: number, guard: string, values: unknown[]) {
  return client.prepare(`INSERT INTO sender_verification_associations
    (id, inspection_id, kind, entity_id, attempt_key, created_at) SELECT ?, ?, ?, ?, ?, ? WHERE ${guard}`)
    .bind(crypto.randomUUID(), lease.id, kind, entityId, attempt, now, ...values);
}
export function createVerificationRepository(database: Database) {
  const db = database.$client;
  const state = (id: string) => db.prepare('SELECT * FROM sender_verification_state WHERE id = ?').bind(id).first<AuthorityState>();
  return {
    db, state,
    async bind(id: string, binding: string, now: number) {
      const [, rows] = await db.batch([db.prepare(`INSERT INTO sender_verification_state (id,generation,binding_digest,reason,created_at,updated_at)
        VALUES (?,0,?,'observation-missing',?,?) ON CONFLICT(id) DO UPDATE SET
        generation = generation + 1, binding_digest = excluded.binding_digest, configuration_digest = NULL,
        observation_id = NULL, reason = 'binding-changed', revoked_at = NULL, updated_at = excluded.updated_at
        WHERE binding_digest <> excluded.binding_digest`).bind(id, binding, now, now),
        db.prepare('SELECT * FROM sender_verification_state WHERE id = ?').bind(id),
      ]);
      return rows.results[0] as AuthorityState;
    },
    async configuration(previous: AuthorityState, digest: string, now: number) {
      return db.prepare(`UPDATE sender_verification_state SET
        generation = generation + CASE WHEN configuration_digest IS ? THEN 0 ELSE 1 END,
        observation_id = CASE WHEN configuration_digest IS ? THEN observation_id ELSE NULL END,
        configuration_digest = ?, reason = CASE WHEN configuration_digest IS ? THEN reason ELSE 'configuration-changed' END,
        updated_at = ? WHERE id = ? AND generation = ? AND binding_digest = ? RETURNING *`)
        .bind(digest, digest, digest, digest, now, previous.id, previous.generation, previous.binding_digest).first<AuthorityState>();
    },
    async invalidate(previous: AuthorityState, reason: string, now: number, revoke = false) {
      await db.prepare(`UPDATE sender_verification_state SET generation = generation + 1, reason = ?, updated_at = ?,
        revoked_at = CASE WHEN ? THEN ? ELSE revoked_at END
        WHERE id = ? AND generation = ? AND binding_digest = ?`)
        .bind(reason, now, revoke ? 1 : 0, now, previous.id, previous.generation, previous.binding_digest).run();
    },
    async observation(id: string) {
      return db.prepare('SELECT * FROM sender_verification_observations WHERE id = ?').bind(id).first<{
        id: string; result_json: string; observed_at: number; expires_at: number; binding_digest: string; configuration_digest: string;
      }>();
    },
    async inspection(current: AuthorityState, inspection: SenderInspection, now: number, evidence: Record<string, unknown>) {
      const id = crypto.randomUUID();
      const result = await db.prepare(`INSERT INTO sender_verification_inspections
        (id,state_id,generation,binding_digest,configuration_digest,observation_id,ready,checked_at,expires_at,result_json,created_at)
        SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sender_verification_state
          WHERE id = ? AND generation = ? AND binding_digest = ? AND configuration_digest IS ? AND observation_id IS ?)`)
        .bind(id, current.id, current.generation, current.binding_digest, current.configuration_digest ?? '', current.observation_id,
          inspection.ready ? 1 : 0, now, inspection.expiresAt, JSON.stringify({ ...inspection, evidence }), now,
          current.id, current.generation, current.binding_digest, current.configuration_digest, current.observation_id).run();
      if (!result.meta.changes || !inspection.ready || !current.observation_id || !current.configuration_digest) return;
      return { id, stateId: current.id, generation: current.generation, bindingDigest: current.binding_digest,
        configurationDigest: current.configuration_digest, observationId: current.observation_id, expiresAt: inspection.expiresAt } satisfies SenderLease;
    },
  };
}
export type VerificationRepository = ReturnType<typeof createVerificationRepository>;

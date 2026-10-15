import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';
import { digestJson } from './digest';
import { advisorySnapshot } from './advisory-snapshot';
import { emailSubjectAdvisory, isAcknowledgableFinding } from './advisory-policy';

type Finding = {id: string; kind: string; status: string; detail: string; blocking: boolean};
type Acknowledgement = {operatorId: string; acknowledgedAt: string};
const operationKey = (identity: string) => `advisory-acknowledgement:${identity}`;
const identityFor = (revisionDigest: string, check: Finding) => digestJson({revisionDigest,
  kind: check.kind, status: check.status, detail: check.detail, blocking: check.blocking});

async function recorded(database: Database, identity: string): Promise<Acknowledgement | undefined> {
  const row = await database.$client.prepare(`SELECT actor_id, occurred_at FROM lifecycle_audit_entries
    WHERE operation_key = ? AND action = 'acknowledge-advisory'`).bind(operationKey(identity))
    .first<{actor_id: string; occurred_at: number}>();
  return row ? {operatorId: row.actor_id, acknowledgedAt: new Date(row.occurred_at).toISOString()} : undefined;
}

function matchesCurrentSubject(check: Finding, subject: string) {
  const current = emailSubjectAdvisory(subject);
  return isAcknowledgableFinding(check) && current?.detail === check.detail;
}

export async function enrichAdvisoryAcknowledgements<T extends Finding>(database: Database, revisionId: string, checks: T[]) {
  const snapshot = await advisorySnapshot(database, revisionId);
  return Promise.all(checks.map(async check => {
    if (!snapshot || !snapshot.hasEmail || !matchesCurrentSubject(check, String(snapshot.revision.email_subject))) return {...check, findingIdentity: undefined, acknowledgement: undefined};
    const findingIdentity = await identityFor(snapshot.digest, check);
    return {...check, findingIdentity, acknowledgement: await recorded(database, findingIdentity)};
  }));
}

export function createAdvisoryAcknowledgementRepository(database: Database) {
  return {
    async acknowledgeAdvisory(input: {campaignId: string; revisionId: string; checkId: string; findingIdentity: string; operatorId: string}) {
      const snapshot = await advisorySnapshot(database, input.revisionId);
      if (!snapshot || snapshot.revision.campaign_id !== input.campaignId) return {kind: 'not_found' as const};
      const row = await database.$client.prepare(`SELECT id, kind, status, detail, blocking FROM campaign_checks WHERE id = ? AND revision_id = ?`)
        .bind(input.checkId, input.revisionId).first<{id: string; kind: string; status: string; detail: string; blocking: number}>();
      if (!row) return {kind: 'conflict' as const};
      const check = {...row, blocking: Boolean(row.blocking)};
      if (!snapshot.hasEmail || !matchesCurrentSubject(check, String(snapshot.revision.email_subject))) return {kind: 'not_advisory' as const};
      const identity = await identityFor(snapshot.digest, check);
      if (identity !== input.findingIdentity) return {kind: 'conflict' as const};
      const now = Date.now();
      const result = await database.$client.prepare(`INSERT INTO lifecycle_audit_entries
        (id, operation_key, entity_type, entity_id, action, actor_type, actor_id, detail_json, occurred_at, created_at)
        SELECT ?, ?, 'campaign-revision', ?, 'acknowledge-advisory', 'operator', ?, ?, ?, ?
        WHERE ${snapshot.guard} AND EXISTS (SELECT 1 FROM campaigns WHERE id = ? AND active_revision_id = ?)
          AND EXISTS (SELECT 1 FROM campaign_checks WHERE id = ? AND revision_id = ? AND kind = ? AND status = 'advisory' AND blocking = 0 AND detail = ?)
        ON CONFLICT(operation_key) DO NOTHING`).bind(ulid(now), operationKey(identity), input.revisionId, input.operatorId,
          JSON.stringify({campaignId: input.campaignId, revisionId: input.revisionId, revisionDigest: snapshot.digest,
            findingIdentity: identity, kind: check.kind, detail: check.detail}), now, now,
          ...snapshot.values, input.campaignId, input.revisionId, check.id, input.revisionId, check.kind, check.detail).run();
      // Recheck on a no-op: a stale active revision must not masquerade as an idempotent success.
      if (!result.meta.changes) {
        const current = await database.$client.prepare(`SELECT 1 FROM campaigns WHERE id = ? AND active_revision_id = ? AND ${snapshot.guard}
          AND EXISTS (SELECT 1 FROM campaign_checks WHERE id = ? AND revision_id = ? AND kind = ? AND status = 'advisory' AND blocking = 0 AND detail = ?)` )
          .bind(input.campaignId, input.revisionId, ...snapshot.values, check.id, input.revisionId, check.kind, check.detail).first();
        if (!current) return {kind: 'conflict' as const};
      }
      const acknowledgement = await recorded(database, identity);
      return acknowledgement ? {kind: 'acknowledged' as const, acknowledgement} : {kind: 'conflict' as const};
    },
  };
}

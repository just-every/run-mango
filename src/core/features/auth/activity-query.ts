import { z } from 'zod';

const day = /^\d{4}-\d{2}-\d{2}$/;
const instant = (end: boolean) => z.string().min(8).max(40).transform((value, context) => {
  const at = Date.parse(day.test(value) ? `${value}T${end ? '23:59:59.999' : '00:00:00.000'}Z` : value);
  if (Number.isNaN(at)) { context.addIssue({code: 'custom', message: 'Use a date or an ISO time.'}); return z.NEVER; }
  return at;
});

export const activityFilters = z.object({
  operator: z.string().min(1).max(200).optional(),
  agent: z.string().min(1).max(200).optional(),
  action: z.string().min(1).max(200).optional(),
  object: z.string().min(1).max(200).optional(),
  from: instant(false).optional(),
  to: instant(true).optional(),
});
export const activityPage = activityFilters.extend({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  before: z.string().regex(/^\d+:.{1,200}$/).optional(),
});
export type ActivityFilters = z.infer<typeof activityFilters>;

/** Operator and integration-audit entries as one newest-first sequence (OPER-007). */
const entries = `SELECT id,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at FROM lifecycle_audit_entries
  UNION ALL SELECT 'integration:'||id,CASE WHEN actor_id IS NULL THEN 'integration' ELSE 'operator' END,COALESCE(actor_id,credential_id,''),'integration.'||operation,
    'integration',COALESCE(credential_id,''),json_object('status',status,'outcome',outcome),occurred_at FROM integration_audit`;

export type ActivityEntry = {
  id: string; operatorId: string; operatorName: string | null; actorType: string; action: string;
  objectType: string; objectId: string; detail: unknown; occurredAt: number;
};

// Resolve the current saved name from its erasure-aware revision, like the actor
// name above. Copying it into immutable audit custody could retain erased names.
export function activitySelect(filters: ActivityFilters, before?: string) {
  const where: string[] = [], bindings: Array<string | number> = [];
  if (filters.operator) { where.push("e.actor_type IN ('operator','integration') AND e.actor_id=?"); bindings.push(filters.operator); }
  if (filters.agent) { where.push("e.actor_type='agent' AND e.actor_id=?"); bindings.push(filters.agent); }
  if (filters.action) { where.push('e.action=?'); bindings.push(filters.action); }
  if (filters.object) { where.push('e.entity_id=?'); bindings.push(filters.object); }
  if (filters.from !== undefined) { where.push('e.occurred_at>=?'); bindings.push(filters.from); }
  if (filters.to !== undefined) { where.push('e.occurred_at<=?'); bindings.push(filters.to); }
  if (before) {
    const [at, ...id] = before.split(':');
    where.push('(e.occurred_at<? OR (e.occurred_at=? AND e.id<?))'); bindings.push(Number(at), Number(at), id.join(':'));
  }
  return {bindings, sql: `SELECT e.id,e.actor_id AS operatorId,p.display_name AS operatorName,e.actor_type AS actorType,e.action,
    e.entity_type AS objectType,e.entity_id AS objectId,
    CASE WHEN v.id IS NOT NULL THEN json_set(e.detail_json,'$.name',v.name) ELSE e.detail_json END AS detailJson,e.occurred_at AS occurredAt
    FROM (${entries}) e LEFT JOIN operators p ON p.id=e.actor_id AND e.actor_type='operator'
    LEFT JOIN campaign_revisions v ON e.action='draft.saved' AND e.entity_type='campaign-revision' AND v.id=e.entity_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY e.occurred_at DESC,e.id DESC`};
}

export function readEntry({detailJson, ...entry}: Omit<ActivityEntry, 'detail'> & {detailJson: string}): ActivityEntry {
  const detail=JSON.parse(detailJson);
  return {...entry,operatorName:entry.actorType==='agent'&&typeof detail?.preparedBy?.label==='string'?detail.preparedBy.label:entry.operatorName, detail};
}

/** A cell that begins like a formula is read by a spreadsheet as one; the leading quote keeps it text. */
export function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export const csvColumns = ['Time (UTC)', 'Actor type', 'Actor', 'Actor name', 'Action', 'Object type', 'Object', 'Detail'] as const;
export function csvRow(entry: ActivityEntry) {
  return [new Date(entry.occurredAt).toISOString(), entry.actorType, entry.operatorId, entry.operatorName, entry.action, entry.objectType, entry.objectId, entry.detail].map(csvCell).join(',');
}

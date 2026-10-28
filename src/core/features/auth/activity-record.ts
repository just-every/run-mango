import {nativeActor} from '../agent-door/native-context';
export type ActivityRecord = {
  key: string; action: string; entityType: string; entityId: string; actorId: string;
  actorType?: 'operator' | 'system' | 'agent'; detail?: Record<string, unknown>; at?: number;
};

/** One append-only OPER-007 row. The key makes a replay a no-op, so an action is recorded once. */
export function activityStatement(db: D1Database, record: ActivityRecord) {
  const at = record.at ?? Date.now();
  const actor=nativeActor(record.actorId);
  return db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(operation_key) DO NOTHING`)
    .bind(crypto.randomUUID(), record.key, record.entityType, record.entityId, record.action, actor.type==='agent'?'agent':record.actorType ?? actor.type, actor.type==='agent'?actor.id:record.actorType?record.actorId:actor.id, JSON.stringify({...record.detail,...actor.detail}), at, at);
}

export async function recordActivity(db: D1Database, record: ActivityRecord) {
  await activityStatement(db, record).run();
}

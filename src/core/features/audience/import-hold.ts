import type { ImportState } from './import-state';

/** Import states that can still write contacts they planned. */
export const unfinished = ['queued', 'applying', 'failed'];

/** Why an earlier import still holds a contact, in the operator's words. */
export const holdReason = {
  running: 'An earlier import of this contact is still in progress',
  undone: 'An earlier import of this contact was undone',
  abandoned: 'An earlier import of this contact was abandoned',
  restricted: 'An opt-out or suppression was applied to this contact after an earlier import',
  changed: 'This contact changed in Mango after an earlier import',
};

/** A completed import's contact that changed since: an opt-out or suppression recorded after
 * the contact's latest import observation means a restriction changed it. */
function changedReason(state: ImportState, contactId: string) {
  const snapshot = state.snapshots.get(contactId);
  if (!snapshot) return holdReason.changed;
  const observed = Math.max(0, ...snapshot.tables.audience_import_observations.map(row => Number(row.created_at)));
  const restricted = [...snapshot.tables.surviving_opt_outs, ...snapshot.tables.contact_suppressions].some(row => Number(row.occurred_at) > observed);
  return restricted ? holdReason.restricted : holdReason.changed;
}

/** Each contact an earlier import still attributes, with the reason it holds it. An abandoned
 * stream reverses its pages through undo, so its recorded abandonment names the reason. */
export async function heldContacts(db: D1Database, destination: string, state: ImportState) {
  const held = new Map<string, string>();
  if (!state.targets.size) return held;
  const rows = (await db.prepare(`SELECT p.target_id AS id,j.state,json_extract(p.record_json,'$.appliedRevision') AS applied,
      EXISTS(SELECT 1 FROM lifecycle_audit_entries a WHERE a.entity_type='audience-import' AND a.action='import.abandoned'
        AND (a.entity_id=j.id OR a.entity_id IN (SELECT stream_id FROM ik_d1_stream_pages WHERE job_id=j.id))) AS abandoned
    FROM ik_provenance p JOIN ik_jobs j ON j.id=p.job_id WHERE p.reversed=0 AND p.destination=? AND p.target_kind='contact' AND p.target_id IN (SELECT value FROM json_each(?))`)
    .bind(destination, JSON.stringify([...state.targets.keys()])).all<{ id: string; state: string; applied: string; abandoned: number }>()).results;
  for (const row of rows) {
    if (row.state === 'rolling_back' || row.state === 'rolled_back' || row.abandoned) held.set(row.id, holdReason.abandoned);
    else if (unfinished.includes(row.state)) held.set(row.id, holdReason.running);
    else if (row.state !== 'completed') held.set(row.id, holdReason.undone);
    else if (state.targets.get(row.id)?.revision !== row.applied) held.set(row.id, changedReason(state, row.id));
  }
  return held;
}

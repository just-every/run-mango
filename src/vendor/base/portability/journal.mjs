import { all, statement, state, insist, quote } from './storage.mjs';

// Mango uses a source-wide floor. A row hash of a portable address key would
// remain dictionary-testable after deletion, so no row identity is retained.
export async function erasureStatements(db) {
  await state(db);
  return [db.prepare('UPDATE rer_portability_state SET epoch=epoch+1 WHERE id=1'),
    statement(db,'INSERT INTO rer_portability_epochs SELECT source_identity,epoch FROM rer_portability_state WHERE id=1 ON CONFLICT(source) DO UPDATE SET epoch=MAX(epoch,excluded.epoch)')];
}
// Redaction advances the same source-wide floor, without retaining row identity.
export const redactionStatements = erasureStatements;
export async function invalidateTransfersStatements(db) {
  const tables=await all(db,"SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'rer_portability_snap_*' OR name GLOB 'rer_portability_stage_*')");
  return [...tables.map(x=>db.prepare(`DROP TABLE ${quote(x.name)}`)),db.prepare('DELETE FROM rer_portability_segments'),db.prepare('DELETE FROM rer_portability_parts'),
    db.prepare('DELETE FROM rer_portability_jobs'),db.prepare('UPDATE rer_portability_state SET import_job=NULL,applying=0 WHERE id=1')];
}
export async function journal() { return []; }
export function validateAuthority(authority,code='later_journal') {
  insist(authority && typeof authority.sourceIdentity==='string' && authority.sourceIdentity.length>0 && Number.isSafeInteger(authority.epoch) && authority.epoch>=0 && Array.isArray(authority.journal),code);
  insist(authority.journal.every(x=>typeof x==='string' && /^[a-f0-9]{64}$/.test(x)),'invalid_journal');
  // Refuse before staging: retaining the legacy manifest itself would preserve
  // its row hashes, even if mergeJournal no longer inserted them individually.
  insist(authority.journal.length===0,'legacy_row_journal_unsupported',409);
}
export async function fence(db,manifest,later) {
  validateAuthority(manifest,'manifest_identity');
  if(later!==undefined) {
    validateAuthority(later);
    insist(later.sourceIdentity===manifest.sourceIdentity && later.epoch>=manifest.epoch,'later_journal');
  }
  const recorded=await statement(db,'SELECT epoch FROM rer_portability_epochs WHERE source=?',manifest.sourceIdentity).first();
  const s=await state(db);
  insist(manifest.epoch>=Math.max(recorded?.epoch??0,s.source_identity===manifest.sourceIdentity?s.epoch:0,later?.epoch??0),'erasure_epoch');
  // Never elevate an old manifest to later authority: the atomic commit repeats
  // the floor check against this original epoch to catch a concurrent erasure.
  return {epoch:manifest.epoch};
}
export function mergeJournal(db,manifest,checked) {
  return [statement(db,'INSERT INTO rer_portability_epochs VALUES(?,?) ON CONFLICT(source) DO UPDATE SET epoch=MAX(epoch,excluded.epoch)',manifest.sourceIdentity,checked.epoch),
    statement(db,'UPDATE rer_portability_state SET source_identity=?,epoch=? WHERE id=1',manifest.sourceIdentity,checked.epoch)];
}

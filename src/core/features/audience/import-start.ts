import type { ImportPlan } from '@/vendor/base/import-kit/src/types';
import type { NormalizedImportRow } from './import-normalize';
import { applyHeldRestrictions } from './import-held';
import { restoreOptOutLines } from './import-opt-out-lines';
import { claimPortableRestrictions } from './portable-hashes';

const destinations = (plan: ImportPlan) => plan.entries.flatMap(entry => {
  const row = entry.source.payload as unknown as NormalizedImportRow;
  return [row.email, row.phone, ...(row.ledger?.identities.map(identity => identity.destination) ?? [])];
});

/** What every start of a reviewed import writes before any contact, outside its undo plan; a
 * replay changes nothing. Restored opt-outs with no contact are written; an address of this import
 * takes a restored opt-out it had (the review already counted it, import-state); and contacts
 * another import still holds take only their opt-outs (import-held). */
export async function applyStartRestrictions(db: D1Database, salt: string, plan: ImportPlan) {
  await restoreOptOutLines(db, salt, plan);
  await claimPortableRestrictions(db, salt, destinations(plan));
  await applyHeldRestrictions(db, salt, plan);
}

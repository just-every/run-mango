import {audienceSelector as selector, matchAudienceSnapshot, matchAudienceSnapshots, restrictionTables, snapshotColumns} from './import-match';
import { validateLedger } from './import-validation';
import type { D1TargetAdapter, D1Sql } from '@/vendor/base/import-kit/src/d1/index';
import { canonicalJson, sha256 as hashJson } from '@/vendor/base/import-kit/src/d1/index';
import type { TargetRow } from '@/vendor/base/import-kit/src/types';
import type { AudienceSnapshot } from './import-types';

import {ownedTables,readAudienceSnapshots,snapshotTargets} from './import-read';
import {restrictionStatuses} from './import-restrictions';
import {portableHashSql} from './portable-hashes';
export {ownedTables} from './import-read';
const names = new Set<string>(ownedTables);
export function validateSnapshot(value: unknown): asserts value is AudienceSnapshot {
  if (!value || typeof value !== 'object' || !('tables' in value)) throw new Error('Invalid audience ledger snapshot.');
  const snapshot=value as AudienceSnapshot;
  if(!Array.isArray(snapshot.hashes) || !Array.isArray(snapshot.identities)) throw new Error('Audience ledger requires portable destination identities.');
  const tables = snapshot.tables;
  // Released audience ledgers predate incumbent links; upgrading this exact shape adds no authority.
  if(tables&&!Object.hasOwn(tables,'incumbent_consent_links')&&Object.keys(tables).length===ownedTables.length-1&&ownedTables.filter(name=>name!=='incumbent_consent_links').every(name=>Array.isArray(tables[name])))tables.incumbent_consent_links=[];
  if (!tables || Object.keys(tables).length !== ownedTables.length || ownedTables.some(table => !Array.isArray(tables[table]))) throw new Error('Audience ledger snapshot has invalid tables.');
  if (tables.contacts.length !== 1 || !tables.contacts[0].id) throw new Error('Audience ledger snapshot requires exactly one contact.');
  for (const [table, rows] of Object.entries(tables)) {
    if (!names.has(table)) throw new Error('Unknown audience ledger table.');
    for (const row of rows) for (const [column, value] of Object.entries(row)) {
      if (!/^[a-z_][a-z0-9_]*$/.test(column) || !(value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value)))) throw new Error('Invalid audience ledger value.');
    }
  }
  validateLedger(snapshot);
}
/** No write or removal ever takes away an opt-out or suppression: an undo restores a
 * contact's other details, or removes a contact it created, and the restriction stays.
 * archive: an archive move-in's undo also keeps contacts that existed before it or were mailed since. */
export function createAudienceImportTarget(salt: string, options: {archive?: boolean} = {}): D1TargetAdapter & {matchesMany(rows:TargetRow[]):D1Sql[]} {
  const matches = (row: TargetRow | null | undefined, id: string): D1Sql => {
    if (!row) return { sql: 'NOT EXISTS(SELECT 1 FROM contacts WHERE id=?)', params: [id] };
    const snapshot = row.value as unknown as AudienceSnapshot; validateSnapshot(snapshot);
    const parts = matchAudienceSnapshot(id, snapshot);
    return {sql: parts.map(part => `(${part.sql})`).join(' AND '), params: parts.flatMap(part => part.params ?? [])};
  };
  return {
    // Each contact is its own effect with no cross-contact dependency: an edited,
    // unsubscribed or suppressed contact is retained, every unchanged one reverses.
    async preparePreservedUndo(db, destination, effects) {
      const ids = effects.map(effect => effect.provenance.targetId);
      const current = await snapshotTargets(db, destination, await readAudienceSnapshots(db, salt, ids), !options.archive);
      const mailed = new Set(options.archive ? (await db.prepare('SELECT DISTINCT contact_id FROM recipient_steps WHERE contact_id IN (SELECT value FROM json_each(?))')
        .bind(JSON.stringify(ids)).all<{contact_id: string}>()).results.map(row => row.contact_id) : []);
      return {
        observations: effects.map(effect => {
          const row = current.get(effect.provenance.targetId) ?? null;
          const contact = row ? (row.value as unknown as AudienceSnapshot).tables.contacts[0] : null;
          return {effectId: effect.provenance.id, current: row, entity: {table: 'contacts', recordId: effect.provenance.targetId, targetId: effect.provenance.targetId},
            evidence: {emailStatus: contact ? String(contact.email_status) : null}};
        }),
        // An archive undo leaves a contact that existed before the import as it is now,
        // so an opt-out the archive added to it is never rolled back.
        // Mail scheduled or sent to a contact after the import also keeps it.
        dependencies: options.archive ? effects.filter(effect => effect.provenance.before || mailed.has(effect.provenance.targetId)).map(effect => ({requiredEffectId: effect.provenance.id,
          cause: {table: 'contacts', recordId: effect.provenance.targetId, targetId: effect.provenance.targetId},
          evidence: {reason: effect.provenance.before ? 'existed-before-import' : 'mailed-after-import'}})) : [],
        guards: [...ids.map(id => matches(current.get(id) ?? null, id)),
          ...(options.archive ? [{sql: `(SELECT json_group_array(contact_id) FROM (SELECT DISTINCT contact_id FROM recipient_steps WHERE contact_id IN (SELECT value FROM json_each(?)) ORDER BY contact_id))=?`,
            params: [JSON.stringify(ids), JSON.stringify([...mailed].sort())]}] : [])],
      };
    },
    async read(db, destination, _targetKind, targetId) {
      return (await snapshotTargets(db, destination, await readAudienceSnapshots(db, salt, [targetId]), true)).get(targetId);
    },
    matchesMany(rows) { for(const row of rows)validateSnapshot(row.value);return matchAudienceSnapshots(rows); },
    matches(row, _destination, _kind, id) { return matches(row, id); },
    matchesParts(row, _destination, _kind, id) {
      if (!row) return [{sql: 'NOT EXISTS(SELECT 1 FROM contacts WHERE id=?)', params: [id]}];
      const snapshot = row.value as unknown as AudienceSnapshot; validateSnapshot(snapshot);
      return matchAudienceSnapshot(id, snapshot);
    },
    write(row: TargetRow) {
      const snapshot = row.value as unknown as AudienceSnapshot; validateSnapshot(snapshot);
      const statements: D1Sql[] = [];
      const contact=snapshot.tables.contacts[0];
      statements.push({sql:`INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM contacts c WHERE c.id=? AND (c.email IS NOT ? OR (c.email IS NULL AND NOT EXISTS(SELECT 1 FROM contact_phones p WHERE p.contact_id=c.id AND p.phone_e164 IN(SELECT value FROM json_each(?)))))) THEN 1 ELSE 0 END`,params:[contact.id,contact.email,JSON.stringify(snapshot.tables.contact_phones.map(item=>item.phone_e164))]});
      for(const table of ['surviving_opt_outs','contact_suppressions'])if(snapshot.tables[table].length)statements.push({sql:`INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ${table} actual JOIN json_each(?) expected ON actual.id=json_extract(expected.value,'$.id') WHERE actual.destination_hash IS NOT json_extract(expected.value,'$.destination_hash') OR actual.channel IS NOT json_extract(expected.value,'$.channel')) THEN 1 ELSE 0 END`,params:[JSON.stringify(snapshot.tables[table])]});
      for (const table of ownedTables.filter(table=>table!=='surviving_opt_outs')) if(snapshot.tables[table].length) {
        const ownerColumn=table==='contacts'?'id':'contact_id';
        statements.push({sql:`INSERT INTO ik_d1_assertions(ok) SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM ${table} actual JOIN json_each(?) expected ON actual.id=json_extract(expected.value,'$.id') WHERE actual.${ownerColumn} IS NOT json_extract(expected.value,'$.${ownerColumn}')) THEN 1 ELSE 0 END`,params:[JSON.stringify(snapshot.tables[table])]});
      }
      for (const table of ownedTables) {
        const restriction = restrictionTables.includes(table);
        const selected = selector(table, row.targetId, snapshot);
        const ids = snapshot.tables[table].map(item => item.id);
        if (!restriction) statements.push({ sql: `DELETE FROM ${table} WHERE (${selected.sql})${ids.length ? ` AND id NOT IN (SELECT value FROM json_each(?))` : ''}`, params: [...selected.params!, ...(ids.length?[JSON.stringify(ids)]:[])] });
        const entries=snapshot.tables[table];
        if(entries.length){
          const columns=snapshotColumns(entries);
          // An equal opt-out recorded since (same address, channel and reason) already stands.
          statements.push({sql:`INSERT INTO ${table} (${columns.join(',')}) SELECT ${columns.map(column=>`json_extract(value,'$.${column}')`).join(',')} FROM json_each(?) WHERE 1 ON CONFLICT(id) DO UPDATE SET ${columns.filter(column=>column!=='id').map(column=>`${column}=excluded.${column}`).join(',')}${restriction?' ON CONFLICT DO NOTHING':''}`,params:[JSON.stringify(entries)]});
        }
      }
      statements.push(...restrictionStatuses(snapshot));
      // Each address's portable identity, so an opt-out that outlives this contact still leaves in an export.
      statements.push(...snapshot.identities.map(identity => portableHashSql(identity.hash, identity.destination)));
      statements.push({ sql: 'INSERT INTO mango_import_revisions(contact_id,revision,value_hash) VALUES (?,?,?) ON CONFLICT(contact_id) DO UPDATE SET revision=excluded.revision,value_hash=excluded.value_hash', params: [row.targetId, row.revision, hashJson(canonicalJson(snapshot))] });
      return statements;
    },
    remove(_destination, _kind, id) {
      return [
        {sql: 'UPDATE contact_suppressions SET contact_id=NULL WHERE contact_id=?', params: [id]},
        ...ownedTables.filter(table => !restrictionTables.includes(table)).reverse().map(table => ({ sql: `DELETE FROM ${table} WHERE ${table === 'contacts' ? 'id' : 'contact_id'}=?`, params: [id] })),
        { sql: 'DELETE FROM mango_import_revisions WHERE contact_id=?', params: [id] },
      ];
    },
    async list(db, destination) {
      return [...(await snapshotTargets(db,destination,await readAudienceSnapshots(db,salt))).values()];
    },
  };
}

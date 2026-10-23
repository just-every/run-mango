import type {D1Database} from '@/vendor/base/import-kit/src/d1/index';
import {sha256} from '@/core/shared/ids';
import type {NativeRow} from './import-types';
import type {NormalizedImportRow} from './import-normalize';
import {readAudienceSnapshots,snapshotTargets} from './import-read';
import {portableHash} from './portable-hashes';

export async function readImportState(db:D1Database,rows:NormalizedImportRow[],salt:string,destination:string){
 const identities=[...new Set(rows.flatMap(row=>[row.email,row.phone,...(row.ledger?.identities.map(identity=>identity.destination)??[])]).filter(Boolean))];
 const selected=JSON.stringify(identities);
 const owners=(await db.prepare('SELECT email AS identity,contact_id AS id FROM contact_email_addresses WHERE email IN (SELECT value FROM json_each(?)) UNION SELECT email AS identity,id FROM contacts WHERE email IN (SELECT value FROM json_each(?)) UNION SELECT phone_e164 AS identity,contact_id AS id FROM contact_phones WHERE phone_e164 IN (SELECT value FROM json_each(?))').bind(selected,selected,selected).all<{identity:string;id:string}>()).results;
 const byIdentity=new Map(owners.map(row=>[row.identity,row.id]));
 const snapshots=await readAudienceSnapshots(db,salt,[...new Set(owners.map(row=>row.id))]);
 const targets=await snapshotTargets(db,destination,snapshots,true);
 const exportedIds=rows.flatMap(row=>row.ledger?[String(row.ledger.tables.contacts[0]?.id)]:[]);
 const existingIds=new Set((await db.prepare('SELECT id FROM contacts WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(exportedIds)).all<{id:string}>()).results.map(row=>row.id));
 const salted=await Promise.all(identities.map(identity=>sha256(`${salt}:${identity}`))),hashes=JSON.stringify(salted);
 // A restored opt-out still named by its portable identity counts as this address's own: the import's
 // start gives it this installation's hash before any contact is written (import-start).
 const portable=new Map(identities.map((identity,index)=>[portableHash(identity),salted[index]])),restored=JSON.stringify([...portable.keys()]);
 const read=async(table:string)=>[...(await db.prepare(`SELECT * FROM ${table} WHERE destination_hash IN (SELECT value FROM json_each(?)) ORDER BY id`).bind(hashes).all<NativeRow>()).results,
  ...(await db.prepare(`SELECT * FROM ${table} WHERE destination_hash IN (SELECT value FROM json_each(?)) ORDER BY id`).bind(restored).all<NativeRow>()).results.map((row):NativeRow=>({...row,destination_hash:portable.get(String(row.destination_hash))!}))]
  .sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const optOuts=await read('surviving_opt_outs'),suppressions=await read('contact_suppressions');
 const attestationIds=[...new Set([...rows.flatMap(row=>row.incumbent?[row.incumbent.id]:[]),...rows.flatMap(row=>(row.ledger?.tables.incumbent_consent_links??[]).map(link=>String(link.attestation_id))),...[...snapshots.values()].flatMap(snapshot=>snapshot.tables.incumbent_consent_links.map(link=>String(link.attestation_id)))])];
 const activeAttestations=new Set((await db.prepare('SELECT id FROM consent_attestations WHERE revoked_at IS NULL AND id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(attestationIds)).all<{id:string}>()).results.map(row=>row.id));
 const incumbentLinks=new Map((await db.prepare('SELECT * FROM incumbent_consent_links WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(rows.flatMap(row=>(row.ledger?.tables.incumbent_consent_links??[]).map(link=>link.id)))).all<NativeRow>()).results.map(row=>[String(row.id),row]));
 return {byIdentity,snapshots,targets,existingIds,optOuts,suppressions,activeAttestations,incumbentLinks};
}
export type ImportState=Awaited<ReturnType<typeof readImportState>>;

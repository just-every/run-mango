import {canonicalJson,sha256 as digest,type D1Database} from '@/vendor/base/import-kit/src/d1/index';
import type {TargetRow,Json} from '@/vendor/base/import-kit/src/types';
import {sha256} from '@/core/shared/ids';
import type {AudienceSnapshot,NativeRow} from './import-types';
import {restoredValues} from './import-recorded';

export const ownedTables = ['contacts', 'contact_email_addresses', 'contact_phones', 'consent_evidence', 'contact_history', 'contact_suppressions', 'surviving_opt_outs', 'mango_audience_hashes', 'consent_capture_metadata', 'consent_confirmations', 'audience_import_observations'] as const;

// Cloudflare D1 limits checked 2026-10-07: 1000 queries/invocation on Paid,
// 50 on Free, 100 bindings and 100 KB SQL per statement. A batch still counts
// every statement: use set reads, not one query per contact in a batch.
// https://developers.cloudflare.com/d1/platform/limits/
export async function readAudienceSnapshots(db:D1Database,salt:string,ids?:string[]) {
 const contacts=(await (ids?db.prepare('SELECT * FROM contacts WHERE id IN (SELECT value FROM json_each(?)) ORDER BY id').bind(JSON.stringify(ids)):db.prepare('SELECT * FROM contacts ORDER BY id')).all<NativeRow>()).results;
 const snapshots=new Map<string,AudienceSnapshot>(contacts.map(contact=>[String(contact.id),{tables:Object.fromEntries(ownedTables.map(table=>[table,table==='contacts'?[contact]:[]])),hashes:[],identities:[]} ]));
 if(!contacts.length)return snapshots;
 const selected=JSON.stringify([...snapshots.keys()]);
 for(const table of ownedTables.filter(table=>!['contacts','surviving_opt_outs','contact_suppressions'].includes(table))){
  const rows=(await db.prepare(`SELECT * FROM ${table} WHERE contact_id IN (SELECT value FROM json_each(?)) ORDER BY id`).bind(selected).all<NativeRow>()).results;
  // An observation without a name in its file carries no name key, so a revision
  // recorded before migration 0037 added the column still matches.
  if(table==='audience_import_observations')for(const row of rows)if(row.source_display_name===null)delete row.source_display_name;
  for(const row of rows)snapshots.get(String(row.contact_id))!.tables[table].push(row);
 }
 const byHash=new Map<string,Set<AudienceSnapshot>>();
 for(const snapshot of snapshots.values()){
  snapshot.identities=await Promise.all([...snapshot.tables.contact_email_addresses.map(row=>({channel:'email',destination:String(row.email)})),...snapshot.tables.contact_phones.map(row=>({channel:'sms',destination:String(row.phone_e164)}))].map(async identity=>({...identity,hash:await sha256(`${salt}:${identity.destination}`)})));
  snapshot.hashes=snapshot.identities.map(identity=>identity.hash);
  for(const hash of snapshot.hashes){if(!byHash.has(hash))byHash.set(hash,new Set());byHash.get(hash)!.add(snapshot);}
 }
 const hashes=JSON.stringify([...byHash.keys()]);
 for(const table of ['contact_suppressions','surviving_opt_outs']){
  const query=table==='contact_suppressions'?'contact_id IN (SELECT value FROM json_each(?)) OR destination_hash IN (SELECT value FROM json_each(?))':'destination_hash IN (SELECT value FROM json_each(?))';
  const rows=(await db.prepare(`SELECT * FROM ${table} WHERE ${query} ORDER BY id`).bind(...(table==='contact_suppressions'?[selected,hashes]:[hashes])).all<NativeRow>()).results;
  for(const row of rows){const owners=new Set(byHash.get(String(row.destination_hash)));const owner=snapshots.get(String(row.contact_id));if(table==='contact_suppressions'&&owner)owners.add(owner);for(const snapshot of owners)snapshot.tables[table].push(row);}
 }
 return snapshots;
}
/** The snapshot as its recorded revision hashed it: revisions written on 71ec3d9
 * carried a null name key on every observation without a name. */
function recordedShape(value:AudienceSnapshot,valueHash:string|undefined){
 if(valueHash===undefined||!value.tables.audience_import_observations.some(row=>!Object.hasOwn(row,'source_display_name')))return value;
 const named=structuredClone(value);
 for(const row of named.tables.audience_import_observations)if(!Object.hasOwn(row,'source_display_name'))row.source_display_name=null;
 return digest(canonicalJson(named))===valueHash?named:value;
}
/** restored: a contact whose only changes since its recorded revision are opt-outs or
 * suppressions and the statuses they raise still holds that revision (import-recorded), for
 * Preview, apply, undo and abandon. Exports read the exact value. */
export async function snapshotTargets(db:D1Database,destination:string,snapshots:Map<string,AudienceSnapshot>,restored=false):Promise<Map<string,TargetRow>> {
 if(!snapshots.size)return new Map();
 const revisions=(await db.prepare('SELECT contact_id,revision,value_hash FROM mango_import_revisions WHERE contact_id IN (SELECT value FROM json_each(?))').bind(JSON.stringify([...snapshots.keys()])).all<{contact_id:string;revision:string;value_hash:string}>()).results;
 const byId=new Map(revisions.map(row=>[row.contact_id,row]));
 const read=[...snapshots].map(([targetId,current])=>{const revision=byId.get(targetId),value=recordedShape(current,revision?.value_hash);return {targetId,current,revision,value,hash:digest(canonicalJson(value))};});
 const changed=restored?read.filter(item=>item.revision&&item.revision.value_hash!==item.hash).map(item=>({id:item.targetId,current:item.current,revision:item.revision!.revision,valueHash:item.revision!.value_hash})):[];
 const recorded=await restoredValues(db,destination,changed);
 return new Map(read.map(({targetId,revision,value,hash})=>{
  const kept=recorded.get(targetId);
  return [targetId,kept?{destination,targetKind:'contact',targetId,value:kept as unknown as Json,revision:revision!.revision}:{destination,targetKind:'contact',targetId,value:value as unknown as Json,revision:revision?.value_hash===hash?revision.revision:hash}];
 }));
}

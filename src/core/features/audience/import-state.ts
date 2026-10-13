import type {D1Database} from '@/vendor/base/import-kit/src/d1/index';
import {sha256} from '@/core/shared/ids';
import type {NativeRow} from './import-types';
import type {NormalizedImportRow} from './import-normalize';
import {readAudienceSnapshots,snapshotTargets} from './import-read';

export async function readImportState(db:D1Database,rows:NormalizedImportRow[],salt:string,destination:string){
 const identities=[...new Set(rows.flatMap(row=>[row.email,...(row.ledger?.identities.map(identity=>identity.destination)??[])]).filter(Boolean))];
 const selected=JSON.stringify(identities);
 const owners=(await db.prepare('SELECT email AS identity,contact_id AS id FROM contact_email_addresses WHERE email IN (SELECT value FROM json_each(?)) UNION SELECT email AS identity,id FROM contacts WHERE email IN (SELECT value FROM json_each(?)) UNION SELECT phone_e164 AS identity,contact_id AS id FROM contact_phones WHERE phone_e164 IN (SELECT value FROM json_each(?))').bind(selected,selected,selected).all<{identity:string;id:string}>()).results;
 const byIdentity=new Map(owners.map(row=>[row.identity,row.id]));
 const snapshots=await readAudienceSnapshots(db,salt,[...new Set(owners.map(row=>row.id))]);
 const targets=await snapshotTargets(db,destination,snapshots,true);
 const exportedIds=rows.flatMap(row=>row.ledger?[String(row.ledger.tables.contacts[0]?.id)]:[]);
 const existingIds=new Set((await db.prepare('SELECT id FROM contacts WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(exportedIds)).all<{id:string}>()).results.map(row=>row.id));
 const hashes=JSON.stringify(await Promise.all(identities.map(identity=>sha256(`${salt}:${identity}`))));
 const optOuts=(await db.prepare('SELECT * FROM surviving_opt_outs WHERE destination_hash IN (SELECT value FROM json_each(?)) ORDER BY id').bind(hashes).all<NativeRow>()).results;
 const suppressions=(await db.prepare('SELECT * FROM contact_suppressions WHERE destination_hash IN (SELECT value FROM json_each(?)) ORDER BY id').bind(hashes).all<NativeRow>()).results;
 return {byIdentity,snapshots,targets,existingIds,optOuts,suppressions};
}
export type ImportState=Awaited<ReturnType<typeof readImportState>>;

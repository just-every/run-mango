import type {D1Sql} from '@/vendor/base/import-kit/src/d1/index';
import type {TargetRow} from '@/vendor/base/import-kit/src/types';
import type {AudienceSnapshot} from './import-types';
import {ownedTables} from './import-read';

export function audienceSelector(table: string, id: string, snapshot?: AudienceSnapshot): D1Sql {
  if (table === 'contacts') return { sql: 'id = ?', params: [id] };
  if (table === 'surviving_opt_outs' || table === 'contact_suppressions') {
    const hashes = snapshot?.hashes ?? [];
    return { sql: `${table === 'contact_suppressions' ? 'contact_id = ? OR ' : ''}destination_hash IN (SELECT value FROM json_each(?))`, params: [...(table === 'contact_suppressions' ? [id] : []), JSON.stringify(hashes)] };
  }
  return { sql: 'contact_id = ?', params: [id] };
}
/** Every column a table's rows carry: a row may omit a column that is null (import-read). */
export const snapshotColumns=(entries:Array<Record<string,unknown>>)=>[...new Set(entries.flatMap(entry=>Object.keys(entry)))];
/** Opt-outs and suppressions only ever accumulate: an import writes the snapshot's own and
 * never removes another, so a destination may carry more than its snapshot. */
export const restrictionTables=['surviving_opt_outs','contact_suppressions'];
const statusColumns:Record<string,string[]>={contacts:['email_status','sms_status'],contact_email_addresses:['channel_status'],contact_phones:['channel_status']};
const rank=(value:string)=>`CASE ${value} WHEN 'subscribed' THEN 0 WHEN 'pending' THEN 1 WHEN 'non-subscribed' THEN 2 WHEN 'unsubscribed' THEN 3 WHEN 'suppressed' THEN 4 END`;
/** A status column matches its snapshot, or a stricter opt-out or suppression recorded since. */
function columnMatches(table:string,column:string,expected:string){
 const exact=`actual.${column} IS ${expected}`;
 return statusColumns[table]?.includes(column)?`(${exact} OR (actual.${column} IN ('unsubscribed','suppressed') AND ${rank(`actual.${column}`)}>${rank(expected)}))`:exact;
}
/** Split the same row predicates for Base's bounded atomic fence. */
export function matchAudienceSnapshot(id:string,snapshot:AudienceSnapshot):D1Sql[]{
 const predicates:D1Sql[]=[];
 for(const table of ownedTables){
  const selected=audienceSelector(table,id,snapshot),entries=snapshot.tables[table];
  if(restrictionTables.includes(table)){
   if(entries.length)predicates.push({sql:`NOT EXISTS(SELECT 1 FROM json_each(?) expected WHERE NOT EXISTS(SELECT 1 FROM ${table} actual WHERE actual.destination_hash IS json_extract(expected.value,'$.destination_hash') AND actual.channel IS json_extract(expected.value,'$.channel')))`,params:[JSON.stringify(entries)]});
   continue;
  }
  predicates.push({sql:`(SELECT count(*) FROM ${table} WHERE (${selected.sql}))=?`,params:[...selected.params!,entries.length]});
  if(entries.length){
   const columns=snapshotColumns(entries);
   predicates.push({sql:`NOT EXISTS(SELECT 1 FROM json_each(?) expected WHERE NOT EXISTS(SELECT 1 FROM ${table} actual WHERE ${columns.map(column=>columnMatches(table,column,`json_extract(expected.value,'$.${column}')`)).join(' AND ')}))`,params:[JSON.stringify(entries)]});
  }
 }
 return predicates;
}

/** Exact table cardinalities and every column remain inside the atomic fence. */
export function matchAudienceSnapshots(rows:TargetRow[]):D1Sql[]{
 const predicates:D1Sql[]=[{sql:'(SELECT count(*) FROM contacts)=?',params:[rows.length]}];
 for(const table of ownedTables){
  const snapshots=rows.map(row=>({id:row.targetId,hashes:(row.value as unknown as AudienceSnapshot).hashes,rows:(row.value as unknown as AudienceSnapshot).tables[table]}));
  const columns=snapshotColumns(snapshots.flatMap(snapshot=>snapshot.rows));
  const id="json_extract(expected.value,'$.id')";
  const hashes="SELECT value FROM json_each(expected.value,'$.hashes')";
  const selected=table==='contacts'?`actual.id=${id}`:table==='surviving_opt_outs'?`actual.destination_hash IN (${hashes})`:table==='contact_suppressions'?`actual.contact_id=${id} OR actual.destination_hash IN (${hashes})`:`actual.contact_id=${id}`;
  const sql=`NOT EXISTS(SELECT 1 FROM json_each(?) expected WHERE (SELECT count(*) FROM ${table} actual WHERE (${selected}))<>json_array_length(expected.value,'$.rows')${columns.length?` OR EXISTS(SELECT 1 FROM json_each(expected.value,'$.rows') item WHERE NOT EXISTS(SELECT 1 FROM ${table} actual WHERE ${columns.map(column=>`actual.${column} IS json_extract(item.value,'$.${column}')`).join(' AND ')}))`:''})`;
  // 50 contacts bounds routine JSON parameters; the database applies the same
  // exact predicates to every group and no expected ledger rows are dropped.
  for(let offset=0;offset<snapshots.length;offset+=50)predicates.push({sql,params:[JSON.stringify(snapshots.slice(offset,offset+50))]});
 }
 return predicates;
}

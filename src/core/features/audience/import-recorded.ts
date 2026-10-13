import {canonicalJson,sha256 as digest,type D1Database} from '@/vendor/base/import-kit/src/d1/index';
import type {AudienceSnapshot,NativeRow} from './import-types';
import {readAudiencePlan} from './import-plans';

// An opt-out or suppression recorded after a contact's snapshot was written adds its row and
// raises the statuses it covers, and changes nothing else: an undo or abandon that writes an
// earlier import's snapshot back keeps every restriction (import-restrictions), and so does an
// import's held row (import-held). Such a contact still holds its recorded revision, so the
// import that wrote it can still be undone or abandoned, and the restrictions stay.
const statusColumns:Record<string,string[]>={contacts:['email_status','sms_status'],contact_email_addresses:['channel_status'],contact_phones:['channel_status']};
const restrictionTables=['surviving_opt_outs','contact_suppressions'];
const rank:Record<string,number>={subscribed:0,pending:1,'non-subscribed':2,unsubscribed:3,suppressed:4};
const stricter=(actual:unknown,recorded:unknown)=>actual===recorded||(['unsubscribed','suppressed'].includes(String(actual))&&rank[String(actual)]>rank[String(recorded)]);
/** An observation without a name carries no name key, as Mango reads it (import-read). */
const shape=(row:NativeRow)=>{const copy={...row};if(copy.source_display_name===null)delete copy.source_display_name;return canonicalJson(copy);};

const channels:Record<string,string>={email_status:'email',sms_status:'sms'},tableChannels:Record<string,string>={contact_email_addresses:'email',contact_phones:'sms'};

function onlyRestricted(current:AudienceSnapshot,recorded:AudienceSnapshot){
 if(canonicalJson(current.identities)!==canonicalJson(recorded.identities)||canonicalJson(current.hashes)!==canonicalJson(recorded.hashes))return false;
 // A raised status is a restriction's only when an opt-out or suppression the recorded value
 // does not carry explains it; writing that value back keeps the status (import-restrictions).
 const since=(table:string)=>{const ids=new Set(recorded.tables[table].map(row=>String(row.id)));return current.tables[table].filter(row=>!ids.has(String(row.id)));};
 const optOuts=since('surviving_opt_outs'),suppressions=since('contact_suppressions');
 const explained=(status:unknown,channel:string)=>[...(status==='suppressed'?[]:optOuts),...suppressions].some(row=>row.channel===channel);
 return Object.entries(recorded.tables).every(([table,rows])=>{
  const actual=new Map((current.tables[table]??[]).map(row=>[String(row.id),row]));
  if(restrictionTables.includes(table))return rows.every(row=>actual.has(String(row.id))&&shape(actual.get(String(row.id))!)===shape(row));
  if(actual.size!==rows.length)return false;
  const columns=statusColumns[table]??[];
  return rows.every(row=>{
   const now=actual.get(String(row.id));
   if(!now||!columns.every(column=>stricter(now[column],row[column])&&(now[column]===row[column]||explained(now[column],channels[column]??tableChannels[table]))))return false;
   return shape({...now,...Object.fromEntries(columns.map(column=>[column,row[column]]))})===shape(row);
  });
 });
}

const restricted=(snapshot:AudienceSnapshot)=>restrictionTables.some(table=>snapshot.tables[table].length)||Object.entries(statusColumns).some(([table,columns])=>snapshot.tables[table].some(row=>columns.some(column=>['unsubscribed','suppressed'].includes(String(row[column])))));

/** For each changed contact, the value its recorded revision was written with, when only
 * restrictions changed it since: the before image an undo or abandon wrote back, or the
 * reviewed effect an import wrote. */
export async function restoredValues(db:D1Database,destination:string,changed:Array<{id:string;current:AudienceSnapshot;revision:string;valueHash:string}>){
 const found=new Map<string,AudienceSnapshot>();
 const candidates=changed.filter(item=>restricted(item.current));
 if(!candidates.length)return found;
 const ids=JSON.stringify(candidates.map(item=>item.id)),revisions=JSON.stringify(candidates.map(item=>item.revision));
 const written=(await db.prepare("SELECT target_id,json_extract(record_json,'$.before.revision') AS revision,json_extract(record_json,'$.before.value') AS value FROM ik_provenance WHERE reversed=1 AND destination=? AND target_kind='contact' AND target_id IN (SELECT value FROM json_each(?)) AND json_extract(record_json,'$.before.revision') IN (SELECT value FROM json_each(?))")
  .bind(destination,ids,revisions).all<{target_id:string;revision:string;value:string}>()).results.map(row=>({id:row.target_id,revision:row.revision,value:()=>Promise.resolve(JSON.parse(row.value) as AudienceSnapshot)}));
 const applied=(await db.prepare(`SELECT p.target_id,p.effect_ordinal,json_extract(p.record_json,'$.appliedRevision') AS revision,json_extract(p.record_json,'$.sourceId') AS source_id,
   COALESCE((SELECT s.operation_key FROM ik_d1_stream_pages sp JOIN ik_d1_streams s ON s.id=sp.stream_id WHERE sp.job_id=p.job_id),j.operation_key) AS fingerprint
   FROM ik_provenance p JOIN ik_jobs j ON j.id=p.job_id WHERE p.reversed=0 AND p.destination=? AND p.target_kind='contact' AND p.target_id IN (SELECT value FROM json_each(?)) AND json_extract(p.record_json,'$.appliedRevision') IN (SELECT value FROM json_each(?))`)
  .bind(destination,ids,revisions).all<{target_id:string;effect_ordinal:number;revision:string;source_id:string;fingerprint:string}>()).results;
 const plans=new Map<string,Promise<Map<string,AudienceSnapshot[]>>>();
 const plan=(fingerprint:string)=>{
  if(!plans.has(fingerprint))plans.set(fingerprint,(async()=>{
   const stored=await db.prepare('SELECT fingerprint,plan_json FROM audience_import_plans WHERE fingerprint=?').bind(fingerprint).first<{fingerprint:string;plan_json:string}>();
   const entries=stored?(await readAudiencePlan(db as unknown as Parameters<typeof readAudiencePlan>[0],stored)).entries:[];
   return new Map(entries.map(entry=>[entry.source.sourceId,entry.effects.map(effect=>effect.value as unknown as AudienceSnapshot)]));
  })());
  return plans.get(fingerprint)!;
 };
 const sources=[...written,...applied.map(row=>({id:row.target_id,revision:row.revision,value:async()=>(await plan(row.fingerprint)).get(row.source_id)?.[row.effect_ordinal]}))];
 for(const item of candidates){
  for(const source of sources.filter(source=>source.id===item.id&&source.revision===item.revision)){
   const value=await source.value();
   if(value&&digest(canonicalJson(value))===item.valueHash&&onlyRestricted(item.current,value)){found.set(item.id,value);break;}
  }
 }
 return found;
}

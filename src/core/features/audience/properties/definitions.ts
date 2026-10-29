import seed from '../../../../../seed.json' with {type:'json'};
import {z} from 'zod';
import {propertyTypes,PropertyError,type PropertyDefinition} from './types';
import {propertyDefinitions,propertyFields,readTypedProperty} from './read';
export const propertyLimit=seed.limits.maxContactProperties;
export const definitionInput=z.object({key:z.string().regex(/^[a-z][a-z0-9_]{0,99}$/).refine(key=>!['displayName','unsubscribe_url','physical_address','__proto__','constructor','prototype'].includes(key)),label:z.string().trim().min(1).max(160),type:z.enum(propertyTypes),options:z.array(z.string().trim().min(1).max(160)).max(100).default([])}).strict().refine(d=>d.type!=='list'||(d.options.length>0&&new Set(d.options).size===d.options.length));
export async function definitionUsage(db:D1Database,definition:PropertyDefinition) {
  const rows=(await db.prepare(`SELECT contact_id,fields_json,NULL detail,'' kind,0 phase,0 occurred_at,contact_id id FROM integration_contact_profiles p
    WHERE EXISTS(SELECT 1 FROM json_each(p.fields_json) e WHERE e.key=?)
    UNION ALL SELECT contact_id,NULL,detail,kind,CASE kind WHEN 'incumbent-profile' THEN 1 ELSE 2 END,occurred_at,id FROM contact_history h
    WHERE (kind='property-change' AND json_extract(detail,'$.key')=?) OR (kind='incumbent-profile' AND EXISTS(SELECT 1 FROM json_each(h.detail,'$.fields') e WHERE e.key=?))
    ORDER BY contact_id,phase,occurred_at,id`).bind(definition.key,definition.key,definition.key).all<{contact_id:string;fields_json:string|null;kind:string;detail:string}>()).results;
  const contacts=new Map<string,{fields:Record<string,unknown>;history:Array<{kind:string;detail:string}>}>();
  for(const row of rows){let state=contacts.get(row.contact_id);if(!state){state={fields:{},history:[]};contacts.set(row.contact_id,state);}if(row.fields_json!==null)state.fields=JSON.parse(row.fields_json);else state.history.push(row);}
  let invalid=0;for(const state of contacts.values())if(readTypedProperty(definition,propertyFields(state.fields,state.history)).error)invalid++;
  return {recordedContacts:contacts.size,invalidLegacyValues:invalid};
}

export async function saveDefinition(db:D1Database,input:PropertyDefinition,update=false) {
  const prior=(await propertyDefinitions(db)).find(d=>d.key===input.key),now=Date.now();
  if(update&&!prior)throw new PropertyError('property_not_found',input.key,404);
  if(!update&&prior)throw new PropertyError('property_key_exists',input.key,409);
  if(prior&&(prior.type!==input.type||JSON.stringify(prior.options)!==JSON.stringify(input.options))&&(await definitionUsage(db,prior)).recordedContacts)throw new PropertyError('property_type_locked',input.key,409);
  const used=`EXISTS(SELECT 1 FROM integration_contact_profiles p,json_each(p.fields_json) e WHERE e.key=?) OR EXISTS(SELECT 1 FROM contact_history WHERE kind='property-change' AND json_extract(detail,'$.key')=?) OR EXISTS(SELECT 1 FROM contact_history h,json_each(h.detail,'$.fields') e WHERE h.kind='incumbent-profile' AND e.key=?)`;
  const result=update?await db.prepare(`UPDATE contact_property_definitions SET label=?,type=?,options_json=?,updated_at=? WHERE key=?
    AND ((type=? AND options_json=?) OR NOT (${used}))`).bind(input.label,input.type,JSON.stringify(input.options),now,input.key,input.type,JSON.stringify(input.options),input.key,input.key,input.key).run():
    await db.prepare(`INSERT INTO contact_property_definitions(key,label,type,options_json,created_at,updated_at)
      SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM contact_property_definitions)<? ON CONFLICT(key) DO NOTHING`)
      .bind(input.key,input.label,input.type,JSON.stringify(input.options),now,now,propertyLimit).run();
  if(!result.meta.changes)throw new PropertyError(update?'property_type_locked':'property_count_limit',input.key,update?409:400);
  return input;
}
export async function deleteDefinition(db:D1Database,key:string) {
  if(!(await propertyDefinitions(db)).some(d=>d.key===key))throw new PropertyError('property_not_found',key,404);
  await db.batch([
    db.prepare("UPDATE integration_contact_profiles SET fields_json=json_remove(fields_json,'$.\"'||?||'\"')").bind(key),
    db.prepare("UPDATE contact_history SET detail=json_remove(detail,'$.fields.\"'||?||'\"') WHERE kind='incumbent-profile'").bind(key),
    db.prepare("DELETE FROM contact_history WHERE kind='property-change' AND json_extract(detail,'$.key')=?").bind(key),
    db.prepare('DELETE FROM contact_property_definitions WHERE key=?').bind(key),
  ]);
}

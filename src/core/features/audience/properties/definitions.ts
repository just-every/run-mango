import seed from '../../../../../seed.json' with {type:'json'};
import {z} from 'zod';
import {propertyTypes,PropertyError,type PropertyDefinition} from './types';
import {propertyDefinitions,readPropertyFields,readTypedProperty} from './read';
export const propertyLimit=seed.limits.maxContactProperties;
export const definitionInput=z.object({key:z.string().regex(/^[a-z][a-z0-9_]{0,99}$/).refine(key=>!['displayName','unsubscribe_url','physical_address','__proto__','constructor','prototype'].includes(key)),label:z.string().trim().min(1).max(160),type:z.enum(propertyTypes),options:z.array(z.string().trim().min(1).max(160)).max(100).default([])}).strict().refine(d=>d.type!=='list'||(d.options.length>0&&new Set(d.options).size===d.options.length));
export async function definitionUsage(db:D1Database,definition:PropertyDefinition) {
  const values=(await db.prepare(`SELECT p.contact_id,e.value rawValue,e.type valueType FROM integration_contact_profiles p,json_each(p.fields_json) e
    WHERE e.key=? AND NOT EXISTS(SELECT 1 FROM contact_history h WHERE h.contact_id=p.contact_id AND h.kind='property-change' AND json_extract(h.detail,'$.key')=?)
    UNION ALL SELECT h.contact_id,json_extract(h.detail,'$.newValue'),json_type(h.detail,'$.newValue') FROM contact_history h
    WHERE h.kind='property-change' AND json_extract(h.detail,'$.key')=? AND NOT EXISTS(SELECT 1 FROM contact_history n
      WHERE n.contact_id=h.contact_id AND n.kind='property-change' AND json_extract(n.detail,'$.key')=? AND (n.occurred_at>h.occurred_at OR n.occurred_at=h.occurred_at AND n.id>h.id))`)
    .bind(definition.key,definition.key,definition.key,definition.key).all<{contact_id:string;rawValue:unknown;valueType:string}>()).results;
  let invalid=0;
  for(const row of values){const value=row.valueType==='array'?JSON.parse(String(row.rawValue)):row.valueType==='true'?true:row.valueType==='false'?false:row.rawValue;if(readTypedProperty(definition,{[definition.key]:value}).error)invalid++;}

  return {recordedContacts:values.length,invalidLegacyValues:invalid};
}
export async function saveDefinition(db:D1Database,input:PropertyDefinition,update=false) {
  const prior=(await propertyDefinitions(db)).find(d=>d.key===input.key),now=Date.now();
  if(update&&!prior)throw new PropertyError('property_not_found',input.key,404);
  if(!update&&prior)throw new PropertyError('property_key_exists',input.key,409);
  if(prior&&(prior.type!==input.type||JSON.stringify(prior.options)!==JSON.stringify(input.options))&&(await definitionUsage(db,prior)).recordedContacts)throw new PropertyError('property_type_locked',input.key,409);
  const result=await db.prepare(`INSERT INTO contact_property_definitions(key,label,type,options_json,created_at,updated_at)
    SELECT ?,?,?,?,?,? WHERE ? OR (SELECT count(*) FROM contact_property_definitions)<?
    ON CONFLICT(key) DO UPDATE SET label=excluded.label,type=excluded.type,options_json=excluded.options_json,updated_at=excluded.updated_at`)
    .bind(input.key,input.label,input.type,JSON.stringify(input.options),now,now,update?1:0,propertyLimit).run();
  if(!result.meta.changes)throw new PropertyError('property_count_limit',input.key);
  return input;
}
export async function deleteDefinition(db:D1Database,key:string) {
  if(!(await propertyDefinitions(db)).some(d=>d.key===key))throw new PropertyError('property_not_found',key,404);
  await db.batch([
    db.prepare("UPDATE integration_contact_profiles SET fields_json=json_remove(fields_json,'$.\"'||?||'\"')").bind(key),
    db.prepare("DELETE FROM contact_history WHERE kind='property-change' AND json_extract(detail,'$.key')=?").bind(key),
    db.prepare('DELETE FROM contact_property_definitions WHERE key=?').bind(key),
  ]);
}

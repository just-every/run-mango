import {ulid,stableJson} from '@/core/shared/ids';
import {propertyDefinitions,readPropertyFields,readTypedProperty} from './read';
import {validateProperty} from './validation';
import {PropertyError,type PropertyDefinition,type PropertySource,type PropertyChange} from './types';
export function validatePropertyFields(definitions:PropertyDefinition[],fields:Record<string,unknown>) {
  const result:Record<string,unknown>=Object.assign(Object.create(null),fields);
  for(const definition of definitions)if(Object.hasOwn(fields,definition.key))result[definition.key]=validateProperty(definition,fields[definition.key]);
  return result;
}
export function changedProperties(definitions:PropertyDefinition[],before:Record<string,unknown>,fields:Record<string,unknown>,source:PropertySource,replace=false):PropertyChange[] {
  return definitions.flatMap(definition=>{
    if(!replace&&!Object.hasOwn(fields,definition.key))return [];
    const old=readTypedProperty(definition,before),value=Object.hasOwn(fields,definition.key)?validateProperty(definition,fields[definition.key]):null;
    return !old.error&&old.value===value?[]:[{key:definition.key,oldValue:old.error?before[definition.key]:old.value,newValue:value,source}];
  });
}
export function changeRow(contactId:string,change:PropertyChange,now:number) {
  return {id:ulid(now),contact_id:contactId,kind:'property-change',detail:stableJson(change),occurred_at:now,created_at:now,updated_at:now};
}
export async function propertyWriteStatements(db:D1Database,contactId:string,fields:Record<string,unknown>,source:PropertySource,now=Date.now(),replace=false) {
  const definitions=await propertyDefinitions(db),before=await readPropertyFields(db,contactId);
  const validated=validatePropertyFields(definitions,fields),changes=changedProperties(definitions,before,validated,source,replace);
  const statements=changes.map(change=>{
    const row=changeRow(contactId,change,now);
    return db.prepare('INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(...Object.values(row));
  });
  return {validated,statements};
}
export async function editContactProperties(db:D1Database,contactId:string,fields:Record<string,unknown>,source:PropertySource) {
  if(!await db.prepare('SELECT id FROM contacts WHERE id=? AND merge_lock IS NULL').bind(contactId).first())throw new PropertyError('contact_not_found',contactId,404);
  const {validated,statements}=await propertyWriteStatements(db,contactId,fields,source);
  const current=await db.prepare('SELECT fields_json FROM integration_contact_profiles WHERE contact_id=?').bind(contactId).first<{fields_json:string}>();
  const merged={...(current?JSON.parse(current.fields_json):{}),...validated};
  await db.batch([...statements,db.prepare(`INSERT INTO integration_contact_profiles(contact_id,fields_json,tags_json) VALUES(?,?,'[]') ON CONFLICT(contact_id) DO UPDATE SET fields_json=excluded.fields_json`).bind(contactId,JSON.stringify(merged))]);
}

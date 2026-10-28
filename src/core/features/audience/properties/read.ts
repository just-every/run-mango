import {validateProperty,formatProperty} from './validation';
import type {PropertyDefinition,PropertyChange,PropertyValue} from './types';
export async function propertyDefinitions(db:D1Database):Promise<PropertyDefinition[]> {
  const rows=await db.prepare('SELECT key,label,type,options_json FROM contact_property_definitions ORDER BY label,key').all<Omit<PropertyDefinition,'options'>&{options_json:string}>();
  return rows.results.map(({options_json,...row})=>({...row,options:JSON.parse(options_json)}));
}
/** The native contact ledger is the value journal. Import snapshots already carry
 * and reverse these rows atomically; legacy scoped fields remain the opening value. */
export function propertyFields(fields:Record<string,unknown>,history:Array<{kind?:string;detail:string}>) {
  const values:Record<string,unknown>=Object.create(null);
  for(const row of history)if(row.kind==='incumbent-profile')Object.assign(values,JSON.parse(row.detail).fields);
  Object.assign(values,fields);
  for(const row of history)if(row.kind===undefined||row.kind==='property-change'){
    const change=JSON.parse(row.detail) as PropertyChange;values[change.key]=change.newValue;
  }
  return values;
}
export async function readPropertyFields(db:D1Database,contactId:string) {
  const [profile,history]=await Promise.all([
    db.prepare('SELECT fields_json FROM integration_contact_profiles WHERE contact_id=?').bind(contactId).first<{fields_json:string}>(),
    db.prepare("SELECT kind,detail FROM contact_history WHERE contact_id=? AND kind IN ('property-change','incumbent-profile') ORDER BY occurred_at,id").bind(contactId).all<{kind:string;detail:string}>(),
  ]);
  return propertyFields(profile?JSON.parse(profile.fields_json):{},history.results);
}
/** Shared typed read for segments, personalization and future form/flow surfaces.
 * Invalid pre-definition values remain recorded and explicitly reported. */
export function readTypedProperty(definition:PropertyDefinition,fields:Record<string,unknown>):{value:PropertyValue;error?:string} {
  try{return {value:validateProperty(definition,Object.hasOwn(fields,definition.key)?fields[definition.key]:null,'read')};}
  catch(error){return {value:null,error:error instanceof Error?error.message:'property_invalid'};}
}
export function propertyPersonalisation(definitions:PropertyDefinition[],fields:Record<string,unknown>) {
  return Object.fromEntries(definitions.map(definition=>[definition.key,formatProperty(definition,readTypedProperty(definition,fields).value)]));
}

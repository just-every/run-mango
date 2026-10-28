import type {NormalizedImportRow} from '../import-normalize';
import type {AudienceSnapshot} from '../import-types';
import type {PropertyDefinition} from './types';
import {propertyFields} from './read';
import {validateProperty} from './validation';
import {changedProperties,changeRow} from './write';
/** Each failed property is reported independently; contact and consent processing
 * remains under the existing import policy. A mapped value grants no consent. */
export function importPropertyValues(row:NormalizedImportRow,definitions:PropertyDefinition[]) {
  const fields:Record<string,unknown>=Object.create(null);
  for(const key of Object.keys(row.propertyColumns??{})){
    const value=row.values['property:'+key],definition=definitions.find(d=>d.key===key);
    if(!definition){row.warnings.push(`property_not_found: ${key}; property skipped`);continue;}
    try{fields[key]=validateProperty(definition,value,'import');}
    catch(error){row.warnings.push(`${error instanceof Error?error.message:'property_invalid'}; property skipped`);}
  }
  return fields;
}
export function appendImportProperties(snapshot:AudienceSnapshot,row:NormalizedImportRow,definitions:PropertyDefinition[],opening:Record<string,unknown>,reference:string,now:number) {
  const before=propertyFields(opening,snapshot.tables.contact_history.map(r=>({kind:String(r.kind),detail:String(r.detail)}))),fields=importPropertyValues(row,definitions);
  const mapping=row.propertyColumns??{};
  for(const change of changedProperties(definitions,before,fields,{kind:'import',label:`CSV import: ${row.file}`,reference})){
    change.source.column=mapping[change.key];
    snapshot.tables.contact_history.push(changeRow(String(snapshot.tables.contacts[0].id),change,now));
  }
}

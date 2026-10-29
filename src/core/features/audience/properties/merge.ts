import {propertyDefinitions,readPropertyFields} from './read';
import {changeRow} from './write';
import {stableJson} from '@/core/shared/ids';
import type {PropertyChange} from './types';
/** The survivor's recorded value wins a collision. The losing value remains in
 * the moved history and the conflict records the selected value explicitly. */
export async function preparePropertyMerge(db:D1Database,survivor:string,merged:string,now:number) {
  const definitions=await propertyDefinitions(db),left=await readPropertyFields(db,survivor),right=await readPropertyFields(db,merged);
  const profiles=(await db.prepare('SELECT contact_id,fields_json,tags_json FROM integration_contact_profiles WHERE contact_id IN (?,?)').bind(survivor,merged).all<{contact_id:string;fields_json:string;tags_json:string}>()).results;
  const fields=Object.assign(Object.create(null),right,left),tags=[...new Set(profiles.flatMap(p=>JSON.parse(p.tags_json) as string[]))].sort();
  const latest=await db.prepare("SELECT max(occurred_at) at FROM contact_history WHERE contact_id IN (?,?) AND kind='property-change'").bind(survivor,merged).first<{at:number|null}>();
  const at=Math.max(now,(latest?.at??0)+1),statements:D1PreparedStatement[]=[];
  for(const d of definitions)if(Object.hasOwn(left,d.key)||Object.hasOwn(right,d.key)){
    // Preserve invalid legacy values too, without converting or discarding them.
    const value=Object.hasOwn(left,d.key)?left[d.key]:right[d.key];
    const change={key:d.key,oldValue:right[d.key]??null,newValue:value??null,source:{kind:'merge',label:Object.hasOwn(left,d.key)&&Object.hasOwn(right,d.key)&&stableJson(left[d.key])!==stableJson(right[d.key])?'Merge conflict: surviving contact value retained':'Contact merge',reference:merged}} as PropertyChange;
    const row=changeRow(survivor,change,at);
    statements.push(db.prepare('INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?)').bind(...Object.values(row)));
  }
  statements.push(db.prepare(`INSERT INTO integration_contact_profiles(contact_id,fields_json,tags_json) VALUES(?,?,?) ON CONFLICT(contact_id) DO UPDATE SET fields_json=excluded.fields_json,tags_json=excluded.tags_json`).bind(survivor,JSON.stringify(fields),JSON.stringify(tags)));
  return statements;
}

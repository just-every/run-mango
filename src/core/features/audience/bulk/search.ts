import {validateProperty} from '../properties/validation';
import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import {readContactProfile} from '../contact-profile';
import {readTypedProperty,propertyFields,propertyDefinitions} from '../properties/read';

export const contactSearchSchema=z.object({field:z.enum(['email','phone','name','property','tag','segment','consent']).default('name'),value:z.string().trim().max(320).default(''),property:z.string().max(100).optional(),channel:z.enum(['email','sms']).default('email')});
export type ContactSearch=z.infer<typeof contactSearchSchema>;
/** A frozen job uses exactly these returned people, never a later re-evaluation. */
export async function searchContacts(platform:Platform,input:ContactSearch) {
  const db=platform.database.$client;
  let sql='SELECT id FROM contacts WHERE merge_lock IS NULL',params:unknown[]=[];
  if(input.field==='email') {sql+=' AND EXISTS(SELECT 1 FROM contact_email_addresses e WHERE e.contact_id=contacts.id AND instr(lower(e.email),lower(?))>0)';params=[input.value];}
  if(input.field==='phone') {sql+=' AND EXISTS(SELECT 1 FROM contact_phones p WHERE p.contact_id=contacts.id AND instr(p.phone_e164,?)>0)';params=[input.value.replace(/[ ().-]/g,'')];}
  if(input.field==='name') {sql+=' AND instr(lower(display_name),lower(?))>0';params=[input.value];}
  if(input.field==='consent') {sql+=` AND ${input.channel==='sms'?'sms_status':'email_status'}=?`;params=[input.value];}
  if(input.field==='tag') {
    sql+=` AND COALESCE((SELECT present FROM contact_tag_overrides t WHERE t.contact_id=contacts.id AND t.tag=?),
      EXISTS(SELECT 1 FROM integration_contact_profiles p,json_each(p.tags_json) t WHERE p.contact_id=contacts.id AND t.value=?) OR
      EXISTS(SELECT 1 FROM contact_history h,json_each(h.detail,'$.tags') t WHERE h.contact_id=contacts.id AND h.kind='incumbent-profile' AND t.value=?))=1`;
    params=[input.value,input.value,input.value];
  }
  const rows=(await db.prepare(sql+' ORDER BY display_name,id').bind(...params).all<{id:string}>()).results;
  if(input.field!=='property'&&input.field!=='segment')return rows.map(row=>row.id);
  const profiles=input.field==='property'?(await db.prepare('SELECT contact_id,fields_json FROM integration_contact_profiles').all<{contact_id:string;fields_json:string}>()).results:[];
  const histories=input.field==='property'?(await db.prepare("SELECT contact_id,kind,detail FROM contact_history WHERE kind IN ('property-change','incumbent-profile') ORDER BY occurred_at,id").all<{contact_id:string;kind:string;detail:string}>()).results:[];
  const fields=new Map(profiles.map(row=>[row.contact_id,JSON.parse(row.fields_json)])),history=new Map<string,typeof histories>();
  for(const row of histories){const list=history.get(row.contact_id)??[];list.push(row);history.set(row.contact_id,list);}
  const definition=input.field==='property'?(await propertyDefinitions(db)).find(d=>d.key===input.property):undefined;
  let wanted:unknown=input.value;
  if(definition){try{wanted=validateProperty(definition,input.value,'import');}catch{return [];}}
  const requested=Array.isArray(wanted)?wanted:[wanted];
  const equal=(value:unknown)=>requested.some(want=>String(value).toLowerCase()===String(want).toLowerCase());
  const ids:string[]=[];
  for(const row of rows) {
    if(input.field==='segment') {
      const profile=await readContactProfile(platform,row.id);
      if(!profile.segments.some(s=>s.id===input.value&&s.state==='member'))continue;
    } else {
      const values=propertyFields(fields.get(row.id)??{},history.get(row.id)??[]);
      const actual=definition?readTypedProperty(definition,values).value:values[input.property??''];
      if(actual===null||actual===undefined||(Array.isArray(actual)?!actual.some(equal):!equal(actual)))continue;
    }
    ids.push(row.id);
  }
  return ids;
}

import {z} from 'zod';

export const consentStates=['subscribed','pending','non-subscribed','unsubscribed','suppressed'] as const;

/** Every filter is optional and all given filters apply together (CONT-022 point 1). */
export const searchFilters=z.object({
  q:z.string().trim().min(2).max(320).optional(),
  email:z.string().trim().min(2).max(320).optional(),
  phone:z.string().trim().min(2).max(40).optional(),
  name:z.string().trim().min(1).max(160).optional(),
  property:z.object({key:z.string().trim().min(1).max(160),value:z.union([z.string().max(2000),z.number(),z.boolean()])}).optional(),
  tag:z.string().trim().min(1).max(160).optional(),
  segmentId:z.string().trim().min(1).max(160).optional(),
  consent:z.object({channel:z.enum(['email','sms']),state:z.enum(consentStates)}).optional(),
}).strict();
export type SearchFilters=z.infer<typeof searchFilters>;

/** A masked role may find a person only by a complete address or number, or by a consent state its
 * contact views already show. Fragments, names, properties, tags and segments would reveal hidden facts. */
export const maskedFilters=['q','email','phone','consent'] as const;
export function restrictedFilter(filters:SearchFilters,unmasked:boolean) {
  return unmasked?undefined:Object.keys(filters).find(field=>!(maskedFilters as readonly string[]).includes(field));
}
/** Filter names only: a typed address, name or property value is never kept in a job receipt. */
export const filterFields=(filters:SearchFilters)=>Object.keys(filters).filter(field=>filters[field as keyof SearchFilters]!==undefined).sort();

const normalizedPhone=(value:string)=>value.replace(/[\s().-]/g,'');
type Where={clauses:string[];params:unknown[]};

/** SQL for every filter that the database can decide. Segment and typed property checks follow in search.ts. */
export function sqlFilters(filters:SearchFilters,exact:boolean,propertyKey?:string):Where {
  const where:Where={clauses:[],params:[]};
  const add=(clause:string,...params:unknown[])=>{where.clauses.push(clause);where.params.push(...params);};
  const addPair=(pair:readonly [string,string])=>add(pair[0],pair[1]);
  const email=(value:string)=>exact
    ?['EXISTS(SELECT 1 FROM contact_email_addresses a WHERE a.contact_id=c.id AND lower(a.email)=?)',value.toLowerCase()] as const
    :['EXISTS(SELECT 1 FROM contact_email_addresses a WHERE a.contact_id=c.id AND instr(lower(a.email),?)>0)',value.toLowerCase()] as const;
  const phone=(value:string)=>exact
    ?['EXISTS(SELECT 1 FROM contact_phones p WHERE p.contact_id=c.id AND p.phone_e164=?)',normalizedPhone(value)] as const
    :['EXISTS(SELECT 1 FROM contact_phones p WHERE p.contact_id=c.id AND instr(p.phone_e164,?)>0)',normalizedPhone(value)] as const;
  if(filters.q){
    const [emailSql,emailValue]=email(filters.q),[phoneSql,phoneValue]=phone(filters.q);
    add(exact?`(${emailSql} OR ${phoneSql})`:`(${emailSql} OR ${phoneSql} OR instr(lower(c.display_name),?)>0)`,...exact?[emailValue,phoneValue]:[emailValue,phoneValue,filters.q.toLowerCase()]);
  }
  if(filters.email)addPair(email(filters.email));
  if(filters.phone)addPair(phone(filters.phone));
  if(filters.name)add('instr(lower(c.display_name),?)>0',filters.name.toLowerCase());
  if(filters.tag){
    const tag=filters.tag.toLowerCase();
    add(`(EXISTS(SELECT 1 FROM integration_contact_profiles p,json_each(p.tags_json) t WHERE p.contact_id=c.id AND lower(t.value)=?)
      OR EXISTS(SELECT 1 FROM contact_history h,json_each(json_extract(h.detail,'$.tags')) t WHERE h.contact_id=c.id AND h.kind='incumbent-profile' AND lower(t.value)=?))`,tag,tag);
  }
  if(filters.consent)add(`c.${filters.consent.channel==='email'?'email_status':'sms_status'}=?`,filters.consent.state);
  if(propertyKey)add(`(EXISTS(SELECT 1 FROM integration_contact_profiles p,json_each(p.fields_json) f WHERE p.contact_id=c.id AND f.key=?)
    OR EXISTS(SELECT 1 FROM contact_history h WHERE h.contact_id=c.id AND h.kind='property-change' AND json_extract(h.detail,'$.key')=?)
    OR EXISTS(SELECT 1 FROM contact_history h,json_each(json_extract(h.detail,'$.fields')) f WHERE h.contact_id=c.id AND h.kind='incumbent-profile' AND f.key=?))`,propertyKey,propertyKey,propertyKey);
  return where;
}

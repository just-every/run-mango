import type {Database} from '@/core/platform/db/client';
import {propertyDefinitions,readPropertyFields} from '../properties/read';
import {matchesProperty} from '../properties/comparison';
import {validateProperty} from '../properties/validation';
import {PropertyError,type PropertyDefinition} from '../properties/types';
import {sizeAudience} from '@/core/features/campaigns/size-audience';
import {filterFields,sqlFilters,type SearchFilters} from './filters';

export class SearchRefusal extends Error {
  constructor(readonly code:string,readonly status:400|404=400,detail?:string){super(detail??code);}
}
export const selectionCap=100_000;
const pageSize=500;
export type ContactHit={id:string;displayName:string;email:string|null;phone:string|null;emailStatus:string;smsStatus:string;lastActivityAt:number|null;tags:string[]};

/** One resolved search: SQL decides what it can, a typed check or saved-segment membership decides the rest. */
export async function prepareSearch(database:Database,filters:SearchFilters,exact:boolean) {
  const db=database.$client;
  let definition:PropertyDefinition|undefined,expected:string|number|boolean|undefined;
  if(filters.property){
    definition=(await propertyDefinitions(db)).find(item=>item.key===filters.property!.key);
    if(!definition)throw new SearchRefusal('unknown_property',400,`No property named ${filters.property.key} is defined.`);
    try{
      const raw=filters.property.value;
      // A list property matches one chosen option; every other type reads the value as an import would.
      expected=definition.type==='list'?String(raw):validateProperty(definition,raw,'import') as string|number|boolean;
      if(expected===null)throw new PropertyError('property_invalid',definition.key);
      if(definition.type==='list'&&!definition.options.includes(expected as string))throw new PropertyError('property_invalid',definition.key);
    }catch(error){
      if(error instanceof PropertyError)throw new SearchRefusal('invalid_property_value',400,`That value does not fit the ${definition.type} property ${definition.key}.`);
      throw error;
    }
  }
  let members:Set<string>|undefined;
  if(filters.segmentId){
    const segment=await db.prepare('SELECT inclusion_rule_json AS inclusionRuleJson,exclusion_rules_json AS exclusionRulesJson FROM audience_segments WHERE id=?')
      .bind(filters.segmentId).first<{inclusionRuleJson:string;exclusionRulesJson:string}>();
    if(!segment)throw new SearchRefusal('segment_not_found',404,'That saved segment no longer exists.');
    const ids=await sizeAudience(database,segment);
    if(!ids)throw new SearchRefusal('segment_unavailable',400,'That saved segment cannot be evaluated until its rules are complete.');
    members=new Set(ids);
  }
  const where=sqlFilters(filters,exact,definition?.key);
  const predicate=definition&&{sourceType:'contact' as const,field:'property',property:definition.key,
    comparator:(definition.type==='list'?'contains':definition.type==='date'?'on':'eq') as 'contains'|'on'|'eq',value:expected as string|number|boolean};
  const sql=['1=1',...where.clauses].join(' AND ');
  const now=new Date();
  async function accepts(id:string) {
    if(members&&!members.has(id))return false;
    if(definition&&predicate)return matchesProperty(definition,await readPropertyFields(db,id),predicate as never,now);
    return true;
  }
  const post=Boolean(members||definition);
  /** Contact ids after `after` in id order; `exhausted` is true when nothing further can match. */
  async function ids(after:string,limit:number) {
    const out:string[]=[];let cursor=after;
    for(;;){
      const want=post?pageSize:limit-out.length;
      const rows=(await db.prepare(`SELECT c.id FROM contacts c WHERE c.id>? AND ${sql} ORDER BY c.id LIMIT ?`).bind(cursor,...where.params,want).all<{id:string}>()).results;
      for(const row of rows){
        if(out.length>=limit)return {ids:out,next:cursor};
        cursor=row.id;
        if(await accepts(row.id))out.push(row.id);
      }
      if(out.length>=limit)return {ids:out,next:cursor};
      if(rows.length<want)return {ids:out,next:null};
    }
  }
  return {
    ids,
    fields:filterFields(filters),
    async total() {
      if(!post)return (await db.prepare(`SELECT COUNT(*) AS n FROM contacts c WHERE ${sql}`).bind(...where.params).first<{n:number}>())!.n;
      let count=0,cursor='';
      for(;;){const page=await ids(cursor,1000);count+=page.ids.length;if(page.next===null)return count;cursor=page.next;}
    },
    async page(after:string,limit:number) {
      const found=await ids(after,limit);
      if(!found.ids.length)return {contacts:[] as ContactHit[],nextCursor:found.next};
      const rows=(await db.prepare(`SELECT c.id,c.display_name AS displayName,c.email,c.email_status AS emailStatus,c.sms_status AS smsStatus,c.last_activity_at AS lastActivityAt,
        (SELECT phone_e164 FROM contact_phones p WHERE p.contact_id=c.id ORDER BY p.created_at,p.id LIMIT 1) AS phone,
        COALESCE((SELECT tags_json FROM integration_contact_profiles p WHERE p.contact_id=c.id),'[]') AS tags
        FROM contacts c WHERE c.id IN (SELECT value FROM json_each(?)) ORDER BY c.id`).bind(JSON.stringify(found.ids)).all<Omit<ContactHit,'tags'>&{tags:string}>()).results;
      return {contacts:rows.map(row=>({...row,tags:JSON.parse(row.tags) as string[]})),nextCursor:found.next};
    },
  };
}
export type PreparedSearch=Awaited<ReturnType<typeof prepareSearch>>;

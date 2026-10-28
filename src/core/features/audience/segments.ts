import {propertyDefinitions} from './properties/read';
import {validPropertyPredicate} from './properties/comparison';
import { Hono } from 'hono';
import { ulid } from '@/core/shared/ids';
import { z } from 'zod';
import { readJson, readParams } from '@/core/api/input';
import type { AuthVariables } from '@/core/features/auth/routes';
import { completeInclusionRuleSchema, completeExclusionRuleSchema, flattenPredicates } from '@/core/features/lifecycle/rules';
import { audienceRuleFields } from '@/core/features/campaigns/audience-rule-labels';

const bodySchema = z.object({name:z.string().trim().min(1).max(160),
  inclusionRuleJson:z.string().max(20_000),exclusionRulesJson:z.string().max(20_000),
}).superRefine((value, context) => {
  try {
    const inclusion=completeInclusionRuleSchema.parse(JSON.parse(value.inclusionRuleJson));
    const exclusions=z.array(completeExclusionRuleSchema).max(50).parse(JSON.parse(value.exclusionRulesJson));
    if ([...flattenPredicates(inclusion),...exclusions.map(rule=>rule.predicate)].some(predicate=>!audienceRuleFields.some(([source,field])=>source===predicate.sourceType&&field===predicate.field))) throw new Error('Use a field available in the audience editor.');
  } catch { context.addIssue({code:'custom',message:'Complete the structured audience conditions using fields available in the editor.'}); }
});
const identifier=z.object({id:z.string().min(1).max(160)});
export type SavedSegment={id:string;name:string;inclusionRuleJson:string;exclusionRulesJson:string;createdAt:number;updatedAt:number};
const columns='id,name,inclusion_rule_json AS inclusionRuleJson,exclusion_rules_json AS exclusionRulesJson,created_at AS createdAt,updated_at AS updatedAt';
export function createSegmentRoutes(database:D1Database) {
  const routes=new Hono<{Variables:AuthVariables}>();
  routes.get('/audience/segments',async context=>context.json({segments:(await database.prepare(`SELECT ${columns} FROM audience_segments ORDER BY name,id`).all<SavedSegment>()).results}));
  routes.post('/audience/segments',async context=>{
    const body=await readJson(context,bodySchema);if('error' in body)return body.error;
    const definitions=await propertyDefinitions(database);
    for(const predicate of [...flattenPredicates(completeInclusionRuleSchema.parse(JSON.parse(body.data.inclusionRuleJson))),...JSON.parse(body.data.exclusionRulesJson).map((r:{predicate:import('@/core/features/lifecycle/rules').AudiencePredicate})=>r.predicate)]){const definition=definitions.find(d=>predicate.sourceType==='contact'&&predicate.field==='property'&&d.key===predicate.property);if(definition&&!validPropertyPredicate(definition,predicate))return context.json({error:'property_rule_invalid',property:definition.key},400);}
    const id=ulid(),now=Date.now(),value=body.data;
    await database.prepare('INSERT INTO audience_segments (id,name,inclusion_rule_json,exclusion_rules_json,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(id,value.name,value.inclusionRuleJson,value.exclusionRulesJson,context.get('operator').id,now,now).run();
    return context.json({segment:{id,...value,createdAt:now,updatedAt:now}},201);
  });
  routes.put('/audience/segments/:id',async context=>{
    const params=readParams(context,identifier);if('error'in params)return params.error;
    const body=await readJson(context,bodySchema);if('error'in body)return body.error;
    const value=body.data,now=Date.now();
    const result=await database.prepare('UPDATE audience_segments SET name=?,inclusion_rule_json=?,exclusion_rules_json=?,updated_at=? WHERE id=?').bind(value.name,value.inclusionRuleJson,value.exclusionRulesJson,now,params.data.id).run();
    if(!result.meta.changes)return context.json({error:'not_found'},404);
    return context.json({segment:await database.prepare(`SELECT ${columns} FROM audience_segments WHERE id=?`).bind(params.data.id).first<SavedSegment>()});
  });
  routes.delete('/audience/segments/:id',async context=>{
    const params=readParams(context,identifier);if('error'in params)return params.error;
    const id=params.data.id,now=Date.now(),audit=ulid();
    const result=await database.batch([
      database.prepare("INSERT INTO lifecycle_audit_entries (id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) SELECT ?,?,'audience-segment',id,'segment.deleted','operator',?,'{}',?,? FROM audience_segments WHERE id=?").bind(audit,audit,context.get('operator').id,now,now,id),
      database.prepare('DELETE FROM audience_segments WHERE id=?').bind(id),
    ]);
    return result[1].meta.changes?context.json({kind:'deleted'}):context.json({error:'not_found'},404);
  });
  return routes;
}

import type {AudiencePreviewBudget} from './import-query-budget';
import {planFingerprint} from '@/vendor/base/import-kit/src/plan/index';
import {canonicalJson,sha256} from '@/vendor/base/import-kit/src/d1/index';
import type {AudienceSnapshot} from './import-types';
import type {ImportPlan} from '@/vendor/base/import-kit/src/types';

type StoredPlan={fingerprint:string;plan_json:string};
const format='mango-plan-chunks-v1';
export async function readAudiencePlan(db:D1Database,stored:StoredPlan):Promise<ImportPlan>{
 const value=JSON.parse(stored.plan_json);
 if(value.format!==format){if(value.fingerprint!==stored.fingerprint||planFingerprint(value)!==stored.fingerprint)throw new Error('Audience import plan fingerprint has changed.');return value as ImportPlan;}
 const rows=(await db.prepare('SELECT ordinal,content FROM audience_import_plan_chunks WHERE fingerprint=? ORDER BY ordinal').bind(stored.fingerprint).all<{ordinal:number;content:string}>()).results;
 if(rows.length!==value.chunks||rows.some((row,index)=>row.ordinal!==index))throw new Error('Audience import plan custody is incomplete.');
 const content=rows.map(row=>row.content).join('');
 if(sha256(content)!==value.sha256)throw new Error('Audience import plan custody has changed.');
 const plan=JSON.parse(content) as ImportPlan;
 if(plan.fingerprint!==stored.fingerprint||planFingerprint(plan)!==stored.fingerprint)throw new Error('Audience import plan fingerprint has changed.');
 return plan;
}
export async function saveAudiencePlan(db:D1Database,plan:ImportPlan,principalId:string,sourceDigest:string,now:number,budget:AudiencePreviewBudget){
 const content=canonicalJson(plan),chunks:string[]=[];
 // A UTF-16 code unit uses at most three UTF-8 bytes. Do not split surrogate pairs.
 for(let offset=0;offset<content.length;){let end=Math.min(offset+512000,content.length);if(end<content.length&&/[\uD800-\uDBFF]/u.test(content[end-1]))end--;chunks.push(content.slice(offset,end));offset=end;}
 const manifest=JSON.stringify({format,chunks:chunks.length,sha256:sha256(content)});
 const statements=[db.prepare('INSERT INTO audience_import_plans(fingerprint,principal_id,plan_json,source_digest,created_at) VALUES(?,?,?,?,?) ON CONFLICT(source_digest,principal_id) DO NOTHING').bind(plan.fingerprint,principalId,manifest,sourceDigest,now)];
 for(const [ordinal,chunk] of chunks.entries())statements.push(db.prepare('INSERT INTO audience_import_plan_chunks(fingerprint,ordinal,content) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM audience_import_plans WHERE fingerprint=? AND principal_id=?) ON CONFLICT(fingerprint,ordinal) DO NOTHING').bind(plan.fingerprint,ordinal,chunk,plan.fingerprint,principalId));
 const identityRows=plan.entries.flatMap(entry=>{
  const source=entry.source.payload as Record<string,unknown>;
  const ledger=source.ledger as AudienceSnapshot|undefined;
  const sourceIds=Array.isArray(ledger?.tables?.contacts)?ledger.tables.contacts.map(contact=>String(contact.id??'')):[''];
  const sourceDestinations=[String(source.email??''),String(source.phone??''),...(Array.isArray(ledger?.identities)?ledger.identities.filter(identity=>typeof identity.destination==='string').map(identity=>identity.destination):[])];
  return [...sourceIds.flatMap(id=>sourceDestinations.map(email=>({id,email}))),...entry.effects.flatMap(effect=>{
   const snapshot=effect.value as unknown as AudienceSnapshot;
   return [{id:effect.targetId,email:String(source.email??'')},...snapshot.identities.map(identity=>({id:effect.targetId,email:identity.destination}))];
  })];
 });
 const identities=[...new Map(identityRows.map(row=>[JSON.stringify(row),row])).values()];
 for(let offset=0;offset<identities.length;offset+=1000)statements.push(db.prepare("INSERT INTO audience_import_plan_contacts(fingerprint,contact_id,email) SELECT ?,json_extract(value,'$.id'),json_extract(value,'$.email') FROM json_each(?) WHERE EXISTS(SELECT 1 FROM audience_import_plans WHERE fingerprint=? AND principal_id=?) ON CONFLICT DO NOTHING").bind(plan.fingerprint,JSON.stringify(identities.slice(offset,offset+1000)),plan.fingerprint,principalId));
 // The final manifest lookup and chunk read must fit after the atomic save.
 budget.assertAvailable(statements.length + 4);
 await db.batch(statements);
}

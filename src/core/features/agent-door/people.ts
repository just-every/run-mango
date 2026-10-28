import { operatorAuthPeople, type PeopleAdapter, type Person } from '@/vendor/base/agent-door/index.ts';
import { isActiveOperator, type Operator } from '@/vendor/base/operator-auth/index.mjs';
import {effectiveRole} from '../auth/product-roles';
import type {ProductRole} from '../auth/permissions';
import type { createAuthService } from '../auth/service';

export function mangoPeople(db: D1Database, auth: ReturnType<typeof createAuthService>): PeopleAdapter {
  async function applied(sub:string):Promise<boolean> {
    const settings=await db.prepare('SELECT owner_id,stopped FROM bs_settings WHERE singleton=1').first<{owner_id:string|null;stopped:number}>();
    if(!settings||settings.stopped)return false;
    if(settings.owner_id===sub)return true;
    return Boolean(await db.prepare("SELECT operator_id FROM bs_team WHERE business_id=? AND state IN('active','invited') AND operator_id IS NOT NULL").bind(sub).first());
  }
  async function read(id:string):Promise<Person|null> {
    const row=await db.prepare(`SELECT n.id,n.email,n.display_name AS displayName,n.role,n.status,${effectiveRole} AS productRole
      FROM oa_operators n LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=?`)
      .bind(id).first<Operator&{productRole:ProductRole}>();
    if(!row||!isActiveOperator(row))return null;
    return {id:row.id,email:row.email,name:row.displayName,role:row.productRole,active:true};
  }
  const mapping=operatorAuthPeople({db,session:async request=>{
    const operator=await auth.authenticate(request);
    return operator?{operator:{id:operator.id,email:operator.email,displayName:operator.displayName,role:operator.role,status:'active'}}:null;
  }});
  return {...mapping,person:read,
    async sponsor(claims){if(!await applied(claims.sub))return null;const mapped=await mapping.sponsor(claims);return mapped?.active?read(mapped.id):null;},
    async businessMember(person){
      // One current read, using OA's installation-owner identity and the native
      // team binding. Neither the person's email nor their local role selects it.
      return db.prepare(`SELECT s.owner_id AS id,'owner' AS role FROM bs_settings s
        WHERE s.singleton=1 AND s.stopped=0 AND s.owner_id IS NOT NULL AND ?=(
          SELECT o.id FROM oa_operators o LEFT JOIN oa_bootstrap b ON b.claim_id=o.id
          WHERE o.role='owner' ORDER BY b.claim_id IS NULL,o.created_at,o.id LIMIT 1)
        UNION ALL SELECT t.business_id AS id,CASE WHEN t.business_role='admin' THEN 'editor' ELSE NULL END AS role
        FROM bs_team t JOIN bs_settings s ON s.singleton=1 AND s.stopped=0
        WHERE t.operator_id=? AND t.business_id IS NOT NULL AND t.state IN('active','invited') LIMIT 1`)
        .bind(person.id,person.id).first<{id:string;role:'owner'|'editor'|null}>();
    },
    async session(request){const person=await mapping.session(request);return person?read(person.id):null;},
    businessRole:person=>person.role==='owner'?'owner':person.role==='admin'?'editor':null};
}

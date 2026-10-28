import { operatorAuthPeople, type PeopleAdapter, type Person } from '@/vendor/base/agent-door/index.ts';
import { isActiveOperator, type Operator } from '@/vendor/base/operator-auth/index.mjs';
import { productAuthority } from '../auth/product-roles';
import type { createAuthService } from '../auth/service';

export function mangoPeople(db: D1Database, auth: ReturnType<typeof createAuthService>): PeopleAdapter {
  async function read(id:string):Promise<Person|null> {
    const row=await db.prepare('SELECT id,email,display_name AS displayName,role,status FROM oa_operators WHERE id=?').bind(id).first<Operator>();
    if(!row||!isActiveOperator(row))return null;
    if(!await auth.operatorById(id))return null;
    const product=await productAuthority(db,id);
    return product?{id:row.id,email:row.email,name:row.displayName,role:product.role,active:true}:null;
  }
  const mapping=operatorAuthPeople({db,session:async request=>{
    const operator=await auth.authenticate(request);
    return operator?{operator:{id:operator.id,email:operator.email,displayName:operator.displayName,role:operator.role,status:'active'}}:null;
  }});
  return {...mapping,person:read,
    async sponsor(claims){const mapped=await mapping.sponsor(claims);return mapped?.active?read(mapped.id):null;},
    async session(request){const person=await mapping.session(request);return person?read(person.id):null;},
    businessRole:person=>person.role==='owner'?'owner':person.role==='admin'?'editor':null};
}

import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthVariables} from '@/core/features/auth/routes';
import {effectiveRole} from '@/core/features/auth/product-roles';
import {senderWriteAuthority,senderWriteGuard,SenderAuthorityChanged} from '@/core/features/settings/sender-authority';
import type {Platform} from '@/core/shared/platform';
import {capacityDefinitions,signupCapacity,type CapacityName} from './signup-capacity';

const input=z.object({name:z.enum(Object.keys(capacityDefinitions) as [CapacityName,...CapacityName[]]),value:z.number().int().positive()}).strict();
export function signupCapacityRoutes(platform:Platform) {
  const routes=new Hono<{Variables:AuthVariables}>(),db=platform.database.$client;
  routes.get('/audience/signup-allowance',async c=>c.json({...await signupCapacity(db),challengeConfigured:Boolean(platform.config.signupTurnstile)}));
  routes.put('/audience/signup-allowance',async c=>{
    if(c.get('operator').role!=='owner')return c.json({error:'signup_allowance_owner_required',detail:'Only an Owner can change signup allowances.'},403);
    const parsed=input.safeParse(await c.req.json().catch(()=>null));
    if(!parsed.success)return c.json({error:'invalid_signup_allowance'},400);
    const current=await signupCapacity(db),level=current.allowances.find(level=>level.name===parsed.data.name)!;
    if(parsed.data.value<level.floor)return c.json({error:'signup_allowance_below_floor'},400);
    if(parsed.data.value>level.ceiling)return c.json({error:'signup_allowance_above_handoff_ceiling'},400);
    try {
      const authority=await senderWriteAuthority(platform,c.req.raw,c.get('operator').id),operation=crypto.randomUUID();
      const effectiveAt=(Math.floor(current.now/(level.seconds*1000))+1)*level.seconds*1000;
      const ownerGuard=`EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=? AND n.status='active' AND ${effectiveRole}='owner')`;
      const results=await db.batch([
        db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
          SELECT ?,?,'signup-form','newsletter','signup.allowance.changed','operator',?,?,?,? WHERE ${senderWriteGuard} AND ${ownerGuard}
          AND NOT EXISTS(SELECT 1 FROM signup_allowance_levels WHERE name=? AND effective_at=? AND value=?)`)
          .bind(operation,operation,authority.operatorId,JSON.stringify({...parsed.data,effectiveAt}),current.now,current.now,authority.sessionId,authority.operatorId,authority.version,current.now,authority.operatorId,parsed.data.name,effectiveAt,parsed.data.value),
        db.prepare(`INSERT INTO signup_allowance_levels(name,effective_at,value,operator_id,updated_at)
          SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM lifecycle_audit_entries WHERE operation_key=?)
          ON CONFLICT(name,effective_at) DO UPDATE SET value=excluded.value,operator_id=excluded.operator_id,updated_at=excluded.updated_at`)
          .bind(parsed.data.name,effectiveAt,parsed.data.value,authority.operatorId,current.now,operation),
        db.prepare(`SELECT 1 AS authorized WHERE ${senderWriteGuard} AND ${ownerGuard}`).bind(authority.sessionId,authority.operatorId,authority.version,current.now,authority.operatorId),
      ]);
      if(!results[2].results.length)throw new SenderAuthorityChanged();
      return c.json(await signupCapacity(db));
    }catch(error){return c.json({error:error instanceof SenderAuthorityChanged?'authority_changed':'signup_allowance_save_failed'},error instanceof SenderAuthorityChanged?403:500);}
  });
  return routes;
}

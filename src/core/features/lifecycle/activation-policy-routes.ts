import {Hono} from 'hono';
import {z} from 'zod';
import type {AuthVariables} from '@/core/features/auth/routes';
import {activationPolicy,saveActivationPolicy} from './activation-policy';

export function activationPolicyRoutes(db:D1Database) {
  const routes=new Hono<{Variables:AuthVariables}>();
  routes.get('/settings/campaign-activation',async context=>context.json({policy:await activationPolicy(db)}));
  routes.put('/settings/campaign-activation',async context=>{
    const actor=context.get('operator');
    if(actor.role!=='owner')return context.json({error:'owner_required'},403);
    const input=z.object({approverOperatorId:z.string().min(1).max(200)}).strict().safeParse(await context.req.json().catch(()=>null));
    if(!input.success)return context.json({error:'invalid_request'},400);
    if(!await saveActivationPolicy(db,input.data.approverOperatorId,actor.id))return context.json({error:'eligible_approver_required'},400);
    return context.json({policy:await activationPolicy(db)});
  });
  return routes;
}

import {z} from 'zod';
import {readJson} from '@/core/api/input';
import {Hono} from 'hono';
import type {Platform} from '@/core/shared/platform';
import type {AuthVariables} from '@/core/features/auth/routes';
import {createSenderRenewal} from './renewal';
export function senderRenewalRoutes(platform:Platform) {
  const routes=new Hono<{Variables:AuthVariables}>(),renewal=createSenderRenewal(platform);
  routes.use('/settings/sender/renewal*',async(context,next)=>{context.header('Cache-Control','no-store');await next();});
  routes.get('/settings/sender/renewal',async context=>context.json({status:await renewal.read()}));
  routes.post('/settings/sender/renewal/run',async context=>{
    const operator=context.get('operator');if(!operator||!['owner','admin'].includes(operator.role))return context.json({error:'owner_or_admin_required'},403);
    const parsed=await readJson(context,z.object({}).strict());if('error'in parsed)return parsed.error;
    return context.json(await renewal.run());
  });
  return routes;
}

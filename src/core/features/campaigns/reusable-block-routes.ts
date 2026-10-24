import {Hono} from 'hono';
import {z} from 'zod';
import {readJson} from '@/core/api/input';
import type {AuthVariables} from '@/core/features/auth/routes';
import {hasPermission} from '@/core/features/auth/permissions';
import type {Platform} from '@/core/shared/platform';
import {EmailTooLargeError} from './email-size';
import {MobileEmailError} from './email-mobile';
import {UnsettledEmailBodyError} from './authoring-content';
import {placementTargetSchema,reusableBlockSchema,ReusableBlockError} from './reusable-block-model';
import {reusableBlockService} from './reusable-block-service';
const named=z.object({name:z.string().trim().min(1).max(100),block:reusableBlockSchema}).strict();
export function reusableBlockRoutes(platform:Platform){
  const routes=new Hono<{Variables:AuthVariables}>(),service=reusableBlockService(platform);
  const canWrite=(role:AuthVariables['operator']['role'])=>role!=='author'&&hasPermission(role,'draft.write');
  routes.use('/reusable-email-blocks/*',async(c,next)=>{
    if(!['GET','HEAD'].includes(c.req.method)&&!canWrite(c.get('operator').role))return c.json({error:'role_forbidden',detail:'Owners, Admins and Managers can change reusable blocks.'},403);
    await next();
  });
  routes.use('/reusable-email-blocks',async(c,next)=>{
    if(!['GET','HEAD'].includes(c.req.method)&&!canWrite(c.get('operator').role))return c.json({error:'role_forbidden'},403);
    await next();
  });
  routes.onError((error,c)=>{
    if(error instanceof ReusableBlockError)return c.json({error:'reusable_block_conflict',detail:error.message},409);
    if(error instanceof EmailTooLargeError||error instanceof MobileEmailError||error instanceof UnsettledEmailBodyError)return c.json({error:'invalid_reusable_block',detail:error.message},400);
    if(error instanceof z.ZodError)return c.json({error:'invalid_reusable_block',detail:error.issues.map(issue=>issue.path.join('.')+': '+issue.message).join(' ')},400);
    throw error;
  });
  routes.get('/reusable-email-blocks',async c=>c.json({...await service.list(),canWrite:canWrite(c.get('operator').role)}));
  routes.post('/reusable-email-blocks',async c=>{
    const body=await readJson(c,named);if('error'in body)return body.error;
    return c.json(await service.create(body.data.name,body.data.block,c.get('operator').id),201);
  });
  routes.patch('/reusable-email-blocks/:id',async c=>{
    const body=await readJson(c,named.extend({version:z.number().int().positive()}));if('error'in body)return body.error;
    return c.json(await service.update(c.req.param('id'),body.data.version,body.data.name,body.data.block,c.get('operator').id));
  });
  routes.post('/reusable-email-blocks/:id/place',async c=>{
    const body=await readJson(c,z.object({version:z.number().int().positive(),target:placementTargetSchema,emailBody:z.string().max(500000).optional()}).strict());if('error'in body)return body.error;
    return c.json(await service.place(c.req.param('id'),body.data.version,body.data.target,c.get('operator').id,body.data.emailBody));
  });
  routes.delete('/reusable-email-blocks/:id/placements',async c=>{
    const body=await readJson(c,z.object({target:placementTargetSchema}).strict());if('error'in body)return body.error;
    return c.json(await service.detach(c.req.param('id'),body.data.target,c.get('operator').id));
  });
  return routes;
}

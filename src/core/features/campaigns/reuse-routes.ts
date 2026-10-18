import { EmailTooLargeError } from './email-size';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '@/core/features/auth/routes';
import { readJson } from '@/core/api/input';
import type { createCampaignReuseService } from './reuse-service';

export function createCampaignReuseRoutes(service: ReturnType<typeof createCampaignReuseService>) {
  const routes=new Hono<{Variables:AuthVariables}>();
  routes.onError((error,context)=>{
    if(error instanceof EmailTooLargeError)return context.json({error:'email_too_large',detail:error.message,size:error.size},400);
    throw error;
  });
  routes.get('/campaigns/:id/followup-parent',async context=>context.json({followup:await service.followup.parent(context.req.param('id'))}));
  routes.get('/campaigns/:id/followup',async context=>context.json({source:await service.followup.source(context.req.param('id'))}));
  routes.post('/campaigns/:id/followup',async context=>{
    const body=await readJson(context,z.object({subject:z.string().trim().min(1).max(250),delayHours:z.number().int().min(1).max(720),metric:z.enum(['click','open-estimate'])}).strict());
    if('error' in body)return body.error;
    const result=await service.followup.create(context.req.param('id'),body.data,context.get('operator').id);
    return context.json(result,result.kind==='draft'?201:409);
  });
  routes.get('/campaign-templates',async context=>context.json(await service.list()));
  routes.post('/campaigns/:id/duplicate',async context=>{
    const result=await service.duplicate(context.req.param('id'),context.get('operator').id);
    return result?context.json(result,201):context.json({error:'source_revision_unavailable'},404);
  });
  routes.post('/campaign-templates',async context=>{
    const body=await readJson(context,z.object({revisionId:z.string().min(1),name:z.string().trim().min(1).max(160),templateId:z.string().min(1).optional(),updatedAt:z.number().int().optional()}).strict());
    if('error' in body)return body.error;
    const result=await service.save(body.data,context.get('operator').id);
    return context.json(result,result.kind==='saved'?201:result.kind==='conflict'?409:404);
  });
  routes.post('/campaign-templates/:id/start',async context=>{
    const result=await service.fromTemplate(context.req.param('id'),context.get('operator').id);
    return result?context.json(result,201):context.json({error:'template_not_found'},404);
  });
  return routes;
}

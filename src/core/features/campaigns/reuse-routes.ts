import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '@/core/features/auth/routes';
import { readJson } from '@/core/api/input';
import type { createCampaignReuseService } from './reuse-service';

export function createCampaignReuseRoutes(service: ReturnType<typeof createCampaignReuseService>) {
  const routes=new Hono<{Variables:AuthVariables}>();
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

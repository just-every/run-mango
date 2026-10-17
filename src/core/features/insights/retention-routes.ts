import { Hono } from 'hono';
import type { Database } from '@/core/platform/db/client';
import { readRetention, contactRfm } from './retention';

export function createRetentionRoutes(database:Database) {
  const routes=new Hono();
  routes.get('/insights/retention',async context=>context.json(await readRetention(database)));
  routes.get('/contacts/:id/rfm',async context=>{
    const exists=await database.$client.prepare('SELECT id FROM contacts WHERE id=?').bind(context.req.param('id')).first();
    return exists?context.json({scores:await contactRfm(database,context.req.param('id'))}):context.json({error:'not_found'},404);
  });
  return routes;
}

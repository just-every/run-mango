import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '../auth/routes';
import { readJson } from '@/core/api/input';
import { archiveService } from './service';
import { escapeHtml } from '../campaigns/email-html-policy';

export function archiveOperatorRoutes(db:D1Database,origin:string) {
  const routes=new Hono<{Variables:AuthVariables}>(), service=archiveService(db,origin);
  routes.get('/campaigns/:id/publications',async c=>c.json({publications:(await service.status(c.req.param('id'))).results}));
  routes.post('/campaigns/:id/publications',async c=>{
    const input=await readJson(c,z.object({revisionId:z.string().min(1).max(200)}).strict());
    if('error' in input)return input.error;
    const result=await service.publish(c.req.param('id'),input.data.revisionId,c.get('operator').id);
    return result?c.json(result,201):c.json({error:'sent_email_required',detail:'Only an approved email revision with a recorded hand-off in a completed campaign can be published.'},409);
  });
  routes.delete('/campaigns/:id/publications/:publication',async c=>{await service.remove(c.req.param('id'),c.req.param('publication'),c.get('operator').id);return c.json({removed:true});});
  return routes;
}
export function archivePublicRoutes(db:D1Database,origin:string) {
  const routes=new Hono(),service=archiveService(db,origin);
  routes.get('/archive/feed.xml',async c=>{
    const entries=(await service.list(0,100)).slice(0,100);
    const xml=(value:string)=>escapeHtml(value);
    const url=(path:string)=>xml(new URL(path,origin).toString());
    c.header('Content-Type','application/rss+xml; charset=utf-8');c.header('Cache-Control','no-store');
    return c.body(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Newsletter archive</title><link>${url('/archive')}</link><description>Published newsletters</description>${entries.map(entry=>`<item><title>${xml(entry.title)}</title><description>${xml(entry.description)}</description><link>${url(`/archive/${entry.id}`)}</link><guid isPermaLink="true">${url(`/archive/${entry.id}`)}</guid><pubDate>${new Date(entry.publishedAt).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`);
  });
  routes.get('/archive/data',async c=>{const input=z.coerce.number().int().min(0).max(100000).safeParse(c.req.query('page')??0);if(!input.success)return c.json({error:'invalid_page'},400);c.header('Cache-Control','no-store');const rows=await service.list(input.data);return c.json({issues:rows.slice(0,50),page:input.data,hasMore:rows.length>50});});
  routes.get('/archive/data/:id',async c=>{c.header('Cache-Control','no-store');const entry=await service.read(c.req.param('id'));return entry?c.json(entry):c.json({error:'not_found'},404);});
  return routes;
}

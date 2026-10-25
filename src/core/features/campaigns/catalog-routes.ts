import {Hono} from 'hono';
import {z} from 'zod';
import type {Platform} from '@/core/shared/platform';
import type {AuthVariables} from '@/core/features/auth/routes';
import {liveCatalogValues,searchCatalog} from './catalog-values';
export function createCatalogRoutes(platform:Platform){
 const routes=new Hono<{Variables:AuthVariables}>();
 routes.use('/catalog/*',async(c,next)=>{if(platform.commerce?.capabilities().provider!=='shopify')return c.json({error:'catalog_unavailable'},409);await next();});
 routes.get('/catalog/products',async c=>{c.header('Cache-Control','no-store');const input=z.object({q:z.string().trim().max(200).default('')}).strict().safeParse(c.req.query());if(!input.success)return c.json({error:'invalid_catalog_query'},400);try{return c.json({products:await searchCatalog(platform.database,input.data.q)});}catch{return c.json({error:'catalog_unavailable'},503);}});
 routes.post('/catalog/preview',async c=>{c.header('Cache-Control','no-store');const input=z.object({emailBody:z.string().max(1_000_000)}).strict().safeParse(await c.req.json().catch(()=>null));if(!input.success)return c.json({error:'invalid_catalog_preview'},400);try{return c.json({renderings:await liveCatalogValues(platform,input.data.emailBody)});}catch{return c.json({error:'catalog_unavailable',detail:'The chosen catalog values could not be read.'},409);}});
 return routes;
}

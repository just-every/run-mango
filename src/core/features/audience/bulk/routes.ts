import {Hono} from 'hono';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {Platform} from '@/core/shared/platform';
import {readJson} from '@/core/api/input';
import {createAudienceRepository} from '../repository';
import {audienceImportContext} from '../import-service';
import {propertyDefinitions} from '../properties/read';
import {encodeCsv} from '../csv';
import {contactSearchSchema,searchContacts} from './search';
import {bulkInput} from './types';
import {startBulkJob,advanceBulkJob} from './jobs';
import {readBulkReceipt} from './receipt';
export function createContactBulkRoutes(platform:Platform) {
  const routes=new Hono<{Variables:AuthVariables}>(),db=platform.database.$client;
  routes.get('/audience/search',async c=>{
    const input=contactSearchSchema.safeParse(c.req.query());if(!input.success)return c.json({error:'invalid_search'},400);
    const ids=await searchContacts(platform,input.data),repository=createAudienceRepository(platform.database);
    const contacts=[];for(let offset=0;offset<Math.min(ids.length,1000);offset+=80)contacts.push(...await repository.listContactsById(ids.slice(offset,Math.min(offset+80,1000))));
    return c.json({contacts,total:ids.length});
  });
  routes.get('/audience/bulk-options',async c=>c.json({
    segments:(await db.prepare('SELECT id,name FROM audience_segments ORDER BY name,id').all()).results,
    topics:(await db.prepare('SELECT DISTINCT message_category id,message_category name,channel FROM consent_evidence ORDER BY message_category,channel').all()).results,
    properties:await propertyDefinitions(db),
  }));
  routes.post('/audience/bulk',async c=>{
    const input=await readJson(c,bulkInput);if('error'in input)return input.error;
    const authority=await audienceImportContext(platform,c.get('operator').id,c.req.raw);
    const sessionHash=String(authority.authorization.predicate('erase','mango').params![0]);
    try{return c.json({job:await startBulkJob(platform,input.data,c.get('operator').id,sessionHash)},202);}
    catch{return c.json({error:'bulk_not_started',detail:'No matching contacts or the initiating authority is no longer active.'},409);}
  });
  routes.get('/audience/bulk/:id',async c=>{const job=await readBulkReceipt(db,c.req.param('id'));return job?c.json({job}):c.json({error:'not_found'},404);});
  routes.post('/audience/bulk/:id/resume',async c=>{
    try{const job=await advanceBulkJob(platform,c.req.param('id'));return job?c.json({job}):c.json({error:'not_found'},404);}
    catch{return c.json({job:await readBulkReceipt(db,c.req.param('id')),error:'bulk_failed'},409);}
  });
  routes.get('/audience/bulk/:id/export',async c=>{
    const job=await readBulkReceipt(db,c.req.param('id'));if(!job||job.action!=='export'||job.state!=='complete')return c.json({error:'export_not_ready'},409);
    const rows=(await db.prepare(`SELECT c.id,c.display_name,c.email,c.email_status,c.sms_status,(SELECT group_concat(phone_e164,'; ') FROM contact_phones WHERE contact_id=c.id) phones FROM contact_bulk_items i JOIN contacts c ON c.id=i.contact_id WHERE i.job_id=? AND i.state='succeeded' ORDER BY i.ordinal`).bind(job.id).all<Record<string,unknown>>()).results;
    const csv=encodeCsv([['Contact ID','Name','Email Address','Phone','Email Marketing Status','SMS Marketing Status'],...rows.map(r=>[r.id,r.display_name,r.email,r.phones,r.email_status,r.sms_status].map(v=>String(v??'')))]);
    return c.body(csv,200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="mango-selection-${job.id}.csv"`,'Cache-Control':'no-store'});
  });
  return routes;
}

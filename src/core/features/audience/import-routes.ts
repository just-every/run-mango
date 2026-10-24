import {sourcePresets} from '../move-in/csv-sources';
import {attestationsSchema} from '../move-in/incumbent-policy';
import {readSignupRefusals} from './signup-refusals';
import { loadSignupSettings, saveSignupSettings, signupSettingsSchema } from './signup-settings';
import { SenderAuthorityChanged } from '@/core/features/settings/sender-authority';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthVariables } from '@/core/features/auth/routes';
import type { Platform } from '@/core/shared/platform';
import { createAudienceImportService, audienceImportContext } from './import-service';
import { defaultMapping, presetStatuses } from './import-types';
import { loadSignupDescription } from './signup-routes';
import { AudienceCsvUnavailable } from './import-opt-out-lines';
import { importConflict } from './import-conflict';
import { recordActivity } from '@/core/features/auth/activity-record';
const inputSchema=z.object({files:z.array(z.object({name:z.string().min(1).max(200),csv:z.string().min(1),preset:z.enum(['csv-subscribed','csv-unsubscribed','csv-cleaned','csv-non-subscribed','mango','beehiiv','omnisend','customerio','activecampaign','klaviyo']),mapping:z.record(z.string(),z.string()).optional()})).min(1).max(10),consent:z.record(z.string(),z.string()).optional(),attestations:attestationsSchema.optional()});
export function createAudienceImportRoutes(platform: Platform) {
  const routes=new Hono<{Variables:AuthVariables}>(); const service=createAudienceImportService(platform);
  routes.get('/audience/import-presets',async context=>{
    const categories=await platform.database.$client.prepare(`SELECT 'newsletter' AS category
      UNION SELECT message_category FROM campaign_revisions WHERE TRIM(message_category) <> ''
      UNION SELECT message_category FROM consent_evidence WHERE TRIM(message_category) <> ''
      ORDER BY category`).all<{category:string}>();
    return context.json({messageCategories:categories.results.map(row=>row.category),presets:Object.entries(presetStatuses).map(([id,status])=>({id,status,label:sourcePresets[id]?`${sourcePresets[id]} CSV export`:id==='mango'?'Mango audience export':id.replace('csv-','CSV: '),description:sourcePresets[id]?'Original source statuses and attributes are retained. Active rows need your source attestation; every opt-out and suppression stays restricted.':id==='mango'?'Lossless Mango consent ledger':'Choose the status this CSV represents. Preview import then shows how its columns map, and you can change them. Restrictive row statuses always take precedence.'})),
    // SMS columns are offered only where text messages are enabled.
    fields:Object.keys(defaultMapping).filter(id=>platform.sms||!id.startsWith('sms_')).map(id=>({id,label:id.replaceAll('_',' ')}))});
  });
  routes.get('/audience/signup/refusals',async context=>context.json({...await readSignupRefusals(platform.database.$client),challengeConfigured:Boolean(platform.config.signupTurnstile)}));
  routes.get('/audience/signup',async context=>{
    const origin=platform.config.local===true?new URL(context.req.url).origin:platform.config.publicBaseUrl;
    const url=new URL('/subscribe',origin).toString();
    const settings=await loadSignupSettings(platform);
    return context.json({...await loadSignupDescription(platform),embedOrigins:settings.embedOrigins,url,embed:`<iframe src="${url}" title="Subscribe to the newsletter" width="100%" height="560" style="border:0"></iframe>`});
  });
  routes.put('/audience/signup',async context=>{
    context.header('Cache-Control','no-store');
    const operator=context.get('operator'); if(!operator)return context.json({error:'unauthenticated'},401);
    const parsed=signupSettingsSchema.safeParse(await context.req.json().catch(()=>null));
    if(!parsed.success)return context.json({error:'invalid_signup_settings',fields:parsed.error.flatten().fieldErrors},400);
    try {return context.json(await saveSignupSettings(platform,parsed.data,operator.id,context.req.raw));}
    catch(error){return context.json({error:error instanceof SenderAuthorityChanged?'challenge_change_owner_or_admin_required':error instanceof Error&&error.message==='kiosk_challenge_required'?'kiosk_challenge_required':'signup_settings_save_failed'},error instanceof SenderAuthorityChanged?403:error instanceof Error&&error.message==='kiosk_challenge_required'?400:500);}
  });
  routes.get('/audience/export',async context=>{
    context.header('Cache-Control','no-store');
    try {
      const csv=await service.exportCsv();
      await recordActivity(platform.database.$client,{key:`audience-exported:${crypto.randomUUID()}`,action:'audience.exported',entityType:'audience',entityId:'audience',actorId:context.get('operator').id});
      return new Response(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="audience.csv"','Cache-Control':'no-store'}});
    }
    catch(error) {
      if(error instanceof AudienceCsvUnavailable)return context.json({error:'complete_csv_unavailable',detail:error.message,help:'/docs/backup-and-export#export-and-restore-a-local-copy'},409);
      throw error;
    }
  });
  routes.post('/audience/import-preview',async context=>{
    const parsed=inputSchema.safeParse(await context.req.json().catch(()=>null));
    if(!parsed.success) return context.json({error:'invalid_import',detail:'Choose CSV files and their export presets.'},400);
    try{return context.json(await service.preview(parsed.data,await audienceImportContext(platform,context.get('operator').id,context.req.raw)));}
    catch(error){return context.json({error:'import_preview_failed',detail:error instanceof Error?error.message:'Preview failed.'},400);}
  });
  routes.post('/audience/imports',async context=>{
    const body=await context.req.json().catch(()=>null);
    if(typeof body?.fingerprint!=='string')return context.json({error:'review_required'},400);
    try{
      const job=await service.create(body.fingerprint,await audienceImportContext(platform,context.get('operator').id,context.req.raw),{operator:context.get('operator'),request:context.req.raw});
      await recordActivity(platform.database.$client,{key:`import-applied:${job.id}`,action:'import.applied',entityType:'audience-import',entityId:job.id,actorId:context.get('operator').id,detail:{state:job.state}});
      return context.json({job});
    }
    catch(error){return context.json({error:'import_conflict',...importConflict(error,'start')},409);}
  });
  routes.get('/audience/imports',async context=>{
    const authority=await audienceImportContext(platform,context.get('operator').id,context.req.raw);
    const jobs=await Promise.all((await service.jobs()).map(job=>service.read(job.id,authority)));
    const abandoned=await service.abandonments(jobs.map(job=>job.id));
    return context.json({jobs:jobs.map(job=>({...job,...abandoned.get(job.id)}))});
  });
  routes.get('/audience/imports/:id/report',async context=>{
    try{return new Response(await service.report(context.req.param('id'),await audienceImportContext(platform,context.get('operator').id,context.req.raw)),{headers:{'Content-Type':'text/markdown; charset=utf-8','Content-Disposition':'attachment; filename=import-reconciliation.md','Cache-Control':'no-store'}});}
    catch{return context.json({error:'report_unavailable'},409);}
  });
  routes.get('/audience/imports/:id',async context=>{
    try{return context.json({job:await service.read(context.req.param('id'),await audienceImportContext(platform,context.get('operator').id,context.req.raw))});}
    catch{return context.json({error:'not_found'},404);}
  });
  for(const action of ['resume','undo','abandon'] as const)routes.post(`/audience/imports/:id/${action}`,async context=>{
    try{const job=await service[action](context.req.param('id'),await audienceImportContext(platform,context.get('operator').id,context.req.raw));return context.json({job:{...job,...(await service.abandonments([job.id])).get(job.id)}});}
    catch(error){return context.json({error:'import_conflict',...importConflict(error,action)},409);}
  });
  return routes;
}

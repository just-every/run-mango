import {programme} from '@/core/features/sms/policy';
import {manualEntrySchema as consentCapture} from './manual-entry-schema';
import {loadSignupDescription} from './signup-routes';
import {senderWriteAuthority} from '@/core/features/settings/sender-authority';
import {loadOptInMode} from './opt-in-modes';
import type { AuthVariables } from '@/core/features/auth/routes';
import type {Platform,AppBindings} from '@/core/shared/platform';
import {createContactErasure,ErasureAdmissionConflict,ErasureAmbiguousText} from './erasure/service';
import {audienceImportContext} from './import-service';
import { Hono } from 'hono';
import { z } from 'zod';

import { readParams } from '@/core/api/input';
import { readJson } from '@/core/api/input';

import type { createAudienceService } from './service';
import { readContactTimeline } from './contact-timeline';
import { recordActivity } from '@/core/features/auth/activity-record';

const contactParams = z.object({ id: z.string().min(1) });

const merge = z.object({ survivorContactId: z.string().min(1), mergedContactId: z.string().min(1) });

export function createAudienceRoutes(service: ReturnType<typeof createAudienceService>, database: D1Database, platform:Platform, environment:AppBindings) {
  const erasure=createContactErasure(database,platform.config.contactHashSalt,{ASSETS_BUCKET:environment.ASSETS_BUCKET});
  const routes = new Hono<{Variables:AuthVariables}>();

  routes.get('/audience', async (context) => context.json({ contacts: await service.list() }));
  routes.get('/contacts/consent',async c=>{const description=await loadSignupDescription(platform);return c.json({...description,mode:await loadOptInMode(database,'manual'),sms:description.sms?{...description.sms,available:true,category:programme(platform).category}:{available:false,detail:platform.config.modules.sms.enabled?'SMS transport is unavailable.':platform.config.modules.sms.detail}});});
  routes.get('/contacts/search', async context => {
    const query=z.object({address:z.string().trim().min(2).max(320)}).safeParse(context.req.query());
    if(!query.success)return context.json({error:'invalid_search'},400);
    return context.json({contacts:await service.search(query.data.address)});
  });
  routes.post('/contacts/merge-preview',async context=>{
    const parsed=await readJson(context,merge);if('error'in parsed)return parsed.error;
    try {return context.json(await service.previewMerge(parsed.data.survivorContactId,parsed.data.mergedContactId));}
    catch(error) {return context.json({error:'contact_merge_failed',detail:error instanceof Error?error.message:'Unable to preview merge.'},409);}
  });
  routes.get('/contacts/:id' , async (context) => {
    const parsed = readParams(context, contactParams);
    if ('error' in parsed) return parsed.error;

    const detail = await service.detail(parsed.data.id);
    if (!detail) return context.json({ error: 'not_found' }, 404);
    const metadata = (await database.prepare('SELECT id,capture_ip,confirmation_ip FROM consent_capture_metadata WHERE contact_id=?').bind(parsed.data.id).all<{id:string;capture_ip:string|null;confirmation_ip:string|null}>()).results;
    const importObservations=(await database.prepare('SELECT * FROM audience_import_observations WHERE contact_id=? ORDER BY created_at').bind(parsed.data.id).all()).results;
    const campaignHistory=(await database.prepare(`WITH RECURSIVE identities(id) AS (SELECT ? UNION SELECT m.merged_contact_id FROM contact_merges m JOIN identities i ON m.survivor_contact_id=i.id) SELECT r.id,r.campaign_id AS campaignId,v.name,r.channel,r.transport_disposition AS disposition,r.skip_reason AS skipReason,r.created_at AS createdAt FROM recipient_steps r JOIN campaign_revisions v ON v.id=r.revision_id WHERE r.contact_id IN (SELECT id FROM identities) ORDER BY r.created_at DESC`).bind(parsed.data.id).all()).results;
    const smsServices=(await database.prepare('SELECT id,purpose,state,reason,provider_message_id,created_at,updated_at FROM sms_service_messages WHERE contact_id=? ORDER BY created_at DESC LIMIT 100').bind(parsed.data.id).all()).results;
    const timeline=await readContactTimeline(database,parsed.data.id,detail);
    return context.json({...detail,timeline,campaignHistory,importObservations,smsServices,consent:detail.consent.map(evidence=>({...evidence,captureIp:metadata.find(row=>row.id===evidence.id)?.capture_ip ?? null,confirmationIp:metadata.find(row=>row.id===evidence.id)?.confirmation_ip ?? null}))});
  });
  routes.get('/audience/sms-services',async context=>context.json({messages:(await database.prepare('SELECT id,contact_id,purpose,state,reason,provider_message_id,expires_at,next_at,created_at,updated_at FROM sms_service_messages ORDER BY created_at DESC LIMIT 100').all()).results}));
  routes.post('/contacts/consent', async (context) => {
    const parsed = await readJson(context, consentCapture);
    if ('error' in parsed) return parsed.error;
    try {
      const operator=context.get('operator'),mode=await loadOptInMode(database,'manual');
      const authority=await senderWriteAuthority(platform,context.req.raw,operator.id);
      const input={...parsed.data,captureMethod:'operator-recorded',captureSource:`Operator:${operator.displayName || operator.email} (${operator.id})|${parsed.data.permissionMethod ?? parsed.data.captureMethod}|${parsed.data.channel==='sms'?'express-written|':''}${parsed.data.captureSource}`};
      let result;
      if(input.channel==='email'){
        if(!input.contact.email||await service.publicSignupState(input.contact.email)!=='new')return context.json({error:'manual_entry_existing_restriction',detail:'This address is already subscribed, unsubscribed or suppressed. Hand entry cannot change that state.'},409);
        await service.ensureContact(input.contact,new Date());
        result=await service.capturePublicSignup({...input,confirmationRequired:mode.mode==='double',optInPolicy:{mode,allowResubscribe:false,operator:authority}});
        if(!result)return context.json({error:'manual_entry_state_changed',detail:'The address or opt-in mode changed. Review it before trying again.'},409);
      }else result=await service.captureConsent({...input,confirmationRequired:true,optInPolicy:{operator:authority,allowResubscribe:false}});
      if(parsed.data.properties)await database.prepare(`INSERT INTO integration_contact_profiles(contact_id,fields_json,tags_json) VALUES(?,?,'[]') ON CONFLICT(contact_id) DO UPDATE SET fields_json=excluded.fields_json`).bind(result.contact.id,JSON.stringify(parsed.data.properties)).run();
      await recordActivity(database, {key: `consent-entered:${result.evidence.id}`, action: 'consent.entered', entityType: 'contact', entityId: result.contact.id, actorId: context.get('operator').id,
        detail: {channel: parsed.data.channel, captureMethod: input.captureMethod, captureSource: input.captureSource, messageCategory: parsed.data.messageCategory}});
      return context.json({ contact: result.contact, evidence: result.evidence, confirmationRequired: Boolean(result.confirmation) }, 201);
    } catch (error) {
      return context.json({ error: 'consent_capture_failed', detail: error instanceof Error ? error.message : 'Consent capture failed.' }, 409);
    }
  });
  routes.post('/contacts/merge', async (context) => {
    const parsed = await readJson(context, merge);
    if ('error' in parsed) return parsed.error;
    try {
      const contact = await service.mergeContacts(parsed.data.survivorContactId, parsed.data.mergedContactId, context.get('operator').id);
      return context.json({ contact });
    } catch (error) {
      return context.json({ error: 'contact_merge_failed', detail: error instanceof Error ? error.message : 'Contact merge failed.' }, 409);
    }
  });
  routes.delete('/contacts/:id', async (context) => {
    const parsed = readParams(context, contactParams);
    if ('error' in parsed) return parsed.error;
    const authority=await audienceImportContext(platform,context.get('operator').id,context.req.raw);
    let result;
    try{result=await erasure.begin(parsed.data.id,authority);}
    catch(error){
      if(error instanceof ErasureAdmissionConflict)return context.json({error:'contact_erasure_conflict',detail:error.message},409);
      if(error instanceof ErasureAmbiguousText)return context.json({error:'contact_erasure_ambiguous_text',store:error.store,detail:error.message},409);
      throw error;
    }
    if(!result)return context.json({error:'not_found'},404);
    if(!platform.config.local)await platform.jobs.enqueue({kind:'contact.erase',idempotencyKey:`erasure:${result.reference}`,payload:{reference:result.reference}});
    return context.json({kind:result.state==='complete'?'erased':'erasing',receipt:result},result.state==='complete'?200:202);
  });

  routes.get('/audience/erasures/:reference',async context=>{const result=await erasure.read(context.req.param('reference'));return result?context.json({receipt:result}):context.json({error:'not_found'},404);});
  routes.post('/audience/erasures/:reference/resume',async context=>{
    const result=await erasure.advance(context.req.param('reference'),await audienceImportContext(platform,context.get('operator').id,context.req.raw));
    return result?context.json({kind:result.state==='complete'?'erased':'erasing',receipt:result},result.state==='complete'?200:202):context.json({error:'not_found'},404);
  });
  return routes;
}

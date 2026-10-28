import {currentAuthority,toolPermission} from './authorization';
import {nativeToolSpecs} from './catalogue';
import {ToolRefusal,type ResourceContext,type ToolContext} from '@/vendor/base/agent-door/index.ts';
import {hasPermission,type Capability,type ProductRole} from '../auth/permissions';
import {sha256} from '@/core/shared/ids';
import type {NativeRequest} from './native';

type Context=ResourceContext|ToolContext;
export const resourceTemplates=['mango://campaigns/{id}','mango://campaigns/{id}/revisions/{revision}',
 'mango://campaigns/{id}/review','mango://campaigns/{id}/results','mango://contacts/{id}',
 'mango://segments/{id}','mango://designs/{id}','mango://sender/readiness','mango://imports/{id}/report',
 'mango://flows/{id}','mango://activity/{id}','mango://operations/{id}',
 'mango://templates/{id}','mango://blocks/{id}','mango://assets/{id}','mango://reports/{id}','mango://store/syncs/{id}','mango://access/{id}'];
function permit(ctx:Context,capability:Capability){if(!hasPermission(ctx.person.role as ProductRole,capability))throw new ToolRefusal('not_found');}
export async function nativeRecord(kind:string,id:string,ctx:Context,native:NativeRequest):Promise<unknown> {
 const db=ctx.db;
 const capabilities:Record<string,Capability>={sender:'campaign.read',checks:'campaign.read',design:'draft.write',access:'operators.manage',imports:'audience.import',witness:'activity.read',recipients:'report.read'};
 if(capabilities[kind])await currentAuthority(ctx,capabilities[kind]);
 if(kind==='recipients'){
  return {recipients:(await db.prepare('SELECT id,contact_id,campaign_id,revision_id,step_id,channel,transport_disposition,skip_reason,attempt_count,provider,provider_message_id,updated_at FROM recipient_steps WHERE campaign_id=? ORDER BY id').bind(id).all()).results};
 }
 if(kind==='sender'){
  permit(ctx,'campaign.read');
  // A read reports stored evidence; it does not refresh DNS, call a provider or expose a receipt token.
  return {identity:await db.prepare("SELECT display_name,from_email,reply_to_email,physical_address,updated_at FROM sender_settings WHERE id='business'").first(),
   status:'stored_evidence',note:'Use sender.verify for a new provider check. Sending still requires current native observed-receipt evidence.'};
 }
 if(kind==='checks'){
  permit(ctx,'campaign.read');
  if(!await db.prepare('SELECT id FROM campaigns WHERE id=?').bind(id).first())throw new ToolRefusal('not_found');
  return {checks:(await db.prepare('SELECT c.* FROM campaign_checks c JOIN campaign_revisions r ON r.id=c.revision_id WHERE r.campaign_id=? ORDER BY c.created_at,c.id').bind(id).all()).results};
 }
 if(kind==='design'){
  permit(ctx,'draft.write');
  const job=await db.prepare('SELECT id,campaign_id,state,brief,candidate_count,chosen_slot,layerdoc_sha256,error_code,created_at,updated_at,deadline_at FROM design_jobs WHERE id=?').bind(id).first();
  if(!job)throw new ToolRefusal('not_found');
  return {job,candidates:(await db.prepare('SELECT slot,state,width,height,bytes FROM design_candidates WHERE job_id=? ORDER BY slot').bind(id).all()).results};
 }
 if(kind==='access'){
  permit(ctx,'operators.manage');
  return {operators:(await db.prepare(`SELECT n.id,n.display_name,n.role,n.status,r.role AS product_role,r.unmasked_contacts
   FROM oa_operators n LEFT JOIN operator_product_roles r ON r.operator_id=n.id ORDER BY n.id`).all()).results};
 }
 if(kind==='imports'){
  permit(ctx,'audience.import');
  const job=await db.prepare('SELECT id,state,checkpoint,total,error FROM ik_jobs WHERE id=?').bind(id).first();
  if(!job)throw new ToolRefusal('not_found');
  return {job};
 }
 if(kind==='witness'){
  permit(ctx,'activity.read');
  const names=['campaigns','campaign_revisions','campaign_steps','campaign_revision_links','campaign_checks','campaign_approval_requests',
   'campaign_revision_candidates','campaign_audiences','recipient_steps','delivery_facts','step_dispatches','contact_history','contacts',
   'contact_email_addresses','contact_phone_numbers','consent_evidence','contact_suppressions','contact_merges','audience_segments',
   'campaign_templates','reusable_email_blocks','reusable_email_block_placements','campaign_assets','design_jobs','design_candidates',
   'proposals','woocommerce_flows','woocommerce_flow_enrollments','flow_draft_revisions','newsletter_archive',
   'insight_report_schedules','insight_report_deliveries','signup_settings','oa_operators','operator_product_roles','sender_settings',
   'sending_connection','source_sync_runs','source_sync_cursors','source_records','source_syncs','source_authorities','audience_source_authority',
   'source_activities','integration_contact_profiles','woocommerce_connection','insight_saved_reports','sender_verification_challenges',
   'sender_verification_observations','sender_owner_confirmations','mango_agent_custody'];
  const tables:Record<string,{count:number;sha256:string}>={};
  const existing=new Set((await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all<{name:string}>()).results.map(row=>row.name));
  for(const name of names){
   if(!existing.has(name))continue;
   const columns=(await db.prepare(`PRAGMA table_info("${name}")`).all<{name:string}>()).results.map(row=>row.name)
    .filter(key=>!/(?:secret|token|password|credential|api_key|private_key|outbound_request|provider_.*json|report_json)/i.test(key));
   const rows=(await db.prepare(`SELECT ${columns.map(key=>'"'+key+'"').join(',')} FROM "${name}" ORDER BY rowid`).all()).results;
   tables[name]={count:rows.length,sha256:await sha256(JSON.stringify(rows))};
  }
  return {tables};
 }
 throw new ToolRefusal('not_found');
}
export function protectedRecords(value:unknown):number {
 if(!value||typeof value!=='object')return 0;
 if(Array.isArray(value))return value.reduce((sum,item)=>sum+protectedRecords(item),0);
 let count=0;
 for(const [key,item]of Object.entries(value)){
  if(/^(captureIp|confirmationIp|capture_ip|confirmation_ip|phoneE164|phone_e164|consentText|consent_text)$/.test(key)&&typeof item==='string'&&item.length&&!['••••','Restricted'].includes(item))count++;
  else count+=protectedRecords(item);
 }
 return count;
}
export async function readResource(uri:string,ctx:Context,native:NativeRequest):Promise<unknown> {
 const url=new URL(uri);if(url.protocol!=='mango:')throw new ToolRefusal('not_found');
 const parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent),id=parts[0];
 if(url.hostname==='sender'&&parts.join('/')==='readiness')return nativeRecord('sender','',ctx,native);
 if(url.hostname==='campaigns'&&id){
  if(parts[1]==='revisions'){
   permit(ctx,'campaign.read');
   const record=await ctx.db.prepare('SELECT id,campaign_id,version,state,name,email_subject,email_body,email_text,updated_at FROM campaign_revisions WHERE id=? AND campaign_id=?').bind(parts[2],id).first();
   if(!record)throw new ToolRefusal('not_found');return {revision:record};
  }
  return native(`/api/campaigns/${encodeURIComponent(id)}${parts[1]?'/'+parts[1]:''}`,'GET',{},ctx);
 }
 if(url.hostname==='contacts'&&id)return native('/api/contacts/'+encodeURIComponent(id),'GET',{},ctx);
 if(url.hostname==='segments'&&id){
  const result=await native('/api/audience/segments','GET',{},ctx) as {segments:Array<{id:string}>};
  const segment=result.segments.find(row=>row.id===id);if(!segment)throw new ToolRefusal('not_found');return {segment};
 }
 if(url.hostname==='designs'&&id)return nativeRecord('design',id,ctx,native);
 if(url.hostname==='imports'&&id&&parts[1]==='report')return nativeRecord('imports',id,ctx,native);
 if(url.hostname==='flows'&&id){
  const result=await native('/api/flows','GET',{},ctx) as {flows:Array<{id:string}>};
  let flow:unknown=result.flows.find(row=>row.id===id);
  if(!flow){permit(ctx,'flow.read');flow=await ctx.db.prepare('SELECT id,name,graph_json,created_at FROM flow_draft_revisions WHERE id=?').bind(id).first();}
  if(!flow)throw new ToolRefusal('not_found');return {flow};
 }
 const metadata:Record<string,{permission:Capability;sql:string}>={
  templates:{permission:'campaign.read',sql:'SELECT id,name,updated_at FROM campaign_templates WHERE id=?'},
  blocks:{permission:'campaign.read',sql:'SELECT id,name,block_json,version,updated_at FROM reusable_email_blocks WHERE id=?'},
  assets:{permission:'draft.write',sql:'SELECT id,sha256,content_type,bytes,width,height,created_at FROM campaign_assets WHERE id=?'},
  reports:{permission:'settings.manage',sql:'SELECT id,report_id,cadence,next_at,enabled,updated_at FROM insight_report_schedules WHERE id=?'},
  store:{permission:'integration.manage',sql:'SELECT id,provider,source_type,state,created_at,updated_at FROM source_sync_runs WHERE id=?'},
  access:{permission:'operators.manage',sql:'SELECT n.id,n.display_name,n.status,r.role,r.unmasked_contacts FROM oa_operators n LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=?'},
 };
 if(metadata[url.hostname]){
  const value=metadata[url.hostname];await currentAuthority(ctx,value.permission);
  const target=url.hostname==='store'?parts[1]:id;
  const record=await ctx.db.prepare(value.sql).bind(target).first();if(!record)throw new ToolRefusal('not_found');return {record};
 }
 if(url.hostname==='activity'&&id){
  const result=await native('/api/activity?stored=true','GET',{object:id},ctx) as {entries:unknown[]};
  if(!result.entries.length)throw new ToolRefusal('not_found');return result;
 }
 if(url.hostname==='operations'&&id){
  const row=await ctx.db.prepare('SELECT id,tool,sponsor_id,target_uri,attribution_json,result_json,created_at FROM mango_agent_operations WHERE id=?').bind(id).first<{id:string;tool:string;sponsor_id:string}>();
  if(!row)throw new ToolRefusal('not_found');
  const spec=nativeToolSpecs.find(spec=>spec.name===row.tool);
  if(row.sponsor_id===ctx.person.id&&spec&&ctx.scopes.includes(spec.scope))await currentAuthority(ctx,toolPermission(spec));
  else {if(!ctx.scopes.includes('mango:activity:read'))throw new ToolRefusal('not_found');await currentAuthority(ctx,'activity.read');}
  return {operation:row};
 }
 throw new ToolRefusal('not_found');
}

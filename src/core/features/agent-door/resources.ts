import type { ResourceDefinition, ResourceContext, ClassAndFacts } from '@/vendor/base/agent-door/index.ts';
import type { Platform } from '@/core/shared/platform';
import { resourcePermission } from './native';
import { projectPrivateResponse, contactPrivacyRole } from '../auth/response-privacy';

const standard = (): ClassAndFacts[] => [{class:'standard',facts:{measure:1}}];
const id = (value: string) => {try {return decodeURIComponent(value);} catch {return '';}};
const row = (value: unknown) => value as Record<string,unknown> | null;
/** Native primary-record projections. No reader refreshes, syncs, sends or generates. */
export function mangoResources(platform: Platform): ResourceDefinition[] {
  const db = platform.database.$client;
  const resources: ResourceDefinition[] = [];
  function define(uriTemplate: string, capability: Parameters<typeof resourcePermission>[2],
    read: (parts: string[], ctx: ResourceContext) => Promise<unknown>, sensitive = false) {
    const parts = uriTemplate.split('/'), pattern = new RegExp('^'+parts.map(part=>part.startsWith('{')?'([^/]+)':part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('/')+'$');
    resources.push({uriTemplate,name:uriTemplate,mimeType:'application/json',scope:'mango.resources.read',
      classes:sensitive?['standard','sensitive']:['standard'],
      async classify(record) {
        const value=row(record.json);
        return value?.protected === true ? [{class:'sensitive',facts:{measure:1,kind:'consent-network-evidence'}}] : standard();
      },
      async read(uri,ctx) {
        const match=pattern.exec(uri);
        if (!match || !await resourcePermission(platform,ctx,capability)) return null;
        const value=await read(match.slice(1).map(id),ctx);
        return value===null||value===undefined?null:{json:value,untrusted:true};
      },
    });
  }
  const campaign = async (campaignId: string, revisionId?: string) => db.prepare(
    `SELECT r.id,r.campaign_id campaignId,r.version,r.state,r.name,r.email_subject emailSubject,r.email_body emailBody,r.email_text emailText,
      r.preheader,r.sender_name senderName,r.inclusion_rule_json inclusionRuleJson,r.exclusion_rules_json exclusionRulesJson,r.updated_at updatedAt,
      c.state campaignState FROM campaign_revisions r JOIN campaigns c ON c.id=r.campaign_id
      WHERE c.id=? AND r.id=${revisionId?'?':'c.active_revision_id'}`).bind(campaignId,...(revisionId?[revisionId]:[])).first();
  for (const suffix of ['', '/revisions/{revision}', '/review']) define('mango://campaigns/{id}'+suffix,'campaign.read',async ([campaignId,revisionId],ctx)=>{
    const record=await campaign(campaignId,revisionId); if(!record)return null;
    const operator=await resourcePermission(platform,ctx,'campaign.read');if(!operator)return null;
    return projectPrivateResponse(contactPrivacyRole(operator),'/api/campaigns/'+encodeURIComponent(campaignId),{revision:record});
  });
  define('mango://campaigns/{id}/results','report.read',async ([campaignId])=>{
    if(!await db.prepare('SELECT id FROM campaigns WHERE id=?').bind(campaignId).first())return null;
    return {recipients:(await db.prepare('SELECT channel,transport_disposition disposition,skip_reason reason,count(*) count FROM recipient_steps WHERE campaign_id=? GROUP BY channel,transport_disposition,skip_reason').bind(campaignId).all()).results,
      attempts:(await db.prepare('SELECT id,transport_disposition disposition,attempt_count attemptCount FROM recipient_steps WHERE campaign_id=?').bind(campaignId).all()).results};
  });
  define('mango://contacts/{id}','contact.read',async ([contactId],ctx)=>{
    const contact=await db.prepare('SELECT id,display_name displayName,email,email_status emailStatus,sms_status smsStatus,created_at createdAt,updated_at updatedAt FROM contacts WHERE id=?').bind(contactId).first();
    if(!contact)return null;
    const operator=await resourcePermission(platform,ctx,'contact.read');if(!operator)return null;
    const metadata=(await db.prepare('SELECT id,capture_ip captureIp,confirmation_ip confirmationIp FROM consent_capture_metadata WHERE contact_id=?').bind(contactId).all()).results;
    const projected=projectPrivateResponse(contactPrivacyRole(operator),'/api/contacts/'+encodeURIComponent(contactId),{contact,consent:metadata}) as Record<string,unknown>;
    return {...projected,protected:projected.masked!==true&&metadata.some(item=>item.captureIp||item.confirmationIp)};
  },true);
  define('mango://erasures/{id}','contact.erase',async ([reference],ctx)=>{
    if((await resourcePermission(platform,ctx,'contact.erase'))?.role!=='owner')return null;
    return db.prepare('SELECT reference,state,requested_at requestedAt,completed_at completedAt,counts_json removed FROM audience_erasures WHERE reference=?').bind(reference).first();
  });
  define('mango://segments/{id}','segment.read',async ([segmentId])=>db.prepare('SELECT id,name,inclusion_rule_json inclusionRuleJson,exclusion_rules_json exclusionRulesJson,updated_at updatedAt FROM audience_segments WHERE id=?').bind(segmentId).first());
  define('mango://designs/{id}','draft.write',async ([jobId])=>{
    const job=await db.prepare('SELECT id,campaign_id campaignId,state,brief,chosen_slot chosenSlot,layerdoc_sha256 layerDocSha256,error_code errorCode,updated_at updatedAt FROM design_jobs WHERE id=?').bind(jobId).first();
    if(!job)return null;
    return {job,candidates:(await db.prepare('SELECT slot,state,sha256,bytes,width,height FROM design_candidates WHERE job_id=? ORDER BY slot').bind(jobId).all()).results};
  });
  define('mango://sender/readiness','campaign.read',async ()=>({identity:platform.config.mailSender,
    evidence:(await db.prepare('SELECT id,binding_digest,configuration_digest,observation_id,revoked_at FROM sender_verification_state').all()).results}));
  define('mango://imports/{id}/report','audience.import',async ([jobId])=>db.prepare('SELECT id,state,total,checkpoint,error FROM ik_jobs WHERE id=?').bind(jobId).first());
  define('mango://flows/{id}','flow.read',async ([flowId])=>{
    const flow=await db.prepare('SELECT id,name,tag,state,activated_by activatedBy,activated_at activatedAt FROM woocommerce_flows WHERE id=?').bind(flowId).first();
    if(flow)return {flow};
    return db.prepare('SELECT id,name,graph_json graph,created_at createdAt FROM flow_draft_revisions WHERE id=?').bind(flowId).first();
  });
  define('mango://activity/{id}','activity.read',async ([activityId])=>db.prepare('SELECT id,action,entity_type entityType,entity_id entityId,actor_type actorType,actor_id actorId,detail_json detail,occurred_at occurredAt FROM lifecycle_audit_entries WHERE id=?').bind(activityId).first());
  define('mango://assets/{id}','draft.write',async([assetId])=>db.prepare('SELECT id,sha256,content_type contentType,bytes,width,height FROM campaign_assets WHERE id=?').bind(assetId).first());
  define('mango://templates/{id}','draft.write',async([templateId])=>db.prepare('SELECT id,name,composition_json composition,updated_at updatedAt FROM campaign_templates WHERE id=?').bind(templateId).first());
  define('mango://blocks/{id}','draft.write',async([blockId])=>db.prepare('SELECT id,name,version,block_json block FROM reusable_email_blocks WHERE id=?').bind(blockId).first());
  define('mango://proposals/{id}','campaign.read',async([proposalId])=>db.prepare('SELECT id,state,send_by_at sendByAt FROM proposals WHERE id=?').bind(proposalId).first());
  define('mango://access/{id}','operators.manage',async([personId])=>db.prepare("SELECT n.id,n.display_name name,n.role nativeRole,n.status,r.role productRole,r.unmasked_contacts unmaskedContacts FROM oa_operators n LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=?").bind(personId).first());
  define('mango://signup/newsletter','form.manage',async()=>db.prepare("SELECT frequency_disclosure,embed_origins,kiosk_enabled,kiosk_device_label,challenge_enabled FROM signup_settings WHERE id='newsletter'").first());
  define('mango://connections/sending','provider.connect',async()=>db.prepare('SELECT state,connected_by,connected_at FROM sending_connection WHERE id=1').first());
  define('mango://store/readiness','integration.manage',async()=>({runs:(await db.prepare('SELECT id,source_type,state,updated_at FROM source_sync_runs ORDER BY updated_at DESC LIMIT 100').all()).results}));
  define('mango://reports/schedules/{id}','settings.manage',async([scheduleId])=>db.prepare('SELECT id,report_id reportId,cadence,next_at nextAt,enabled,recipients_json recipients FROM insight_report_schedules WHERE id=?').bind(scheduleId).first());
  return resources;
}

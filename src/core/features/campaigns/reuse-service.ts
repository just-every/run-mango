import { savedEmailSize } from './saved-email-size';
import type { EmailSizeOptions } from './email-size';
import { createFollowupService } from './followup-service';
import { eq } from 'drizzle-orm';
import type { Database } from '@/core/platform/db/client';
import { ulid } from '@/core/shared/ids';
import { createDraft } from './create-draft';
import { campaignRevisions } from './campaign-schema';
import { draftCompositionSchema, type DraftComposition } from './draft-composition';
import { draftStepSettings } from './reuse-schema';
import { starterTemplates } from './starter-templates';

export type UnscheduledStep = { channel: 'email' | 'sms'; timezone: string; whyThisTime: string };
type Snapshot = { composition: DraftComposition; stepSettings: UnscheduledStep[] };
type Template = { id: string; name: string; composition_json: string; updated_at: number };
const contentFields = ['emailSubject','emailBody','emailText','preheader','smsBody','senderName','fromEmail','replyToEmail','smsSender','physicalAddress','messageCategory','inclusionRuleJson','exclusionRulesJson','trackingEnabled','utmPolicyJson'] as const;

export function createCampaignReuseService(database: Database, defaults: () => DraftComposition, timezone: string, sizeOptions: EmailSizeOptions = {}) {
  const db = database.$client;
  async function snapshot(revisionId: string): Promise<Snapshot | undefined> {
    const revision = await database.query.campaignRevisions.findFirst({where:eq(campaignRevisions.id,revisionId)});
    if (!revision || revision.state === 'erasure-invalidated') return undefined;
    const [steps, pending] = await Promise.all([
      db.prepare('SELECT channel, timezone, why_this_time FROM campaign_steps WHERE revision_id=? ORDER BY sequence').bind(revisionId).all<{channel:'email'|'sms';timezone:string;why_this_time:string}>(),
      db.prepare('SELECT settings_json FROM campaign_draft_step_settings WHERE revision_id=?').bind(revisionId).first<{settings_json:string}>(),
    ]);
    const composition: DraftComposition = {name:revision.name};
    for (const key of contentFields) Object.assign(composition,{[key]:revision[key]});
    return {composition, stepSettings:steps.results.length ? steps.results.map(step=>({channel:step.channel,timezone:step.timezone,whyThisTime:step.why_this_time})) : pending ? JSON.parse(pending.settings_json) : []};
  }
  async function start(value: Snapshot, operatorId: string, name: string) {
    const composition = draftCompositionSchema.parse({...value.composition,name,steps:[]});
    return createDraft(database,composition,operatorId,({revisionId})=>value.stepSettings.length ? [database.insert(draftStepSettings).values({revisionId,settingsJson:JSON.stringify(value.stepSettings)})] : [],sizeOptions);
  }
  return {
    followup:createFollowupService(database,snapshot,sizeOptions),
    async list() {
      const saved = await db.prepare('SELECT id,name,updated_at FROM campaign_templates ORDER BY updated_at DESC,id').all<{id:string;name:string;updated_at:number}>();
      return {templates:[...starterTemplates.map(({id,name,kind})=>({id,name,kind,updatedAt:null})),...saved.results.map(row=>({id:row.id,name:row.name,kind:'saved' as const,updatedAt:new Date(row.updated_at).toISOString()}))]};
    },
    async duplicate(campaignId: string, operatorId: string) {
      const source = await db.prepare('SELECT active_revision_id FROM campaigns WHERE id=?').bind(campaignId).first<{active_revision_id:string}>();
      const value = source && await snapshot(source.active_revision_id);
      return value ? start(value,operatorId,`Copy of ${value.composition.name}`.slice(0,160)) : undefined;
    },
    async save(input:{revisionId:string;name:string;templateId?:string;updatedAt?:number}, operatorId:string) {
      const value = await snapshot(input.revisionId);
      if (!value) return {kind:'not_found' as const};
      await savedEmailSize(database,{emailSubject:'',emailBody:'',emailText:'',preheader:'',physicalAddress:'',smsBody:'',...value.composition},sizeOptions);
      const now = Date.now();
      if (input.templateId) {
        if (input.updatedAt === undefined) return {kind:'conflict' as const};
        const updated = await db.batch([
          db.prepare("INSERT INTO lifecycle_audit_entries (id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) SELECT ?,?,'campaign-template',id,'template.updated','operator',?,?,?,? FROM campaign_templates WHERE id=? AND updated_at=?").bind(ulid(),ulid(),operatorId,JSON.stringify({sourceRevisionId:input.revisionId}),now,now,input.templateId,input.updatedAt),
          db.prepare('UPDATE campaign_templates SET name=?,composition_json=?,updated_by=?,updated_at=MAX(updated_at+1,?) WHERE id=? AND updated_at=?').bind(input.name,JSON.stringify(value),operatorId,now,input.templateId,input.updatedAt),
        ]);
        return updated[1].meta.changes ? {kind:'saved' as const,id:input.templateId} : {kind:'conflict' as const};
      }
      const id=ulid();
      await db.batch([
        db.prepare('INSERT INTO campaign_templates (id,name,composition_json,created_by,updated_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(id,input.name,JSON.stringify(value),operatorId,operatorId,now,now),
        db.prepare("INSERT INTO lifecycle_audit_entries (id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at) VALUES (?,?,'campaign-template',?,'template.created','operator',?,?,?,?)").bind(ulid(),ulid(),id,operatorId,JSON.stringify({sourceRevisionId:input.revisionId}),now,now),
      ]);
      return {kind:'saved' as const,id};
    },
    async fromTemplate(id:string,operatorId:string) {
      const starter=starterTemplates.find(item=>item.id===id);
      if (starter) return start({composition:{...defaults(),...starter.composition},stepSettings:[{channel:'email',timezone,whyThisTime:'Selected by the operator.'}]},operatorId,starter.name);
      const row=await db.prepare('SELECT id,name,composition_json,updated_at FROM campaign_templates WHERE id=?').bind(id).first<Template>();
      return row ? start(JSON.parse(row.composition_json),operatorId,row.name) : undefined;
    },
  };
}

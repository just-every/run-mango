import { ulid } from '@/core/shared/ids';
import { savedEmailSize } from './saved-email-size';
import type { EmailSizeOptions } from './email-size';
import {editSchedule} from './edit-schedule';
import { summarizeAudienceRules, withDerivedAudience } from './audience-summary';
import { normalizeAuthoredContent } from './authoring-content';
import { parseStructuredRules } from '@/core/features/lifecycle/rules';
import { createDraft } from './create-draft';
import { authoredExclusionReasons, persistedClaimIsGrounded, restoreExclusionClaims, unavailableTimingClaim } from './persisted-proposal-claims';
import { campaignClaimProjection } from './campaign-claim-projection';
import { asc, eq } from 'drizzle-orm';

import type { Database } from '@/core/platform/db/client';

import type { DraftComposition } from './draft-composition';
import { campaignReviewSnapshot } from './review-snapshot';
import {
  campaignAudiences,
  campaignAudienceChannelCounts,
  campaignRevisionLinks,
  campaignRevisions,
  campaignSteps,
} from './campaign-schema';

type MutableRevisionField = Exclude<keyof DraftComposition, 'links' | 'steps' | 'emailMobile'>;

const revisionColumns: Record<MutableRevisionField, string> = {
  name: 'name',
  audienceRule: 'audience_rule',
  emailSubject: 'email_subject',
  emailBody: 'email_body',
  emailText: 'email_text',
  preheader: 'preheader',
  smsBody: 'sms_body',
  senderName: 'sender_name',
  fromEmail: 'from_email',
  replyToEmail: 'reply_to_email',
  smsSender: 'sms_sender',
  physicalAddress: 'physical_address',
  messageCategory: 'message_category',
  inclusionRuleJson: 'inclusion_rule_json',
  exclusionRulesJson: 'exclusion_rules_json',
  sourceTypesJson: 'source_types_json',
  trackingEnabled: 'tracking_enabled',
};

function draftGuard(revisionId: string, savedAt: Date) {
  return `EXISTS (
    SELECT 1 FROM campaign_revisions
    WHERE id = '${revisionId.replaceAll("'", "''")}' AND state = 'draft'
      AND updated_at = ${savedAt.getTime()}
  )`;
}

function revisionUpdate(composition: DraftComposition, updatedAt: Date, revisionId: string, savedAt: Date) {
  const fields = (Object.keys(revisionColumns) as MutableRevisionField[]).flatMap((field) =>
    composition[field] === undefined ? [] : [[revisionColumns[field], composition[field]] as const],
  );
  const assignments = [...fields.map(([column]) => `${column} = ?`), 'updated_at = MAX(updated_at + 1, ?)'];
  const values = [...fields.map(([, value]) => value), updatedAt.getTime()];
  return {
    sql: `UPDATE campaign_revisions SET ${assignments.join(', ')} WHERE id = ? AND state = 'draft' AND updated_at = ?`,
    values: [...values, revisionId, savedAt.getTime()],
  };
}

export function createCampaignCompositionRepository(database: Database, sizeOptions: EmailSizeOptions = {}) {
  async function read(revisionId: string) {
    const reads = await Promise.allSettled([
      database.query.campaignRevisions.findFirst({where: eq(campaignRevisions.id, revisionId)}),
      database
        .select()
        .from(campaignSteps)
        .where(eq(campaignSteps.revisionId, revisionId))
        .orderBy(asc(campaignSteps.sequence)),
      database
        .select()
        .from(campaignRevisionLinks)
        .where(eq(campaignRevisionLinks.revisionId, revisionId))
        .orderBy(asc(campaignRevisionLinks.sequence)),
      database.query.campaignAudiences.findFirst({
        where: eq(campaignAudiences.revisionId, revisionId),
      }),
      campaignClaimProjection(database,revisionId),
      database.select({count: campaignAudienceChannelCounts})
        .from(campaignAudienceChannelCounts)
        .innerJoin(campaignAudiences, eq(campaignAudiences.id, campaignAudienceChannelCounts.audienceId))
        .where(eq(campaignAudiences.revisionId, revisionId))
        .orderBy(asc(campaignAudienceChannelCounts.channel)),
    ]);
    const value = <T,>(result: PromiseSettledResult<T>): T => {
      if (result.status === 'rejected') throw result.reason;
      return result.value;
    };
    const revision = value(reads[0]);
    if (!revision) return undefined;
    const steps = value(reads[1]), links = value(reads[2]);
    const pending = await database.$client.prepare('SELECT settings_json FROM campaign_draft_step_settings WHERE revision_id=?').bind(revisionId).first<{settings_json:string}>();
    const audience = value(reads[3]), projection = value(reads[4]);
    const audienceChannelCounts = value(reads[5]).map(row => row.count);

    // Old full saves and revision copies also carry unknown generated prose. Only
    // durable manual provenance or exact recorded observations permit display.
    const displayedSteps = steps.map(step=>projection && step.timingOrigin!=='operator' && !persistedClaimIsGrounded(step.whyThisTime,projection.evidence)
      ? {...step,whyThisTime:'',claimsUnavailable:unavailableTimingClaim} : step);

    return {
      revision: withDerivedAudience({...revision,stepSettings: pending ? JSON.parse(pending.settings_json) as import('./reuse-service').UnscheduledStep[] : [],exclusionRulesJson:projection?.exclusionRulesJson??revision.exclusionRulesJson}),
      steps: displayedSteps,
      links,
      ...campaignReviewSnapshot(revision, steps, audience&&projection?{...audience,exclusions:projection.exclusionsJson(audience.exclusions)}:audience, audienceChannelCounts),
    };
  }

  return {
    read,
    async editable(campaignId:string) {
      // An active draft remains the editor's authority even if historical draft
      // copies exist. Approved campaigns instead expose their latest replacement.
      const row=await database.$client.prepare(`SELECT r.id FROM campaign_revisions r JOIN campaigns c ON c.id=r.campaign_id
        WHERE r.campaign_id=? AND r.state='draft'
        ORDER BY CASE WHEN r.id=c.active_revision_id THEN 0 ELSE 1 END,r.version DESC LIMIT 1`).bind(campaignId).first<{id:string}>();
      return row?read(row.id):undefined;
    },
    editSchedule:(campaignId:string,composition:DraftComposition,operatorId:string)=>editSchedule(database,campaignId,composition,operatorId,sizeOptions),
    createDraft: (composition: DraftComposition, operatorId: string) => createDraft(database, composition, operatorId, undefined, sizeOptions),

    async saveDraft(id: string, composition: DraftComposition, updatedAt: Date, deferRead = false, actorId?: string) {
      // Saving uses raw persisted authority, never the display-only claim projection.
      const storedRevision = await database.query.campaignRevisions.findFirst({where:eq(campaignRevisions.id,id)});
      if (!storedRevision) return { kind: 'not_found' as const };
      if (storedRevision.state !== 'draft') return { kind: 'not_draft' as const };
      const [storedLinks, storedSteps] = await Promise.all([
        composition.links===undefined && composition.emailBody===undefined
          ? database.select().from(campaignRevisionLinks).where(eq(campaignRevisionLinks.revisionId,id)).orderBy(asc(campaignRevisionLinks.sequence))
          : [],
        composition.steps===undefined?[]:database.select().from(campaignSteps).where(eq(campaignSteps.revisionId,id)),
      ]);

      composition = normalizeAuthoredContent({...composition, emailBody:composition.emailBody ?? storedRevision.emailBody, links:composition.links ?? (composition.emailBody !== undefined ? [] : storedLinks.map(({label,destinationUrl})=>({label,destinationUrl})))});
      await savedEmailSize(database, {...storedRevision,...composition}, sizeOptions);
      // Persist the complete rule pair and its summary in the same guarded update.
      // Partial edits and concurrent saves must never combine prose with another rule pair.
      composition.inclusionRuleJson ??= storedRevision.inclusionRuleJson;
      composition.exclusionRulesJson = composition.exclusionRulesJson===undefined?storedRevision.exclusionRulesJson
        :restoreExclusionClaims(composition.exclusionRulesJson,storedRevision.exclusionRulesJson);
      const rules = parseStructuredRules(composition.inclusionRuleJson, composition.exclusionRulesJson);
      if (!rules.ok) throw new Error('Invalid audience rules.');
      composition.audienceRule = summarizeAudienceRules(composition.inclusionRuleJson, composition.exclusionRulesJson);
      composition.sourceTypesJson = JSON.stringify(rules.sourceTypes);
      const guard = draftGuard(id, storedRevision.updatedAt);
      const statements: D1PreparedStatement[] = [];
      const prepare = (query: string, ...values: unknown[]) =>
        statements.push(database.$client.prepare(query).bind(...values));

      // Content now determines fallback usage as well as approval checks.
      // Every saved edit invalidates the complete review under the draft guard.
      {
        prepare(`DELETE FROM campaign_checks WHERE revision_id = ? AND ${guard}`, id);
        prepare(
          `DELETE FROM campaign_audience_channel_counts
           WHERE audience_id IN (
             SELECT id FROM campaign_audiences WHERE revision_id = ? AND ${guard}
           )`,
          id,
        );
        prepare(`DELETE FROM campaign_audiences WHERE revision_id = ? AND ${guard}`, id);
      }

      if (composition.links !== undefined) {
        prepare(`DELETE FROM campaign_revision_links WHERE revision_id = ? AND ${guard}`, id);
        for (const [index, link] of composition.links.entries()) {
          prepare(
            `INSERT INTO campaign_revision_links
             (id, revision_id, sequence, label, destination_url, created_at, updated_at)
             SELECT ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`,
            crypto.randomUUID(),
            id,
            index + 1,
            link.label,
            link.destinationUrl,
            updatedAt.getTime(),
            updatedAt.getTime(),
          );
        }
      }

      if (composition.steps !== undefined) {
        prepare(`DELETE FROM campaign_draft_step_settings WHERE revision_id = ? AND ${guard}`, id);
        prepare(`DELETE FROM campaign_steps WHERE revision_id = ? AND ${guard}`, id);
        for (const [index, step] of composition.steps.entries()) {
          prepare(
            `INSERT INTO campaign_steps
             (id, revision_id, sequence, channel, timezone, scheduled_at, send_by_at, why_this_time, timing_origin, created_at, updated_at)
             SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${guard}`,
            crypto.randomUUID(),
            id,
            index + 1,
            step.channel,
            step.timezone,
            new Date(step.scheduledAt).getTime(),
            new Date(step.sendByAt).getTime(),
            step.whyThisTime,
            storedSteps.some(previous=>previous.whyThisTime===step.whyThisTime&&previous.timingOrigin!=='operator')?null:'operator',
            updatedAt.getTime(),
            updatedAt.getTime(),
          );
        }
      }

      prepare(`UPDATE campaign_revisions SET authored_exclusion_reasons_json=? WHERE id=? AND ${guard}`,
        JSON.stringify(authoredExclusionReasons(composition.exclusionRulesJson,storedRevision.exclusionRulesJson,JSON.parse(storedRevision.authoredExclusionReasonsJson))),id);

      // OPER-007: the append-only record is written in the same guarded batch as the save it records.
      if (actorId) {
        const operation = ulid(updatedAt.getTime());
        prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
          SELECT ?,?,'campaign-revision',?,'draft.saved','operator',?,json_object('campaignId',?),?,? WHERE ${guard}`,
          operation, operation, id, actorId, storedRevision.campaignId, updatedAt.getTime(), updatedAt.getTime());
      }
      const update = revisionUpdate(composition, updatedAt, id, storedRevision.updatedAt);
      prepare(update.sql, ...update.values);
      const results = await database.$client.batch(statements);
      const updateResult = results.at(-1);
      if (!updateResult?.meta.changes) {
        const current = await database.query.campaignRevisions.findFirst({where:eq(campaignRevisions.id,id)});
        return !current ? {kind:'not_found' as const}
          : current.state !== 'draft' ? {kind:'not_draft' as const}
          : {kind:'stale_revision' as const};
      }

      // The combined save/check/read path hydrates once, after its live checks.
      if (deferRead) return {kind: 'written' as const, revision: {id, campaignId: storedRevision.campaignId}};
      const saved = await read(id);
      if (!saved) throw new Error(`Draft revision ${id} disappeared after its composition was saved.`);
      return { kind: 'updated' as const, composition: saved };
    },
  };
}

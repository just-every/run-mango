import { exportCampaignsCsv } from './export';
import type { EmailSizeOptions } from './email-size';
import { schedulerObservation } from '@/core/features/lifecycle/scheduler-observation';
import { createProposalRepository } from '@/core/features/proposals/repository';
import { enrichAdvisoryAcknowledgements } from '@/core/features/lifecycle/advisory-acknowledgements';
import { isAcknowledgableFinding } from '@/core/features/lifecycle/advisory-policy';
import { asc, desc, eq } from 'drizzle-orm';
import { createCampaignResultRepository } from './result-repository';
import { createCampaignListRepository } from './list-repository';
import { campaignClaimProjection } from './campaign-claim-projection';
import { campaignAttribution } from './campaign-attribution';

import type { Database } from '@/core/platform/db/client';

import { campaignChecks, campaigns } from './campaign-schema';
import {
  proposalAudienceChannelCounts,
  proposalAudiences,
  proposalExclusions,
  proposals,
  proposalSteps,
} from './proposal-schema';

export function createCampaignRepository(database: Database,sizeOptions:EmailSizeOptions = {}) {
  return {
    exportCsv: (actorId: string) => exportCampaignsCsv(database, actorId),
    ...createCampaignResultRepository(database),
    attribution:(campaignId:string,revisionId:string)=>campaignAttribution(database.$client,campaignId,revisionId),
    scheduler: (now:Date) => schedulerObservation(database.$client).read(now),
    async listProposals(now = new Date()) {
      await createProposalRepository(database).expireDue(now);
      const rows = await database.select().from(proposals).where(eq(proposals.state,'proposed'));
      const forecast = (row:typeof rows[number]) => JSON.parse(row.decisionContextJson).forecast;
      // Currency is part of the value: never compare incomparable monetary units.
      const currencies = new Set(rows.map(row=>forecast(row)).filter(value=>value?.status==='available').map(value=>value.currency));
      return rows.sort((a,b)=>{
        const af=forecast(a),bf=forecast(b);
        const av=currencies.size===1&&af?.status==='available'?af.valueMinor:null;
        const bv=currencies.size===1&&bf?.status==='available'?bf.valueMinor:null;
        if(av!==null||bv!==null) {if(av===null)return 1;if(bv===null)return -1;if(av!==bv)return bv-av;}
        return a.sendByAt.getTime()-b.sendByAt.getTime()||a.id.localeCompare(b.id);
      });
    },

    async recentProposalDecisions() {
      const result=await database.$client.prepare(`SELECT t.proposal_id AS proposalId,p.title,t.to_state AS state,t.actor_id AS actorId,t.reason,t.occurred_at AS occurredAt
        FROM proposal_transitions t JOIN proposals p ON p.id=t.proposal_id
        WHERE t.to_state IN ('approved','dismissed','expired','failed') ORDER BY t.occurred_at DESC,t.id DESC LIMIT 20`).all<{proposalId:string;title:string;state:string;actorId:string;reason:string|null;occurredAt:number}>();
      return result.results.map(event=>({...event,occurredAt:new Date(event.occurredAt).toISOString()}));
    },

    async getProposal(id: string, now = new Date()) {
      await createProposalRepository(database).expireDue(now);
      return database.query.proposals.findFirst({ where: eq(proposals.id, id) });
    },

    listProposalExclusions(proposalId: string) {
      return database
        .select()
        .from(proposalExclusions)
        .where(eq(proposalExclusions.proposalId, proposalId))
        .orderBy(desc(proposalExclusions.count));
    },

    listProposalSteps(proposalId: string) {
      return database
        .select()
        .from(proposalSteps)
        .where(eq(proposalSteps.proposalId, proposalId))
        .orderBy(asc(proposalSteps.sequence));
    },

    async proposalAudience(proposalId: string) {
      const audience = await database.query.proposalAudiences.findFirst({
        where: eq(proposalAudiences.proposalId, proposalId),
      });
      if (!audience) return { audience: undefined, audienceChannelCounts: [] };
      const audienceChannelCounts = await database
        .select()
        .from(proposalAudienceChannelCounts)
        .where(eq(proposalAudienceChannelCounts.audienceId, audience.id))
        .orderBy(asc(proposalAudienceChannelCounts.channel));
      return { audience, audienceChannelCounts };
    },

    async proposalEvidence(id:string) {
      const [evidence, history] = await Promise.all([
        database.$client.prepare('SELECT source_record_id AS sourceRecordId, source_type AS sourceType, claim_key AS key, observed_value_json AS observedValueJson, occurred_at AS occurredAt FROM proposal_evidence_items WHERE proposal_id=? ORDER BY occurred_at,claim_key').bind(id).all<{sourceRecordId:string;sourceType:string;key:string;observedValueJson:string;occurredAt:number}>(),
        database.$client.prepare('SELECT from_state AS fromState,to_state AS toState,actor_id AS actorId,reason,occurred_at AS occurredAt FROM proposal_transitions WHERE proposal_id=? ORDER BY occurred_at,id').bind(id).all<{fromState:string;toState:string;actorId:string;reason:string|null;occurredAt:number}>(),
      ]);
      return {evidenceItems:evidence.results.map(({observedValueJson,occurredAt,...item})=>({...item,observedValue:JSON.parse(observedValueJson),occurredAt:new Date(occurredAt)})),history:history.results.map(({occurredAt,...item})=>({...item,occurredAt:new Date(occurredAt)}))};
    },
    listCampaigns: createCampaignListRepository(database),

    getCampaign(id: string) {
      return database.query.campaigns.findFirst({ where: eq(campaigns.id, id) });
    },

    async uncertainDeliveries(campaignId: string) {
      const rows = await database.$client.prepare(`SELECT id, destination, provider_message_id AS providerMessageId,
        COALESCE(last_error_detail, 'Handoff outcome unknown. Review provider and receiver evidence before taking action.') AS detail
        FROM recipient_steps WHERE campaign_id = ? AND revision_id = (SELECT active_revision_id FROM campaigns WHERE id = ?) AND transport_disposition = 'handoff-unknown' ORDER BY created_at`)
        .bind(campaignId,campaignId).all<{id:string;destination:string;providerMessageId:string|null;detail:string}>();
      return rows.results;
    },

    async listChecks(revisionId: string) {
      const checks = await database
        .select()
        .from(campaignChecks)
        .where(eq(campaignChecks.revisionId, revisionId))
        .orderBy(asc(campaignChecks.kind));
      const [enriched, projection] = await Promise.all([
        checks.some(isAcknowledgableFinding)
          ? enrichAdvisoryAcknowledgements(database,revisionId,checks,sizeOptions)
          : checks.map(check=>({...check,findingIdentity:undefined,acknowledgement:undefined})),
        campaignClaimProjection(database,revisionId),
      ]);
      return projection?enriched.map(check=>projection.check(check)):enriched;
    },

  };
}

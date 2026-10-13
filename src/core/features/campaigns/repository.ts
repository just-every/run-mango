import { asc, desc, eq } from 'drizzle-orm';
import { createCampaignResultRepository } from './result-repository';
import { createCampaignListRepository } from './list-repository';

import type { Database } from '@/core/platform/db/client';

import { campaignChecks, campaigns } from './campaign-schema';
import {
  proposalAudienceChannelCounts,
  proposalAudiences,
  proposalExclusions,
  proposals,
  proposalSteps,
} from './proposal-schema';

export function createCampaignRepository(database: Database) {
  return {
    ...createCampaignResultRepository(database),
    listProposals() {
      return database.select().from(proposals).orderBy(desc(proposals.createdAt));
    },

    getProposal(id: string) {
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

    listChecks(revisionId: string) {
      return database
        .select()
        .from(campaignChecks)
        .where(eq(campaignChecks.revisionId, revisionId))
        .orderBy(asc(campaignChecks.kind));
    },

  };
}

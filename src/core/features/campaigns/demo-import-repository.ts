import { summarizeAudienceRules } from './audience-summary';
import type { Database } from '@/core/platform/db/client';

import type { DemoAudienceSnapshot } from './demo-audience-snapshot';
import {
  campaignAudiences,
  campaignAudienceChannelCounts,
  campaignChecks,
  campaignRevisionLinks,
  campaignRevisions,
  campaigns,
  campaignSteps,
} from './campaign-schema';
import {
  proposalAudienceChannelCounts,
  proposalAudiences,
  proposalExclusions,
  proposals,
  proposalSteps,
} from './proposal-schema';

type DemoSchedule = {
  timezone: string;
  scheduledOffsetDays: number;
  sendByOffsetDays: number;
  whyThisTime: string;
};

type DemoStep = {
  id: string;
  sequence: number;
  channel: 'email' | 'sms';
  schedule: DemoSchedule;
};

export type LocalDemoCampaign = {
  id: string;
  proposalId?: string;
  state: 'draft' | 'scheduled';
  revision: {
    id: string;
    version: number;
    name: string;
    emailSubject: string;
    emailBody: string;
    emailText: string;
    smsBody: string;
    senderName: string;
    fromEmail: string;
    replyToEmail: string;
    smsSender: string;
    links: Array<{ label: string; destinationUrl: string }>;
    steps: DemoStep[];
  };
};

export type LocalDemoProposal = {
  id: string;
  campaignId?: string;
  title: string;
  summary: string;
  evidence: string;
  steps: DemoStep[];
};

function atOffset(now: Date, days: number) {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}

function audienceId(ownerId: string) {
  return `${ownerId}_audience`;
}

export function createCampaignDemoImportRepository(database: Database) {
  return {
    async importLocalDemoCampaign(
      campaign: LocalDemoCampaign,
      _audienceRule: string,
      snapshot: DemoAudienceSnapshot,
      now: Date,
    ) {
      const revision = campaign.revision;
      const inclusionRuleJson = JSON.stringify({
        version: 1, operator: 'all',
        predicates: [{ sourceType: 'browsing', field: 'savedProduct', comparator: 'eq', value: true, lookbackDays: 30 }],
      });
      const revisionAudienceId = audienceId(revision.id);
      await database
        .insert(campaigns)
        .values({
          id: campaign.id,
          proposalId: campaign.proposalId ?? null,
          state: campaign.state,
          activeRevisionId: revision.id,
          cancelledAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      await database
        .insert(campaignRevisions)
        .values({
          id: revision.id,
          campaignId: campaign.id,
          version: revision.version,
          state: campaign.state === 'draft' ? 'draft' : 'scheduled',
          name: revision.name,
          emailSubject: revision.emailSubject,
          emailBody: revision.emailBody,
          emailText: revision.emailText,
          preheader: 'A saved item is still waiting for you.',
          smsBody: revision.smsBody,
          senderName: revision.senderName,
          fromEmail: revision.fromEmail,
          audienceRule: summarizeAudienceRules(inclusionRuleJson, '[]'),
          replyToEmail: revision.replyToEmail,
          smsSender: revision.smsSender,
          physicalAddress: '1 Sample Street, Brisbane QLD 4000, Australia',
          messageCategory: 'saved-product follow-up',
          inclusionRuleJson,
          exclusionRulesJson: '[]',
          sourceTypesJson: '["browsing"]',
          trackingEnabled: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      for (const [index, link] of revision.links.entries()) {
        await database
          .insert(campaignRevisionLinks)
          .values({
            id: `${revision.id}_link_${index + 1}`,
            revisionId: revision.id,
            sequence: index + 1,
            label: link.label,
            destinationUrl: link.destinationUrl,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
      for (const step of revision.steps) {
        await database
          .insert(campaignSteps)
          .values({
            id: step.id,
            revisionId: revision.id,
            sequence: step.sequence,
            channel: step.channel,
            timezone: step.schedule.timezone,
            scheduledAt: atOffset(now, step.schedule.scheduledOffsetDays),
            sendByAt: atOffset(now, step.schedule.sendByOffsetDays),
            whyThisTime: step.schedule.whyThisTime,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
      await database
        .insert(campaignAudiences)
        .values({
          id: revisionAudienceId,
          revisionId: revision.id,
          asOfAt: now,
          candidateCount: snapshot.candidateCount,
          excludedCount: snapshot.excludedCount,
          eligibleCount: snapshot.eligibleCount,
          exclusions: JSON.stringify(snapshot.exclusions),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      for (const count of snapshot.channelCounts) {
        await database
          .insert(campaignAudienceChannelCounts)
          .values({
            id: `${revisionAudienceId}_${count.channel}`,
            audienceId: revisionAudienceId,
            channel: count.channel,
            recipientStepCount: count.recipientStepCount,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
      await database
        .insert(campaignChecks)
        .values({
          id: `${revision.id}_provider_check`,
          revisionId: revision.id,
          kind: 'provider-capability',
          status: 'blocked',
          detail: 'Sender adapters are unconfigured.',
          blocking: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    },

    async importLocalDemoProposal(
      proposal: LocalDemoProposal,
      audienceRule: string,
      snapshot: DemoAudienceSnapshot,
      now: Date,
    ) {
      const proposalAudienceId = audienceId(proposal.id);
      const lastSendByOffset = Math.max(...proposal.steps.map((step) => step.schedule.sendByOffsetDays));
      await database
        .insert(proposals)
        .values({
          id: proposal.id,
          state: 'proposed',
          title: proposal.title,
          summary: proposal.summary,
          evidence: proposal.evidence,
          audienceRule,
          sourceDataAsOf: now,
          sendByAt: atOffset(now, lastSendByOffset),
          campaignId: proposal.campaignId ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      for (const exclusion of snapshot.exclusions) {
        await database
          .insert(proposalExclusions)
          .values({
            id: `${proposal.id}_exclusion_${exclusion.reason}`,
            proposalId: proposal.id,
            reason: exclusion.reason,
            count: exclusion.count,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
      for (const step of proposal.steps) {
        await database
          .insert(proposalSteps)
          .values({
            id: step.id,
            proposalId: proposal.id,
            sequence: step.sequence,
            channel: step.channel,
            timezone: step.schedule.timezone,
            scheduledAt: atOffset(now, step.schedule.scheduledOffsetDays),
            sendByAt: atOffset(now, step.schedule.sendByOffsetDays),
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
      await database
        .insert(proposalAudiences)
        .values({
          id: proposalAudienceId,
          proposalId: proposal.id,
          asOfAt: now,
          candidateCount: snapshot.candidateCount,
          excludedCount: snapshot.excludedCount,
          eligibleCount: snapshot.eligibleCount,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      for (const count of snapshot.channelCounts) {
        await database
          .insert(proposalAudienceChannelCounts)
          .values({
            id: `${proposalAudienceId}_${count.channel}`,
            audienceId: proposalAudienceId,
            channel: count.channel,
            recipientStepCount: count.recipientStepCount,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing();
      }
    },
  };
}

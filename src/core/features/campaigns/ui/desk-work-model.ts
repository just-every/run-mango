import type { CampaignListEntry } from '@/core/app/client/lib/types';
import { dispositionLabel } from './result-copy';

export type DeskGroupKey = 'waiting' | 'scheduled' | 'sent';

/** One part of a row's meta line: text, or a date (`time`) between optional words. */
export type MetaPart = { text?: string; before?: string; time?: string; after?: string };

const members: Record<DeskGroupKey, readonly string[]> = {
  waiting: ['erasure-invalidated', 'draft'],
  scheduled: ['paused', 'scheduled', 'dispatching'],
  sent: ['completed'],
};
const limits: Record<DeskGroupKey, number> = { waiting: 5, scheduled: 4, sent: 3 };

const at = (value: string | null) => (value === null ? Infinity : Date.parse(value));
const lastSent = (row: CampaignListEntry) => Date.parse(row.lastOutcomeAt ?? row.updatedAt);

/** Stable sorts: ties keep the API order (newest edit first). */
const orders: Record<DeskGroupKey, (a: CampaignListEntry, b: CampaignListEntry) => number> = {
  waiting: (a, b) => Number(b.state === 'erasure-invalidated') - Number(a.state === 'erasure-invalidated') || at(a.plannedAt) - at(b.plannedAt),
  scheduled: (a, b) => Number(b.state === 'paused') - Number(a.state === 'paused') || at(a.nextScheduledAt) - at(b.nextScheduledAt),
  sent: (a, b) => lastSent(b) - lastSent(a),
};

export function deskGroup(key: DeskGroupKey, campaigns: CampaignListEntry[]) {
  const rows = campaigns.filter(campaign => members[key].includes(campaign.state)).sort(orders[key]);
  return { rows: rows.slice(0, limits[key]), total: rows.length, overflow: rows.length > limits[key] };
}

export const pausedCampaigns = (campaigns: CampaignListEntry[]) => campaigns.filter(campaign => campaign.state === 'paused');

export const campaignChannels = (campaign: CampaignListEntry) => campaign.channels.map(channel => (channel === 'sms' ? 'SMS' : 'Email')).join(' · ') || 'No saved steps';

const outcomeWords = (campaign: CampaignListEntry) =>
  campaign.lastOutcome ? dispositionLabel({ disposition: campaign.lastOutcome, reason: campaign.lastSkipReason, count: 1 }) : null;

/** The pill's own rule (campaign-status-pill.tsx): a completed campaign reads Sent once something was handed off. */
export const handedOff = (campaign: CampaignListEntry) => ['handed-off', 'accepted', 'delivered', 'bounced'].includes(campaign.lastOutcome ?? '');

export function metaParts(key: DeskGroupKey, campaign: CampaignListEntry, passed: boolean): MetaPart[] {
  const channels: MetaPart = { text: campaignChannels(campaign) };
  const outcome = outcomeWords(campaign);
  if (key === 'waiting') {
    if (campaign.state === 'erasure-invalidated') return [channels];
    return [campaign.plannedAt ? { before: 'Planned ', time: campaign.plannedAt, after: passed ? ', passed' : '' } : { text: 'No send time yet' }, channels];
  }
  if (key === 'scheduled') {
    if (campaign.state === 'scheduled') return [campaign.nextScheduledAt ? { before: 'Next send ', time: campaign.nextScheduledAt } : { text: 'No upcoming send' }, channels];
    if (outcome) return [{ text: outcome }, { time: campaign.lastOutcomeAt ?? campaign.updatedAt }, channels];
    return [...(campaign.nextScheduledAt ? [{ before: 'Next send ', time: campaign.nextScheduledAt }] : []), channels];
  }
  return [...(outcome ? [{ text: outcome }] : []), { time: campaign.lastOutcomeAt ?? campaign.updatedAt }, channels];
}

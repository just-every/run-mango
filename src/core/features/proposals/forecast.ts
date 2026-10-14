import type { Database } from '@/core/platform/db/client';

export type ProposalForecast = {
  status: 'available' | 'insufficient'; metric: 'expected-revenue'; valueMinor: number | null;
  currency: string | null; method: string; campaignIds: string[]; sourceEventIds: string[];
  recipientStepIds: string[]; sampleSize: number; campaignCount: number; eventCount: number;
  historicalNetRevenueMinor: number | null; proposedRecipientSteps: number; asOf: string;
};

/** All mature frozen recipient-steps, including zero-revenue campaigns and failures,
 * are in the denominator. Mixed currencies cannot be meaningfully added or ranked. */
export async function computeProposalForecast(database: Database, proposedRecipientSteps: number, now: Date): Promise<ProposalForecast> {
  const cutoff = now.getTime() - 7 * 86400000;
  const recipients = await database.$client.prepare(`SELECT r.id, r.campaign_id FROM recipient_steps r
    WHERE r.send_by_at <= ? AND NOT EXISTS (SELECT 1 FROM recipient_steps pending
      WHERE pending.campaign_id = r.campaign_id AND pending.send_by_at > ?)
    ORDER BY r.campaign_id, r.id`).bind(cutoff, cutoff).all<{id:string;campaign_id:string}>();
  const campaignIds = [...new Set(recipients.results.map(row => row.campaign_id))];
  const events = await database.$client.prepare(`SELECT a.order_source_record_id, a.currency,
    a.gross_amount_minor - a.refund_amount_minor AS net FROM attribution_facts a
    JOIN recipient_steps r ON r.id = a.recipient_step_id
    WHERE r.send_by_at <= ? AND a.attributed_at <= ? AND a.attribution_window_days = 7
    AND NOT EXISTS (SELECT 1 FROM recipient_steps pending WHERE pending.campaign_id = r.campaign_id AND pending.send_by_at > ?)
    ORDER BY a.order_source_record_id`).bind(cutoff, now.getTime(), cutoff).all<{order_source_record_id:string;currency:string;net:number}>();
  const currencies = new Set(events.results.map(row => row.currency));
  const sufficient = campaignIds.length >= 3 && recipients.results.length >= 20 && events.results.length >= 3 && currencies.size === 1;
  const net = events.results.reduce((sum, event) => sum + event.net, 0);
  return {
    status:sufficient?'available':'insufficient', metric:'expected-revenue',
    valueMinor:sufficient?Math.round(net / recipients.results.length * proposedRecipientSteps):null,
    currency:currencies.size === 1 ? [...currencies][0] : null,
    method:'Own mature cohort v1: all frozen recipient-steps from campaigns whose latest send-by is at least 7 days old, including failures and zero-revenue campaigns. Sum 7-day attributed order revenue less recorded refunds, divide by all cohort recipient-steps, multiply by this proposal’s eligible recipient-steps, round to minor units. Requires at least 3 campaigns, 20 recipient-steps, 3 attributed orders and one currency. Historical extrapolation, not a confidence interval; mixed currencies are unavailable.',
    campaignIds, sourceEventIds:events.results.map(row=>row.order_source_record_id),
    recipientStepIds:recipients.results.map(row=>row.id), sampleSize:recipients.results.length,
    campaignCount:campaignIds.length,eventCount:events.results.length,
    historicalNetRevenueMinor:currencies.size===1?net:null,proposedRecipientSteps,asOf:now.toISOString(),
  };
}

export type ProposalAudienceSnapshot = {
  asOf: Date; candidateCount: number; excludedCount: number; eligibleCount: number;
  exclusions: Array<{reason:string;count:number}>;
  channelCounts: Array<{channel:string;recipientStepCount:number}>;
};
export type ProposalDecisionContext = { audience: ProposalAudienceSnapshot; forecast: ProposalForecast };

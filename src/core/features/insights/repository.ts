import {usageReport} from './usage-report';
import {mailboxReport} from './mailbox-report';
import {openEstimates} from './open-tracking';
import { recordExternalCost, type ExternalCost } from './cost-recording';
import { costGroups, costReport } from './cost-report';
import type { Database } from '@/core/platform/db/client';
import { commerceReport } from './commerce-report';

export function createInsightsRepository(database: Database) {
  const client = database.$client;
  return {
    usageReport:()=>usageReport(database),
    costReport: () => costReport(database),
    mailboxes: (since:Date,until:Date) => mailboxReport(client,since,until),
    /** One row per campaign and observed outcome, never summed: provider acceptance, each kind of
     * provider event, and hand-offs still awaiting the provider's confirmation. */
    async listResults() {
      const rows = await client.prepare(
        `SELECT campaign_id, 'accepted' metric, COUNT(*) value, MAX(provider_accepted_at) observed_at, COALESCE(provider, 'provider') source
           FROM recipient_steps WHERE provider_accepted_at IS NOT NULL GROUP BY campaign_id, provider
         UNION ALL
         SELECT r.campaign_id, f.kind, COUNT(DISTINCT r.id), MAX(f.provider_occurred_at), f.provider
           FROM delivery_facts f JOIN recipient_steps r ON r.id = f.recipient_step_id WHERE f.kind <> 'accepted'
           GROUP BY r.campaign_id, f.kind, f.provider
         UNION ALL
         SELECT campaign_id, 'awaiting-confirmation', COUNT(*), MAX(handoff_started_at), COALESCE(provider, 'provider')
           FROM recipient_steps WHERE transport_disposition = 'handoff-unknown' GROUP BY campaign_id, provider
         ORDER BY observed_at DESC, metric`,
      ).all<{ campaign_id: string; metric: string; value: number; observed_at: number; source: string }>();
      return rows.results.map(row => ({ id: `${row.campaign_id}:${row.metric}:${row.source}`, campaignId: row.campaign_id,
        metric: row.metric, value: Number(row.value), observedAt: new Date(row.observed_at), source: row.source }));
    },

    async campaignResult(campaignId: string) {
      const [counts, engagement, attribution, costs, timeline] = await Promise.all([
        client.prepare(
          `SELECT
             COUNT(CASE WHEN provider_accepted_at IS NOT NULL THEN 1 END) accepted,
             COUNT(CASE WHEN transport_disposition = 'delivered' THEN 1 END) delivered,
             COUNT(CASE WHEN transport_disposition = 'bounced' THEN 1 END) bounced,
             COUNT(CASE WHEN transport_disposition = 'skipped' THEN 1 END) skipped,
             COUNT(CASE WHEN transport_disposition = 'failed' THEN 1 END) failed,
             COUNT(CASE WHEN complained_at IS NOT NULL THEN 1 END) complained,
             COUNT(CASE WHEN suppressed_at IS NOT NULL THEN 1 END) suppressed,
             COUNT(CASE WHEN handed_off_at IS NOT NULL OR provider_message_id IS NOT NULL THEN 1 END) handed_off
           FROM recipient_steps WHERE campaign_id = ?`,
        ).bind(campaignId).first<Record<string, number>>(),
        client.prepare(
          `SELECT
             COUNT(CASE WHEN automated = 0 THEN 1 END) observed_clicks,
             COUNT(CASE WHEN automated = 1 THEN 1 END) automated_requests
           FROM link_click_facts c JOIN recipient_steps r ON r.id = c.recipient_step_id
           WHERE r.campaign_id = ?`,
        ).bind(campaignId).first<Record<string, number>>(),
        commerceReport(database,campaignId),
        costGroups(database, 'campaign', campaignId),
        client.prepare(
          `SELECT kind, provider_occurred_at occurred_at, provider, recipient_step_id, payload_digest
           FROM delivery_facts WHERE recipient_step_id IN (SELECT id FROM recipient_steps WHERE campaign_id = ?)
           UNION ALL
           SELECT to_state kind, occurred_at, actor_type provider, campaign_id recipient_step_id, '' payload_digest
           FROM campaign_state_transitions WHERE campaign_id = ?
           ORDER BY occurred_at`,
        ).bind(campaignId, campaignId).all<Record<string, unknown>>(),
      ]);
      return {
        campaignId,
        outcomes: {
          handedOff: Number(counts?.handed_off ?? 0), accepted: Number(counts?.accepted ?? 0),
          delivered: Number(counts?.delivered ?? 0), bounced: Number(counts?.bounced ?? 0),
          skipped: Number(counts?.skipped ?? 0), failed: Number(counts?.failed ?? 0),
          complained: Number(counts?.complained ?? 0), suppressed: Number(counts?.suppressed ?? 0),
        },
        engagement: {
          observedClicks: Number(engagement?.observed_clicks ?? 0),
          automatedRequestsRetainedButExcluded: Number(engagement?.automated_requests ?? 0),
          opens: await openEstimates(client,campaignId),
        },
        attribution,
        costs,
        timeline: timeline.results,
      };
    },

    async deliverability(since: Date) {
      const rows = await client.prepare(
        `SELECT r.channel,GROUP_CONCAT(DISTINCT COALESCE(r.provider,'unrecorded')) providers,
           CASE WHEN r.channel = 'email' THEN lower(substr(v.from_email,instr(v.from_email,'@')+1)) ELSE v.sms_sender END sender,
           COUNT(DISTINCT CASE WHEN f.kind = 'delivered' THEN r.id END) delivered,
           COUNT(DISTINCT CASE WHEN f.kind = 'bounced' THEN r.id END) bounced,
           COUNT(DISTINCT CASE WHEN f.kind = 'complained' THEN r.id END) complained,
           COUNT(DISTINCT CASE WHEN r.transport_disposition = 'failed' THEN r.id END) failed,
           COUNT(DISTINCT CASE WHEN COALESCE(r.first_attempt_at,r.handoff_started_at,r.handed_off_at)>=? THEN r.id END) attempted,
           COUNT(DISTINCT CASE WHEN f.kind = 'bounced' AND json_extract(f.detail_json, '$.hard') = 1 THEN r.id END) hard_bounced
         FROM recipient_steps r JOIN campaign_revisions v ON v.id = r.revision_id
         LEFT JOIN delivery_facts f ON f.recipient_step_id = r.id AND f.provider_occurred_at >= ?
         -- Attempted handoffs include uncertainty; only provider facts establish delivery.
         WHERE COALESCE(r.first_attempt_at,r.handed_off_at,r.handoff_started_at)>=? OR f.recipient_step_id IS NOT NULL
         GROUP BY r.channel,sender ORDER BY r.channel,sender`,
      ).bind(since.getTime(),since.getTime(),since.getTime()).all<Record<string, unknown>>();
      return rows.results.map((row) => {
        const delivered = Number(row.delivered);
        const complained = Number(row.complained);
        const attempted = Number(row.attempted);
        const hardBounced = Number(row.hard_bounced);
        return {
          channel: row.channel, providers:String(row.providers).split(',').sort(), windowStart:since.toISOString(), sender: row.sender, delivered, bounced: Number(row.bounced), complained,
          failed: Number(row.failed), attempted, hardBounced,
          complaintRate: delivered ? complained / delivered : null,
          hardBounceRate: attempted ? hardBounced / attempted : null,
        };
      });
    },

    recordExternalCost: (input: ExternalCost) => recordExternalCost(database, input),
  };
}

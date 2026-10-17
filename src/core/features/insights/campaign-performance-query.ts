import type { Database } from '@/core/platform/db/client';
import { assertCampaignReportReadable } from './campaign-recipient-query';
import { openTrackingSettings } from './open-tracking';
import { sortCampaignPerformance, type CampaignPerformanceFilter, type CampaignPerformanceReport, type CampaignPerformanceRow } from './campaign-performance-model';

type Totals = {
  campaign_id: string; revision_id: string; version: number; name: string; state: string; active_revision: number;
  channel: string; topic: string; scheduled_at: number; last_scheduled_at: number;
  recipients: number; delivered: number; unsubscribes: number; complaints: number;
};
type Clicks = { revision_id: string; channel: string; total_clicks: number; unique_clicks: number };
type Revenue = { revision_id: string; channel: string; currency: string; gross: string; refunded: string };
type Opens = { revision_id: string; channel: string; estimated: number };

function selectedSteps(filter: CampaignPerformanceFilter) {
  const clauses: string[] = [], bindings: (string | number)[] = [];
  if (filter.channel) { clauses.push('s.channel=?'); bindings.push(filter.channel); }
  if (filter.topic) { clauses.push('v.message_category=?'); bindings.push(filter.topic); }
  if (filter.from) { clauses.push('s.scheduled_at>=?'); bindings.push(Date.parse(`${filter.from}T00:00:00Z`)); }
  if (filter.to) { clauses.push('s.scheduled_at<?'); bindings.push(Date.parse(`${filter.to}T00:00:00Z`) + 86_400_000); }
  return { bindings, sql: `WITH selected_steps AS (
    SELECT s.*,v.campaign_id,v.version,v.name,v.state,v.message_category topic,c.active_revision_id
    FROM campaign_steps s JOIN campaign_revisions v ON v.id=s.revision_id JOIN campaigns c ON c.id=v.campaign_id
    ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''}
  ), selected_recipients AS (
    SELECT r.* FROM recipient_steps r JOIN selected_steps s ON s.id=r.step_id
      AND s.revision_id=r.revision_id AND s.campaign_id=r.campaign_id AND s.channel=r.channel
  )` };
}

/** Historical revisions and channels never borrow another revision's recipients.
 * Date filters select scheduled steps, rather than clipping later provider/order facts. */
export async function campaignPerformance(database: Database, filter: CampaignPerformanceFilter = {}): Promise<CampaignPerformanceReport> {
  await assertCampaignReportReadable(database);
  const client = database.$client, selected = selectedSteps(filter);
  const settings = await openTrackingSettings(client);
  const query = (sql: string) => client.prepare(`${selected.sql} ${sql}`).bind(...selected.bindings);
  const [totals, clicks, revenue, opens, topics] = await Promise.all([
    query(`SELECT s.campaign_id,s.revision_id,s.version,s.name,s.state,
      s.revision_id=s.active_revision_id active_revision,s.channel,s.topic,
      MIN(s.scheduled_at) scheduled_at,MAX(s.scheduled_at) last_scheduled_at,
      COUNT(r.id) recipients,
      SUM(CASE WHEN r.transport_disposition='delivered' THEN 1 ELSE 0 END) delivered,
      SUM(CASE WHEN r.complained_at IS NOT NULL THEN 1 ELSE 0 END) complaints,
      SUM(CASE WHEN EXISTS(SELECT 1 FROM public_action_tokens t WHERE t.recipient_step_id=r.id AND t.purpose='unsubscribe' AND t.used_at IS NOT NULL)
        OR EXISTS(SELECT 1 FROM delivery_facts f WHERE f.recipient_step_id=r.id AND f.kind='unsubscribed') THEN 1 ELSE 0 END) unsubscribes
      FROM selected_steps s LEFT JOIN selected_recipients r ON r.step_id=s.id
      GROUP BY s.revision_id,s.channel`).all<Totals>(),
    query(`SELECT r.revision_id,r.channel,COUNT(*) total_clicks,COUNT(DISTINCT r.id) unique_clicks
      FROM selected_recipients r JOIN link_click_facts f ON f.recipient_step_id=r.id
      WHERE f.automated=0 GROUP BY r.revision_id,r.channel`).all<Clicks>(),
    // Read integer operands as text: JS Number cannot represent every aggregate.
    query(`SELECT r.revision_id,r.channel,a.currency,CAST(a.gross_amount_minor AS TEXT) gross,CAST(a.refund_amount_minor AS TEXT) refunded
      FROM selected_recipients r JOIN attribution_facts a ON a.recipient_step_id=r.id AND a.campaign_id=r.campaign_id`).all<Revenue>(),
    settings.enabled ? query(`SELECT r.revision_id,r.channel,COUNT(*) estimated FROM selected_recipients r
      JOIN open_estimate_facts f ON f.recipient_step_id=r.id GROUP BY r.revision_id,r.channel`).all<Opens>() : Promise.resolve({ results: [] as Opens[] }),
    client.prepare('SELECT DISTINCT message_category topic FROM campaign_revisions ORDER BY message_category').all<{ topic: string }>(),
  ]);
  const key = (revision: string, channel: string) => `${revision}:${channel}`;
  const clickGroups = new Map(clicks.results.map(row => [key(row.revision_id, row.channel), row]));
  const openGroups = new Map(opens.results.map(row => [key(row.revision_id, row.channel), row.estimated]));
  const revenueGroups = new Map<string, Map<string, { conversions: number; net: bigint }>>();
  for (const fact of revenue.results) {
    const id = key(fact.revision_id, fact.channel), currencies = revenueGroups.get(id) ?? new Map();
    const value = currencies.get(fact.currency) ?? { conversions: 0, net: 0n };
    value.conversions++; value.net += BigInt(fact.gross) - BigInt(fact.refunded);
    currencies.set(fact.currency, value); revenueGroups.set(id, currencies);
  }
  const rows: CampaignPerformanceRow[] = totals.results.map(total => {
    const id = key(total.revision_id, total.channel), click = clickGroups.get(id), recipients = Number(total.recipients);
    const revenueByCurrency = [...revenueGroups.get(id) ?? []].sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, value]) => ({ currency, conversions: value.conversions, netAmountMinor: value.net.toString() }));
    return { campaignId: total.campaign_id, revisionId: total.revision_id, revision: total.version, name: total.name,
      state: total.state, activeRevision: Boolean(total.active_revision), channel: total.channel, topic: total.topic,
      scheduledAt: new Date(total.scheduled_at).toISOString(), lastScheduledAt: new Date(total.last_scheduled_at).toISOString(),
      recipients, delivered: Number(total.delivered), totalClicks: Number(click?.total_clicks ?? 0), uniqueClicks: Number(click?.unique_clicks ?? 0),
      clickRate: recipients ? Number(click?.unique_clicks ?? 0) / recipients : null,
      unsubscribes: Number(total.unsubscribes), complaints: Number(total.complaints),
      conversions: revenueByCurrency.reduce((count, value) => count + value.conversions, 0), revenueByCurrency,
      ...(settings.enabled ? { openRateEstimate: total.channel === 'email' && recipients ? Number(openGroups.get(id) ?? 0) / recipients : null } : {}),
    };
  });
  return { rows: sortCampaignPerformance(rows, filter), filters: filter, topics: topics.results.map(row => row.topic),
    currencies: [...new Set(revenue.results.map(row => row.currency))].sort(), openEstimatesEnabled: settings.enabled,
    note: 'One row per saved revision and channel. UTC dates select scheduled steps; all recorded outcomes for those steps are included. Recipients and unique human clicks count recipient-steps, including repeated steps for the same person. Click rate divides unique clicked recipient-steps by recipients. Delivered requires a provider-confirmed delivered disposition. Unsubscribes and complaints overlap delivery. Conversions are attributed orders; net revenue subtracts recorded refunds and cancellations, separated by currency. Revenue per recipient is rounded to four decimal places. No currency conversion. Open-rate estimates divide image-load recipient-steps by email recipients and do not prove reading. Flow and flow-message performance is not available.' };
}

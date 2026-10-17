import type { Database } from '@/core/platform/db/client';
import { campaignReportCsv } from './campaign-recipient-csv';
import { assertCampaignReportReadable } from './campaign-recipient-query';

export type CampaignLinkSelector = { linkId: string } | { destinationUrl: string };
type ClickerRow = { contact_id: string; display_name: string; email: string | null; clicks: number; first_clicked_at: number; last_clicked_at: number };

/** A missing link never expands to all campaign clickers. No legacy click is
 * inferred from the recipient's other links. CSV and segmentation use these rows. */
export async function campaignLinkClickers(database: Database, campaignId: string, revisionId: string, selector: CampaignLinkSelector) {
  await assertCampaignReportReadable(database);
  const client = database.$client;
  const revision = await client.prepare('SELECT id FROM campaign_revisions WHERE id=? AND campaign_id=?').bind(revisionId, campaignId).first();
  if (!revision) return null;
  const link = 'linkId' in selector
    ? await client.prepare('SELECT destination_url FROM campaign_revision_links WHERE id=? AND revision_id=?')
      .bind(selector.linkId, revisionId).first<{ destination_url: string }>()
    : await client.prepare(`SELECT destination_url FROM campaign_revision_links WHERE revision_id=? AND destination_url=?
      UNION SELECT f.destination_url FROM link_click_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id
      WHERE r.campaign_id=? AND r.revision_id=? AND f.destination_url=? LIMIT 1`)
      .bind(revisionId, selector.destinationUrl, campaignId, revisionId, selector.destinationUrl).first<{ destination_url: string }>();
  if (!link) return null;
  const result = await client.prepare(`SELECT c.id contact_id,c.display_name,c.email,COUNT(*) clicks,
    MIN(f.occurred_at) first_clicked_at,MAX(f.occurred_at) last_clicked_at
    FROM link_click_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id JOIN contacts c ON c.id=r.contact_id
    WHERE r.campaign_id=? AND r.revision_id=? AND f.destination_url=? AND f.automated=0
    GROUP BY c.id ORDER BY c.id`).bind(campaignId, revisionId, link.destination_url).all<ClickerRow>();
  const rows = result.results.map(row => ({ contactId: row.contact_id, displayName: row.display_name, email: row.email,
    clicks: Number(row.clicks), firstClickedAt: new Date(row.first_clicked_at).toISOString(), lastClickedAt: new Date(row.last_clicked_at).toISOString() }));
  return { campaignId, revisionId, destinationUrl: link.destination_url, grouping: 'destination' as const, total: rows.length, rows };
}

export type CampaignLinkClickers = NonNullable<Awaited<ReturnType<typeof campaignLinkClickers>>>;
export function campaignLinkClickersCsv(report: CampaignLinkClickers) {
  return campaignReportCsv(['Contact ID', 'Name', 'Email', 'Clicks', 'First click', 'Last click'],
    report.rows.map(row => [row.contactId, row.displayName, row.email, row.clicks, row.firstClickedAt, row.lastClickedAt]));
}

/** Static membership snapshot. Review still rechecks consent and suppression.
 * Return null for an empty list; never replace it with a broad audience rule. */
export function campaignLinkClickerSegment(report: CampaignLinkClickers) {
  if (!report.rows.length) return null;
  return { inclusionRuleJson: JSON.stringify({ version: 1, operator: 'all', predicates: [
    { sourceType: 'contact', field: 'id', comparator: 'in', value: report.rows.map(row => row.contactId) },
  ] }), exclusionRulesJson: '[]' };
}

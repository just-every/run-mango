import type { Database } from '@/core/platform/db/client';
import { campaignReportCsv } from './campaign-recipient-csv';
import { assertCampaignReportReadable } from './campaign-recipient-query';

type AuthoredLink = { id: string; sequence: number; label: string; destination_url: string };
type ClickCounts = { destination_url: string | null; clicks: number; unique_clicks: number; automated: number };

/** Call only behind the native private API/session and erasure middleware.
 * The current sender issues one token per destination, so repeated authored
 * positions deliberately form one destination group rather than invented counts. */
export async function campaignEngagement(database: Database, campaignId: string, revisionId: string) {
  await assertCampaignReportReadable(database);
  const client = database.$client;
  const revision = await client.prepare('SELECT id FROM campaign_revisions WHERE id=? AND campaign_id=?')
    .bind(revisionId, campaignId).first();
  if (!revision) return null;
  const [authored, counts] = await Promise.all([
    client.prepare('SELECT id,sequence,label,destination_url FROM campaign_revision_links WHERE revision_id=? ORDER BY sequence,id')
      .bind(revisionId).all<AuthoredLink>(),
    client.prepare(`SELECT f.destination_url,
      SUM(CASE WHEN f.automated=0 THEN 1 ELSE 0 END) clicks,
      COUNT(DISTINCT CASE WHEN f.automated=0 THEN c.id END) unique_clicks,
      SUM(CASE WHEN f.automated=1 THEN 1 ELSE 0 END) automated
      FROM link_click_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id LEFT JOIN contacts c ON c.id=r.contact_id
      WHERE r.campaign_id=? AND r.revision_id=? GROUP BY f.destination_url`)
      .bind(campaignId, revisionId).all<ClickCounts>(),
  ]);
  const groups = new Map<string, AuthoredLink[]>();
  for (const link of authored.results) groups.set(link.destination_url, [...groups.get(link.destination_url) ?? [], link]);
  // SMS destinations and new clicks on old tokens may have no authored link row.
  for (const row of counts.results) if (row.destination_url !== null && !groups.has(row.destination_url)) groups.set(row.destination_url, []);
  const links = [...groups].map(([destinationUrl, positions]) => {
    const count = counts.results.find(row => row.destination_url === destinationUrl);
    return { linkId: positions[0]?.id ?? null, sequence: positions[0]?.sequence ?? null,
      label: positions.map(link => link.label).join(' / ') || destinationUrl,
      destinationUrl, authoredLinks: positions.map(link => ({ id: link.id, sequence: link.sequence, label: link.label })),
      sharedDestination: positions.length > 1,
      totalClicks: Number(count?.clicks ?? 0), uniqueClicks: Number(count?.unique_clicks ?? 0),
      automatedRequests: Number(count?.automated ?? 0) };
  });
  const legacy = counts.results.find(row => row.destination_url === null);
  return { campaignId, revisionId, grouping: 'destination' as const, links,
    legacyUnattributedClicks: Number(legacy?.clicks ?? 0), legacyAutomatedRequests: Number(legacy?.automated ?? 0),
    coverage: legacy ? 'Some historical clicks have no recorded link identity and are excluded from per-link counts.' : 'Every recorded click has a known destination.',
  };
}

export type CampaignEngagement = NonNullable<Awaited<ReturnType<typeof campaignEngagement>>>;

export function campaignEngagementCsv(report: CampaignEngagement) {
  return campaignReportCsv(['Link', 'Destination', 'Authored positions', 'Clicks', 'Unique clickers', 'Automated requests'],
    report.links.map(link => [link.label, link.destinationUrl, link.authoredLinks.map(position => position.sequence).join(';'), link.totalClicks, link.uniqueClicks, link.automatedRequests]));
}

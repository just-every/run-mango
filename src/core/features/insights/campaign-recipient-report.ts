import type { Database } from '@/core/platform/db/client';
import { campaignReportCsv } from './campaign-recipient-csv';
import { assertCampaignReportReadable, campaignRecipientRows, recipientFilter, recipientOutcomeCte, type CampaignRecipient, type CampaignRecipientPage } from './campaign-recipient-query';
export { campaignRecipientOutcomes } from './campaign-recipient-query';
export type { CampaignRecipient, CampaignRecipientFilter, CampaignRecipientOutcome, CampaignRecipientPage } from './campaign-recipient-query';

/** The API caller supplies the native session and pending-erasure fence.
 * Retained anonymous recipient rows remain counted, with no recoverable identity. */
export async function campaignRecipientReport(database: Database, campaignId: string, revisionId: string, options: CampaignRecipientPage = {}) {
  await assertCampaignReportReadable(database);
  const client = database.$client;
  if (!await client.prepare('SELECT id FROM campaign_revisions WHERE id=? AND campaign_id=?').bind(revisionId, campaignId).first()) return null;
  const filter = recipientFilter(options);
  const [rows, total, buckets, facts] = await Promise.all([
    campaignRecipientRows(database, campaignId, revisionId, options),
    client.prepare(`${recipientOutcomeCte} SELECT COUNT(*) total FROM outcomes ${filter.sql}`)
      .bind(campaignId, revisionId, ...filter.bindings).first<{ total: number }>(),
    client.prepare(`SELECT step_id,transport_disposition disposition,skip_reason reason,COUNT(*) count
      FROM recipient_steps WHERE campaign_id=? AND revision_id=? GROUP BY step_id,transport_disposition,skip_reason
      ORDER BY step_id,transport_disposition,skip_reason`).bind(campaignId, revisionId)
      .all<{ step_id: string; disposition: string; reason: string | null; count: number }>(),
    client.prepare(`${recipientOutcomeCte} SELECT step_id,
      SUM(CASE WHEN complained_at IS NOT NULL THEN 1 ELSE 0 END) complained,
      SUM(CASE WHEN suppressed_at IS NOT NULL THEN 1 ELSE 0 END) suppressed,
      SUM(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 ELSE 0 END) unsubscribed
      FROM outcomes GROUP BY step_id ORDER BY step_id`).bind(campaignId, revisionId)
      .all<{ step_id: string; complained: number; suppressed: number; unsubscribed: number }>(),
  ]);
  return { campaignId, revisionId, total: Number(total?.total ?? 0), offset: options.offset ?? 0, limit: options.limit ?? 100, rows,
    buckets: buckets.results.map(row => ({ stepId: row.step_id, disposition: row.disposition, reason: row.reason, count: Number(row.count) })),
    overlappingFacts: facts.results.map(row => ({ stepId: row.step_id, complained: Number(row.complained), suppressed: Number(row.suppressed), unsubscribed: Number(row.unsubscribed) })),
    counting: 'Transport buckets are exclusive recipient-steps. Complaints, suppressions and message unsubscriptions overlap those buckets; a person may appear in several steps.',
  };
}

export type CampaignRecipientReport = NonNullable<Awaited<ReturnType<typeof campaignRecipientReport>>>;
const csvHeaders = ['Recipient-step ID', 'Step ID', 'Contact ID', 'Name', 'Destination', 'Channel', 'Disposition', 'Bounce type', 'Reason', 'Complaint at', 'Suppression at', 'Message unsubscribe at'];
const csvRows = (rows: CampaignRecipient[]) => rows.map(row => [row.recipientStepId, row.stepId, row.contactId, row.displayName, row.destination, row.channel, row.disposition, row.bounceType, row.reason, row.complainedAt, row.suppressedAt, row.unsubscribedAt]);

/** Exports precisely the supplied visible page. */
export function campaignRecipientsCsv(report: Pick<CampaignRecipientReport, 'rows'>) {
  return campaignReportCsv(csvHeaders, csvRows(report.rows));
}

/** Exports every row under the same filter, in bounded pages. Call behind the
 * same authentication, erasure and no-store middleware as the JSON report. */
export async function campaignRecipientCsvResponse(database: Database, campaignId: string, revisionId: string, options: CampaignRecipientPage = {}) {
  const report = await campaignRecipientReport(database, campaignId, revisionId, { ...options, offset: 0, limit: 1000 });
  if (!report) return null;
  let rows = report.rows, offset = 0, header = true;
  const encoder = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (header) { controller.enqueue(encoder.encode(campaignReportCsv(csvHeaders, []))); header = false; }
      if (!rows.length) { controller.close(); return; }
      controller.enqueue(encoder.encode(campaignReportCsv([], csvRows(rows))));
      offset += rows.length;
      if (rows.length < 1000) { controller.close(); return; }
      rows = await campaignRecipientRows(database, campaignId, revisionId, { ...options, offset, limit: 1000 });
    },
  }), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="campaign-recipients.csv"', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

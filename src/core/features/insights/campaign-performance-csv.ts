import { campaignReportCsv } from './campaign-recipient-csv';
import { performanceRate, performanceRevenue, type CampaignPerformanceReport } from './campaign-performance-model';

export function campaignPerformanceCsv(report: CampaignPerformanceReport) {
  return campaignReportCsv([
    'Campaign ID', 'Campaign', 'Revision ID', 'Revision', 'Revision state', 'Active revision', 'Channel', 'Topic',
    'First scheduled (UTC)', 'Last scheduled (UTC)', 'Recipient-steps', 'Delivered', 'Human clicks', 'Unique clicked recipient-steps',
    'Click rate (unique clicked recipient-steps / recipients)', 'Unsubscribes', 'Complaints', 'Attributed conversions',
    'Net attributed revenue by currency', 'Net revenue per recipient by currency (rounded)',
    ...(report.openEstimatesEnabled ? ['Open-rate estimate (image loads / email recipients)'] : []),
  ], report.rows.map(row => [
    row.campaignId, row.name, row.revisionId, row.revision, row.state, row.activeRevision, row.channel, row.topic,
    row.scheduledAt, row.lastScheduledAt, row.recipients, row.delivered, row.totalClicks, row.uniqueClicks,
    performanceRate(row.clickRate), row.unsubscribes, row.complaints, row.conversions,
    performanceRevenue(row), performanceRevenue(row, true),
    ...(report.openEstimatesEnabled ? [performanceRate(row.openRateEstimate ?? null)] : []),
  ]));
}

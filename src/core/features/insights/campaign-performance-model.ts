import type { AttributionPolicy } from './attribution-policy';
export const campaignPerformanceSorts = ['name', 'scheduledAt', 'channel', 'topic', 'recipients', 'delivered', 'totalClicks', 'uniqueClicks', 'clickRate', 'unsubscribes', 'complaints', 'conversions', 'netRevenue', 'revenuePerRecipient', 'openRateEstimate'] as const;
export type CampaignPerformanceSort = typeof campaignPerformanceSorts[number];
export type CampaignPerformanceFilter = {
  channel?: 'email' | 'sms'; topic?: string; from?: string; to?: string;
  sort?: CampaignPerformanceSort; direction?: 'asc' | 'desc'; currency?: string;
};
export type CampaignPerformanceRevenue = { currency: string; conversions: number; netAmountMinor: string };
export type CampaignPerformanceRow = {
  campaignId: string; revisionId: string; revision: number; name: string; state: string; activeRevision: boolean;
  channel: string; topic: string; scheduledAt: string; lastScheduledAt: string;
  recipients: number; delivered: number; totalClicks: number; uniqueClicks: number; clickRate: number | null;
  unsubscribes: number; complaints: number; conversions: number; revenueByCurrency: CampaignPerformanceRevenue[];
  openRateEstimate?: number | null;
};
export type CampaignPerformanceReport = {
  attributionPolicy: AttributionPolicy;
  rows: CampaignPerformanceRow[]; filters: CampaignPerformanceFilter; topics: string[]; currencies: string[];
  openEstimatesEnabled: boolean; note: string;
};

export const performanceRate = (value: number | null) => value === null ? '—' : `${(value * 100).toFixed(2)}%`;

/** Integer arithmetic keeps large sums and negative net receipts exact. Per-recipient
 * display is rounded to four major-unit decimals, identically in the screen and CSV. */
export function performanceMoney(amountMinor: string, currency: string, recipients?: number) {
  if (recipients === 0) return '—';
  const exponent = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits!;
  let amount = BigInt(amountMinor), negative = amount < 0n;
  if (negative) amount = -amount;
  const places = recipients === undefined ? exponent : Math.max(4, exponent);
  const numerator = amount * 10n ** BigInt(places), denominator = 10n ** BigInt(exponent) * BigInt(recipients ?? 1);
  const rounded = (numerator + denominator / 2n) / denominator;
  const digits = rounded.toString().padStart(places + 1, '0');
  return `${currency} ${negative && rounded ? '-' : ''}${places ? `${digits.slice(0, -places)}.${digits.slice(-places)}` : digits}`;
}

export function performanceRevenue(row: CampaignPerformanceRow, perRecipient = false) {
  return row.revenueByCurrency.map(value => performanceMoney(value.netAmountMinor, value.currency, perRecipient ? row.recipients : undefined)).join('; ') || '—';
}

export function sortCampaignPerformance(rows: CampaignPerformanceRow[], filter: CampaignPerformanceFilter) {
  const sort = filter.sort ?? 'scheduledAt', direction = filter.direction === 'asc' ? 1 : -1;
  const revenue = (row: CampaignPerformanceRow) => row.revenueByCurrency.find(value => value.currency === filter.currency);
  return rows.sort((a, b) => {
    let order = 0;
    if (sort === 'netRevenue' || sort === 'revenuePerRecipient') {
      const left = revenue(a), right = revenue(b);
      if (!left || !right) return left ? -1 : right ? 1 : stable(a, b);
      const leftAmount = BigInt(left.netAmountMinor) * BigInt(sort === 'revenuePerRecipient' ? b.recipients : 1);
      const rightAmount = BigInt(right.netAmountMinor) * BigInt(sort === 'revenuePerRecipient' ? a.recipients : 1);
      order = leftAmount < rightAmount ? -1 : leftAmount > rightAmount ? 1 : 0;
    } else {
      const left = a[sort], right = b[sort];
      if (left == null || right == null) return left == null ? right == null ? stable(a, b) : 1 : -1;
      order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
    }
    return order * direction || stable(a, b);
  });
}
function stable(a: CampaignPerformanceRow, b: CampaignPerformanceRow) {
  return a.campaignId.localeCompare(b.campaignId) || a.revisionId.localeCompare(b.revisionId) || a.channel.localeCompare(b.channel);
}

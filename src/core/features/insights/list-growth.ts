import type { Database } from '@/core/platform/db/client';

export type GrowthRow = {
  day: string; channel: 'email' | 'sms'; source: string; method: string;
  version: string | null; consentText: string | null; kind: string; count: number; net: number;
  recording: 'live' | 'retained-evidence';
};
export type ListGrowthReport = {
  from: string; to: string; coveredFrom: string; effectiveFrom: string | null; asOf: string;
  retainedHistoryFrom: string | null;
  channels: Array<{channel: 'email' | 'sms'; opening: number | null; closing: number | null; net: number}>;
  rows: GrowthRow[];
};

/** Installation membership, rather than address count or historical opt-in date.
 * Attribution links are removable; anonymous transition counts survive erasure.
 * One D1 batch provides a consistent snapshot for totals and grouped facts.
 */
export async function listGrowth(database: Database, from: string, to: string): Promise<ListGrowthReport> {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Math.min(Date.parse(`${to}T00:00:00Z`) + 86400000, Date.now() + 1);
  const db = database.$client;
  const [baseline, totals, groups, history] = await db.batch<Record<string,unknown>>([
    db.prepare('SELECT channel,covered_from,subscribed FROM list_growth_baseline ORDER BY channel'),
    db.prepare(`SELECT b.channel,b.subscribed,
      coalesce(sum(CASE WHEN e.observed_at < max(?,b.covered_from) THEN e.delta ELSE 0 END),0) prior,
      coalesce(sum(CASE WHEN e.observed_at >= max(?,b.covered_from) AND e.observed_at < ? THEN e.delta ELSE 0 END),0) net
      FROM list_growth_baseline b LEFT JOIN list_growth_events e ON e.channel=b.channel
      GROUP BY b.channel,b.subscribed,b.covered_from`).bind(start,start,end),
    db.prepare(`SELECT strftime('%Y-%m-%d',e.observed_at/1000,'unixepoch') day,e.channel,e.kind,e.recording,
      coalesce(c.capture_source,'Evidence removed or not recorded') source,
      coalesce(c.capture_method,'unrecorded') method,c.consent_version version,c.consent_text consentText,
      count(*) count,sum(e.delta) net
      FROM list_growth_events e JOIN list_growth_baseline b ON b.channel=e.channel
      LEFT JOIN list_growth_attribution a ON a.event_id=e.id
      LEFT JOIN consent_evidence c ON c.id=a.evidence_id AND c.contact_id=a.contact_id
      WHERE e.observed_at >= ? AND e.observed_at < ?
      GROUP BY day,e.channel,e.kind,e.recording,source,method,version,consentText
      ORDER BY day DESC,e.channel,source,version,e.kind`).bind(start,end),
    db.prepare("SELECT min(observed_at) first FROM list_growth_events WHERE recording='retained-evidence'"),
  ]);
  const coverage = Math.min(...baseline.results.map(row => Number(row.covered_from)));
  if (!Number.isFinite(coverage) || baseline.results.length !== 2) throw new Error('List growth baseline is unavailable.');
  const effective = Math.max(start,coverage), covered = effective < end;
  return {
    from,to,coveredFrom:new Date(coverage).toISOString(),effectiveFrom:covered ? new Date(effective).toISOString() : null,
    asOf:new Date(end).toISOString(),
    retainedHistoryFrom:history.results[0]?.first == null ? null : new Date(Number(history.results[0].first)).toISOString(),
    channels:totals.results.map(row => {
      const opening = Number(row.subscribed) + Number(row.prior), net = covered ? Number(row.net) : 0;
      return {channel:row.channel as 'email' | 'sms',opening:covered ? opening : null,closing:covered ? opening+net : null,net};
    }),
    rows:groups.results.map(row => ({day:String(row.day),channel:row.channel as 'email' | 'sms',
      source:String(row.source),method:String(row.method),version:row.version===null ? null : String(row.version),
      consentText:row.consentText===null ? null : String(row.consentText),kind:String(row.kind),count:Number(row.count),net:Number(row.net),
      recording:row.recording as GrowthRow['recording']})),
  };
}

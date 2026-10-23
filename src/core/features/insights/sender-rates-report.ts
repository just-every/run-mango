import type {Database} from '@/core/platform/db/client';

export async function readSenderRates(database:Database,since:Date,until?:Date) {
  const client=database.$client,end=until?.getTime()??Number.MAX_SAFE_INTEGER;
      const rows = await client.prepare(
        `SELECT r.channel,GROUP_CONCAT(DISTINCT COALESCE(r.provider,'unrecorded')) providers,
           CASE WHEN r.channel = 'email' THEN lower(substr(v.from_email,instr(v.from_email,'@')+1)) ELSE v.sms_sender END sender,
           COUNT(DISTINCT CASE WHEN f.kind = 'delivered' THEN r.id END) delivered,
           COUNT(DISTINCT CASE WHEN f.kind = 'bounced' THEN r.id END) bounced,
           COUNT(DISTINCT CASE WHEN f.kind = 'complained' THEN r.id END) complained,
           COUNT(DISTINCT CASE WHEN r.transport_disposition = 'failed' THEN r.id END) failed,
           COUNT(DISTINCT CASE WHEN COALESCE(r.first_attempt_at,r.handoff_started_at,r.handed_off_at)>=? AND COALESCE(r.first_attempt_at,r.handoff_started_at,r.handed_off_at)<? THEN r.id END) attempted,
           COUNT(DISTINCT CASE WHEN f.kind = 'bounced' AND json_extract(f.detail_json, '$.hard') = 1 THEN r.id END) hard_bounced
         FROM recipient_steps r JOIN campaign_revisions v ON v.id = r.revision_id
         LEFT JOIN delivery_facts f ON f.recipient_step_id = r.id AND f.provider_occurred_at >= ? AND f.provider_occurred_at < ?
         -- Attempted handoffs include uncertainty; only provider facts establish delivery.
         WHERE (COALESCE(r.first_attempt_at,r.handed_off_at,r.handoff_started_at)>=? AND COALESCE(r.first_attempt_at,r.handed_off_at,r.handoff_started_at)<?) OR f.recipient_step_id IS NOT NULL
         GROUP BY r.channel,sender ORDER BY r.channel,sender`,
      ).bind(since.getTime(),end,since.getTime(),end,since.getTime(),end).all<Record<string, unknown>>();
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
    }

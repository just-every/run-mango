import type {Database} from '@/core/platform/db/client';

export async function readReputationRates(database:Database,since:Date,until?:Date,scope?:{channel:string;sender:string}) {
  const client=database.$client,end=until?.getTime()??Number.MAX_SAFE_INTEGER;
      const rows = await client.prepare(
        `SELECT r.channel,GROUP_CONCAT(DISTINCT COALESCE(r.provider,'unrecorded')) providers,
           CASE WHEN r.channel = 'email' THEN lower(substr(v.from_email,instr(v.from_email,'@')+1)) ELSE v.sms_sender END sender,
           COUNT(DISTINCT CASE WHEN f.kind = 'delivered' THEN r.id END) delivered,
           COUNT(DISTINCT CASE WHEN f.kind = 'bounced' THEN r.id END) bounced,
           COUNT(DISTINCT CASE WHEN f.kind = 'complained' THEN r.id END) complained,
           COUNT(DISTINCT CASE WHEN r.transport_disposition = 'failed' THEN r.id END) failed,
           COUNT(DISTINCT CASE WHEN r.first_attempt_at>=? AND r.first_attempt_at<? THEN r.id END) attempted,
           COUNT(DISTINCT CASE WHEN f.kind = 'bounced' AND json_extract(f.detail_json, '$.hard') = 1 THEN r.id END) hard_bounced
         FROM recipient_steps r JOIN campaign_revisions v ON v.id = r.revision_id
         LEFT JOIN delivery_facts f ON f.recipient_step_id = r.id AND f.provider_occurred_at >= ? AND f.provider_occurred_at < ?
         -- Attempted handoffs include uncertainty; only provider facts establish delivery.
         WHERE (? IS NULL OR r.channel=?) AND (? IS NULL OR (CASE WHEN r.channel='email' THEN lower(substr(v.from_email,instr(v.from_email,'@')+1)) ELSE v.sms_sender END)=?)
         GROUP BY r.channel,sender ORDER BY r.channel,sender`,
      ).bind(since.getTime(),end,since.getTime(),end,scope?.channel??null,scope?.channel??null,scope?.sender??null,scope?.sender??null).all<Record<string, unknown>>();
      return rows.results.map((row) => {
        const delivered = Number(row.delivered);
        const complained = Number(row.complained);
        const attempted = Number(row.attempted);
        const hardBounced = Number(row.hard_bounced);
        return {
          channel: row.channel, providers:String(row.providers).split(',').sort(), windowStart:since.toISOString(), sender: String(row.sender), delivered, bounced: Number(row.bounced), complained,
          failed: Number(row.failed), attempted, hardBounced,
          complaintRate: delivered ? complained / delivered : null,
          hardBounceRate: attempted ? hardBounced / attempted : null,
        };
      });
    }

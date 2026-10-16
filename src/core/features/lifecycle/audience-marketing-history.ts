import type { Database } from '@/core/platform/db/client';
import { marketingOccurrenceSql } from './marketing-history';
import type { Channel } from './types';

/** One request-local read of the same occurrence authority used at handoff. */
export async function audienceMarketingHistory(database: Database, contactIds: string[], channels: Channel[]) {
  const history = new Map<string, Date>();
  if (!contactIds.length || !channels.length) return history;
  const rows = await database.$client.prepare(`SELECT contact_id, channel, MAX(${marketingOccurrenceSql}) occurred_at
    FROM recipient_steps
    WHERE contact_id IN (SELECT value FROM json_each(?))
      AND channel IN (SELECT value FROM json_each(?))
    GROUP BY contact_id, channel`)
    .bind(JSON.stringify([...new Set(contactIds)]), JSON.stringify(channels))
    .all<{contact_id: string; channel: Channel; occurred_at: number | null}>();
  for (const row of rows.results) {
    if (row.occurred_at !== null) history.set(`${row.contact_id}:${row.channel}`, new Date(row.occurred_at));
  }
  return history;
}

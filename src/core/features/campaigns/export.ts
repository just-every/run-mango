import type { Database } from '@/core/platform/db/client';
import { csvCell } from '@/core/features/auth/activity-query';

// Same row ceiling as Activity exports and byte ceiling as CSV imports.
const rowLimit = 50_000;
const byteLimit = 10_000_000;
export class CampaignExportLimitError extends Error {
  constructor() { super('Campaigns CSV exceeds 50,000 revisions or 10 MB. No file was downloaded. Use a complete local backup.'); }
}

/** Each persisted revision is one row, including drafts with no scheduled steps. */
export async function exportCampaignsCsv(database: Database) {
  const lines = ['campaign_id,name,revision,state,subject,updated\r\n'];
  let bytes = new TextEncoder().encode(lines[0]).length, count = 0;
  let after = '';
  for (;;) {
    const page = await database.$client.prepare(`SELECT id,campaign_id,name,version,state,email_subject,updated_at
      FROM campaign_revisions WHERE id > ? ORDER BY id LIMIT 500`).bind(after)
      .all<{id:string;campaign_id:string;name:string;version:number;state:string;email_subject:string;updated_at:number}>();
    for (const row of page.results) {
      const line = [row.campaign_id,row.name,row.version,row.state,row.email_subject,new Date(row.updated_at).toISOString()]
        .map(csvCell).join(',') + '\r\n';
      bytes += new TextEncoder().encode(line).length;
      if (++count > rowLimit || bytes > byteLimit) throw new CampaignExportLimitError();
      lines.push(line);
    }
    if (page.results.length < 500) return lines.join('');
    after = page.results.at(-1)!.id;
  }
}

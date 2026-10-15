import type { Database } from '@/core/platform/db/client';
import { digestJson } from './digest';

type Row = Record<string, string | number | null>;
const volatile = new Set(['created_at', 'updated_at', 'state', 'content_digest', 'approved_at', 'approved_by_operator_id']);
const content = (row: Row) => Object.fromEntries(Object.entries(row).filter(([key]) => !volatile.has(key)));

/** Bind all saved content, including audience, sender, schedule and destinations. */
export async function advisorySnapshot(database: Database, revisionId: string) {
  const client = database.$client;
  const [revision, steps, links] = await Promise.all([
    client.prepare('SELECT * FROM campaign_revisions WHERE id = ?').bind(revisionId).first<Row>(),
    client.prepare('SELECT * FROM campaign_steps WHERE revision_id = ? ORDER BY sequence').bind(revisionId).all<Row>(),
    client.prepare('SELECT * FROM campaign_revision_links WHERE revision_id = ? ORDER BY sequence').bind(revisionId).all<Row>(),
  ]);
  if (!revision) return undefined;
  const digest = await digestJson({revision: content(revision), steps: steps.results.map(content), links: links.results.map(content)});
  // Compare every observed column in the atomic write, not just a millisecond timestamp.
  const values: Array<string | number | null> = [revisionId, JSON.stringify(revision)];
  const jsonRow = (row: Row) => `json_object(${Object.keys(row).map(key => `'${key}', "${key}"`).join(', ')})`;
  const guards = [`EXISTS (SELECT 1 FROM campaign_revisions WHERE id = ? AND ${jsonRow(revision)} = json(?))`];
  for (const [table, rows] of [['campaign_steps', steps.results], ['campaign_revision_links', links.results]] as const) {
    values.push(revisionId);
    if (!rows.length) guards.push(`NOT EXISTS (SELECT 1 FROM ${table} WHERE revision_id = ?)`);
    else {
      values.push(JSON.stringify(rows));
      guards.push(`(SELECT json_group_array(${jsonRow(rows[0]!)}) FROM
        (SELECT * FROM ${table} WHERE revision_id = ? ORDER BY sequence)) = json(?)`);
    }
  }
  return {revision, hasEmail: steps.results.some(step => step.channel === 'email'), digest, guard: guards.join(' AND '), values};
}

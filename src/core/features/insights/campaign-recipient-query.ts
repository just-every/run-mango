import type { Database } from '@/core/platform/db/client';
import { pendingErasure } from '@/core/features/audience/erasure/maintenance';

export async function assertCampaignReportReadable(database: Database) {
  if (await pendingErasure(database.$client)) throw new Error('contact_erasure_in_progress');
}

export const campaignRecipientOutcomes = ['queued', 'handoff-unknown', 'handed-off', 'accepted', 'delivered', 'bounced', 'skipped', 'failed', 'complained', 'suppressed', 'unsubscribed'] as const;
export type CampaignRecipientOutcome = typeof campaignRecipientOutcomes[number];
export type CampaignRecipientFilter = { stepId?: string; outcome?: CampaignRecipientOutcome; reason?: string | null };
export type CampaignRecipientPage = CampaignRecipientFilter & { offset?: number; limit?: number };

// Used tokens bind public unsubscribes to this actual message. A contact's current
// status alone cannot establish that this campaign caused their unsubscribe.
export const recipientOutcomeCte = `WITH outcomes AS (
  SELECT r.*,c.id visible_contact_id,c.display_name,
    (SELECT MIN(at) FROM (
      SELECT t.used_at at FROM public_action_tokens t WHERE t.recipient_step_id=r.id AND t.purpose='unsubscribe' AND t.used_at IS NOT NULL
      UNION ALL SELECT f.provider_occurred_at FROM delivery_facts f WHERE f.recipient_step_id=r.id AND f.kind='unsubscribed'
    )) unsubscribed_at,
    (SELECT COALESCE(json_extract(f.detail_json,'$.reason'),json_extract(f.detail_json,'$.response'),json_extract(f.detail_json,'$.code'))
      FROM delivery_facts f WHERE f.recipient_step_id=r.id AND f.kind=r.transport_disposition AND f.kind IN ('bounced','failed')
      ORDER BY f.provider_occurred_at DESC,f.id DESC LIMIT 1) provider_reason,
    (SELECT COALESCE(json_extract(f.detail_json,'$.bounceType'),CASE json_type(f.detail_json,'$.hard') WHEN 'true' THEN 'hard' WHEN 'false' THEN 'soft' END) FROM delivery_facts f WHERE f.recipient_step_id=r.id AND f.kind='bounced' ORDER BY f.provider_occurred_at DESC,f.id DESC LIMIT 1) bounce_type
  FROM recipient_steps r LEFT JOIN contacts c ON c.id=r.contact_id
  WHERE r.campaign_id=? AND r.revision_id=?
)`;

export function recipientFilter(filter: CampaignRecipientFilter) {
  const clauses: string[] = [], bindings: (string | number | null)[] = [];
  if (filter.stepId !== undefined) { clauses.push('step_id=?'); bindings.push(filter.stepId); }
  if (filter.outcome !== undefined) {
    if (!campaignRecipientOutcomes.includes(filter.outcome)) throw new Error('invalid_recipient_outcome');
    if (filter.outcome === 'complained') clauses.push('complained_at IS NOT NULL');
    else if (filter.outcome === 'suppressed') clauses.push('suppressed_at IS NOT NULL');
    else if (filter.outcome === 'unsubscribed') clauses.push('unsubscribed_at IS NOT NULL');
    else { clauses.push('transport_disposition=?'); bindings.push(filter.outcome); }
  }
  // Skip reasons match the exact summary bucket, including its null bucket.
  if (filter.reason !== undefined) { clauses.push('skip_reason IS ?'); bindings.push(filter.reason); }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', bindings };
}

type RecipientRow = {
  id: string; step_id: string; visible_contact_id: string | null; display_name: string | null; destination: string;
  channel: string; transport_disposition: string; skip_reason: string | null; last_error_code: string | null;
  provider_reason: string | number | null; bounce_type:string|null; complained_at: number | null; suppressed_at: number | null; unsubscribed_at: number | null;
};
const iso = (at: number | null) => at === null ? null : new Date(at).toISOString();

export async function campaignRecipientRows(database: Database, campaignId: string, revisionId: string, options: CampaignRecipientPage = {}) {
  await assertCampaignReportReadable(database);
  const offset = options.offset ?? 0, limit = options.limit ?? 100;
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('invalid_recipient_pagination');
  const filter = recipientFilter(options);
  const result = await database.$client.prepare(`${recipientOutcomeCte}
    SELECT id,step_id,visible_contact_id,display_name,destination,channel,transport_disposition,skip_reason,last_error_code,
      provider_reason,bounce_type,complained_at,suppressed_at,unsubscribed_at
    FROM outcomes ${filter.sql} ORDER BY step_id,id LIMIT ? OFFSET ?`)
    .bind(campaignId, revisionId, ...filter.bindings, limit, offset).all<RecipientRow>();
  return result.results.map(row => ({ recipientStepId: row.id, stepId: row.step_id, contactId: row.visible_contact_id,
    displayName: row.visible_contact_id === null ? null : row.display_name,
    destination: row.visible_contact_id === null ? null : row.destination,
    identityAvailable: row.visible_contact_id !== null, channel: row.channel, disposition: row.transport_disposition,
    skipReason: row.skip_reason, bounceType:row.bounce_type,
    reason: row.skip_reason ?? (['failed','bounced'].includes(row.transport_disposition) ? String(row.provider_reason ?? row.last_error_code ?? 'unrecorded-cause') : null),
    complainedAt: iso(row.complained_at), suppressedAt: iso(row.suppressed_at), unsubscribedAt: iso(row.unsubscribed_at) }));
}

export type CampaignRecipient = Awaited<ReturnType<typeof campaignRecipientRows>>[number];

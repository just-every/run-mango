import { sha256 } from '@/core/platform/crypto';
import type { DeliveryRequest, ProviderFact, ProviderReconciliation } from '@/core/shared/platform';

export const submissionId = (messageId: string) => messageId.split('.')[0];

/** Activity access is optional on SendGrid accounts. Unavailability never authorizes another send. */
export async function reconcileSendgrid(apiKey: string, request: DeliveryRequest,
  state: { providerMessageId?: string }, transport: typeof fetch = fetch): Promise<ProviderReconciliation> {
  if (!state.providerMessageId) return { facts: [], exhausted: true };
  const id = submissionId(state.providerMessageId);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('SendGrid message identifier is invalid.');
  const response = await transport(`https://api.sendgrid.com/v3/messages?${new URLSearchParams({ limit: '100', query: `msg_id LIKE '${id}%'` })}`, {
    headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) });
  if ([401,403,404,429].includes(response.status)) return { facts: [], exhausted: true };
  if (!response.ok) throw new Error('SendGrid Activity is unavailable; handoff remains uncertain.');
  const data = await response.json() as { messages?: Array<{ msg_id: string; to_email: string }> };
  if (!Array.isArray(data.messages)) throw new Error('SendGrid Activity response is malformed.');
  const facts: ProviderFact[] = [];
  for (const item of data.messages) {
    if (typeof item.msg_id !== 'string' || submissionId(item.msg_id) !== id || item.to_email !== request.to) continue;
    const detailResponse = await transport(`https://api.sendgrid.com/v3/messages/${encodeURIComponent(item.msg_id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) });
    if (!detailResponse.ok) throw new Error('SendGrid Activity message lookup is unavailable.');
    const detail = await detailResponse.json() as { msg_id: string; to_email: string; events: Array<{ event_name: string; processed: string; reason?: string }> };
    if (detail.msg_id !== item.msg_id || detail.to_email !== request.to || !Array.isArray(detail.events)) throw new Error('SendGrid Activity correlation failed.');
    const kinds: Record<string, ProviderFact['kind']> = { processed: 'accepted', delivered: 'delivered', bounced: 'bounced', dropped: 'suppressed', spam_report: 'complained', unsubscribe: 'suppressed', group_unsubscribe: 'suppressed' };
    for (const event of detail.events) {
      const kind = kinds[event.event_name], occurredAt = new Date(event.processed);
      if (!kind || !Number.isFinite(occurredAt.getTime())) continue;
      const payloadDigest = await sha256(JSON.stringify([item.msg_id, event]));
      facts.push({ identity: `activity:${payloadDigest}`, providerMessageId: id, kind, occurredAt, payloadDigest,
        detail: { destination: request.to, ...(kind === 'bounced' ? { hard: true } : {}) } });
    }
  }
  return { facts, exhausted: true };
}

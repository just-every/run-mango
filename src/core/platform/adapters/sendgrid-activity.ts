import {asRecord} from './http';
import {boundedJson} from './bounded-read';
import { sha256 } from '@/core/platform/crypto';
import type { DeliveryRequest, ProviderFact, ProviderReconciliation } from '@/core/shared/platform';

export const submissionId = (messageId: string) => messageId.split('.')[0];

/** Activity access is optional on SendGrid accounts. Unavailability never authorizes another send. */
export async function reconcileSendgrid(apiKey: string, request: DeliveryRequest,
  state: { providerMessageId?: string }, transport: typeof fetch = fetch): Promise<ProviderReconciliation> {
  if (!state.providerMessageId) return { facts: [], exhausted: true };
  const id = submissionId(state.providerMessageId);
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('SendGrid message identifier is invalid.');
  const deadline=Date.now()+10000;
  const read=async(url:string)=>asRecord(await boundedJson(url,{Authorization:`Bearer ${apiKey}`},{transport,deadlineMs:Math.max(1,deadline-Date.now()),maxBytes:262144}),'SendGrid Activity response is malformed.');
  const data = await read(`https://api.sendgrid.com/v3/messages?${new URLSearchParams({ limit: '4', query: `msg_id LIKE '${id}%'` })}`);
  if (!Array.isArray(data.messages)) throw new Error('SendGrid Activity response is malformed.');
  const facts: ProviderFact[] = [];
  for (const item of data.messages.slice(0,4)) {
    if (typeof item.msg_id !== 'string' || submissionId(item.msg_id) !== id || item.to_email !== request.to) continue;
    const detail = await read(`https://api.sendgrid.com/v3/messages/${encodeURIComponent(item.msg_id)}`);
    if (detail.msg_id !== item.msg_id || detail.to_email !== request.to || !Array.isArray(detail.events)) throw new Error('SendGrid Activity correlation failed.');
    const kinds: Record<string, ProviderFact['kind']> = { processed: 'accepted', delivered: 'delivered', bounced: 'bounced', dropped: 'failed', spam_report: 'complained', unsubscribe: 'suppressed', group_unsubscribe: 'suppressed' };
    for (const event of detail.events) {
      const kind = event.event_name==='dropped' && ['Unsubscribed Address','Bounced Address','Spam Reporting Address'].includes(event.reason) ? 'suppressed' : kinds[event.event_name], occurredAt = new Date(event.processed);
      if (!kind || !Number.isFinite(occurredAt.getTime())) continue;
      const payloadDigest = await sha256(JSON.stringify([item.msg_id, event]));
      facts.push({ identity: `activity:${payloadDigest}`, providerMessageId: id, kind, occurredAt, payloadDigest,
        detail: { destination: request.to, ...(kind === 'bounced' ? { hard: event.bounce_classification==='Invalid Address' } : {}) } });
    }
  }
  return { facts, exhausted: true };
}

import { submissionId } from '@/core/platform/adapters/sendgrid-activity';
import { canonicalEmail } from '@/core/features/audience/identity';
import { decodeProviderReference } from '@/core/shared/provider-reference';
import type { ProviderFact, VerifiedWebhook } from '@/core/shared/platform';
import { sha256 } from './digest';

/** Called only after Base verifies the original event batch bytes. */
export async function parseSendgridFacts(verified: VerifiedWebhook): Promise<ProviderFact[]> {
  const rows: unknown = JSON.parse(verified.rawBody);
  if (!Array.isArray(rows) || rows.length > 1000) throw new Error('SendGrid event batch is invalid.');
  // A recipient's unsubscribe through SendGrid (global or group) is an opt-out under CONT-004.
  const kinds: Record<string, ProviderFact['kind']> = { processed: 'accepted', delivered: 'delivered',
    bounce: 'bounced', spamreport: 'complained', dropped: 'failed', unsubscribe: 'unsubscribed', group_unsubscribe: 'unsubscribed' };
  const facts: ProviderFact[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('SendGrid event is invalid.');
    const unrelatedBounce=row.event==='bounce'&&['Content','Frequency or Volume Too High','Reputation','Technical Failure'].includes(row.bounce_classification);
    const kind = unrelatedBounce?'failed':row.event==='dropped' && ['Unsubscribed Address','Bounced Address','Spam Reporting Address'].includes(row.reason) ? 'suppressed' : kinds[row.event];
    // Opens/clicks/deferred events are not evidence of a delivery or suppression.
    if (!kind) continue;
    if (typeof row.sg_event_id !== 'string' || !row.sg_event_id || !Number.isSafeInteger(row.timestamp)
      || row.timestamp < 0 || typeof row.email !== 'string') throw new Error('SendGrid event identity, time or destination is missing.');
    const occurredAt = new Date(row.timestamp * 1000);
    if (Number.isNaN(occurredAt.getTime())) throw new Error('SendGrid event time is invalid.');
    const destination = canonicalEmail(row.email);
    const providerMessageId = typeof row.sg_message_id === 'string' ? submissionId(row.sg_message_id) : undefined;
    if (!providerMessageId && ['accepted', 'delivered'].includes(kind)) throw new Error('SendGrid delivery message identifier is missing.');
    const reference = typeof row.mango_handoff_key === 'string' ? row.mango_handoff_key : row.mango_recipient_step;
    facts.push({ identity: `sendgrid:${row.sg_event_id}`, providerMessageId, kind, occurredAt,
      payloadDigest: await sha256(JSON.stringify(row)), detail: { destination, providerEvent: row.event,
        hard: kind === 'bounced' && row.type === 'bounce' && !['Content','Frequency or Volume Too High','Reputation','Technical Failure'].includes(row.bounce_classification),
        bounceClassification:typeof row.bounce_classification==='string'?row.bounce_classification:undefined,
        bounceType: kind === 'bounced' ? row.type === 'bounce' ? 'hard' : 'soft' : undefined,
        mangoReference: typeof reference === 'string' ? decodeProviderReference(reference) : undefined } });
  }
  return facts;
}

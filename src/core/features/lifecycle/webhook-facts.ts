import {providerDiagnostic} from './provider-diagnostic';
import {mobileMessageStatus} from './mobile-message-status';
import { parseSendgridFacts } from './sendgrid-facts';
import { canonicalEmail, canonicalPhone } from '@/core/features/audience/identity';
import type { VerifiedWebhook } from '@/core/shared/platform';
import { decodeProviderReference } from '@/core/shared/provider-reference';

import { sha256 } from './digest';
import type { Channel, ProviderFact } from './types';

function record(value: unknown, detail: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(detail);
  return value as Record<string, unknown>;
}

function providerMessageId(value: Record<string, unknown>) {
  const candidate = value.email_id ?? value.message_id ?? value.id;
  return typeof candidate === 'string' ? candidate : undefined;
}

function providerOccurredAt(value: Record<string, unknown>, fallback: Date) {
  const candidate = value.occurred_at ?? value.received_at ?? value.created_at ?? value.updated_at ?? value.timestamp;
  const parsed = typeof candidate === 'string' || typeof candidate === 'number' ? new Date(candidate) : fallback;
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function mangoReference(value: Record<string, unknown>) {
  if (typeof value.original_custom_ref === 'string') return decodeProviderReference(value.original_custom_ref);
  if (typeof value.custom_ref === 'string') return decodeProviderReference(value.custom_ref);
  if (value.tags && typeof value.tags === 'object' && !Array.isArray(value.tags)) {
    const tags = value.tags as Record<string, unknown>;
    for (const name of ['mango_handoff_key', 'mango_recipient_step']) {
      if (typeof tags[name] === 'string') return decodeProviderReference(tags[name]);
    }
  }
  const tags = Array.isArray(value.tags) ? value.tags : [];
  for (const item of tags) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const tag = item as Record<string, unknown>;
    if (tag.name === 'mango_handoff_key' && typeof tag.value === 'string') return decodeProviderReference(tag.value);
    if (tag.name === 'mango_recipient_step' && typeof tag.value === 'string') return decodeProviderReference(tag.value);
  }
  return undefined;
}

export async function parseVerifiedWebhook(channel: Channel, verified: VerifiedWebhook): Promise<ProviderFact[]> {
  if (channel === 'email' && verified.provider === 'sendgrid') return parseSendgridFacts(verified);
  const payload = record(JSON.parse(verified.rawBody) as unknown, 'Provider webhook body must be a JSON object.');
  const digest = await sha256(verified.rawBody);
  if (channel === 'email') {
    const data = record(payload.data, 'Resend webhook is missing its data object.');
    const event = String(payload.type ?? '').replace(/^email\./, '');
    const kindByEvent: Record<string, ProviderFact['kind']> = {
      sent: 'accepted', queued: 'accepted', delivered: 'delivered', bounced: 'bounced', complained: 'complained', suppressed: 'suppressed', failed: 'failed',
    };
    const kind = kindByEvent[event];
    const messageId = providerMessageId(data);
    const to = data.to === undefined ? [] : typeof data.to === 'string' ? [data.to] : data.to;
    if (!Array.isArray(to) || to.length > 1 || to.some(value => typeof value !== 'string')) throw new Error('Resend webhook requires one unambiguous recipient destination.');
    const destination = to.length ? canonicalEmail(to[0]) : undefined;
    const safetyEvent = ['bounced', 'complained', 'suppressed'].includes(kind);
    if (!kind || (!messageId && !(safetyEvent && destination))) throw new Error('Resend webhook event is not a supported delivery fact.');
    // Resend's envelope timestamp is the event time; data.created_at is the original email time.
    if (payload.created_at !== undefined && (typeof payload.created_at !== 'string' || Number.isNaN(new Date(payload.created_at).getTime()))) {
      throw new Error('Resend webhook event has an invalid created_at timestamp.');
    }
    const occurredAt = providerOccurredAt(payload, providerOccurredAt(data, verified.receivedAt));
    const bounce = data.bounce && typeof data.bounce === 'object' && !Array.isArray(data.bounce)
      ? data.bounce as Record<string, unknown> : {};
    const bounceType = String(bounce.type ?? data.bounce_type ?? data.type ?? '').toLowerCase();
    if (!messageId && kind === 'bounced' && !['hard', 'permanent'].includes(bounceType)) throw new Error('A soft-bounce delivery fact requires its message identifier.');
    return [{
      identity: verified.providerEventId ?? `${messageId ?? destination}:${kind}:${occurredAt.toISOString()}:${digest}`,
      providerMessageId: messageId,
      kind,
      occurredAt,
      payloadDigest: digest,
      detail: {
        destination,
        hard: kind === 'bounced' && ['hard', 'permanent'].includes(bounceType),
        bounceType: kind === 'bounced' ? bounceType : undefined,
        ...(kind === 'bounced' ? {reason:providerDiagnostic(bounce.message ?? bounce.description ?? data.reason),bounceSubtype:providerDiagnostic(bounce.subType ?? bounce.subtype),status:providerDiagnostic(data.status)} : {}),
        providerEvent: event,
        mangoReference: mangoReference(data),
      },
    }];
  }

  const rows = Array.isArray(payload.results) ? payload.results : [payload];
  return Promise.all(rows.map(async (item) => {
    const data = record(item, 'Mobile Message webhook contains an invalid result.');
    if(data.status!==undefined&&!['inbound','unsubscribe'].includes(String(data.type??'')))return mobileMessageStatus(data);
    const type = String(data.type ?? '').toLowerCase();
    const explicitReply = String(data.reply ?? data.inbound_message ?? '').trim().toLowerCase();
    const messageText = String(data.message ?? data.text ?? '').trim().toLowerCase();
    const status = String(data.status ?? data.event ?? '').toLowerCase();
    const direction = String(data.direction ?? data.message_type ?? type).toLowerCase();
    const inbound = Boolean(explicitReply) || ['inbound', 'reply', 'mo', 'unsubscribe'].includes(direction) || direction.includes('inbound');
    const replyText = type === 'unsubscribe' ? 'stop' : inbound ? (explicitReply || messageText) : '';
    const statusKinds: Record<string, ProviderFact['kind']> = {
      queued: 'accepted', submitted: 'accepted', sent: 'accepted', accepted: 'accepted',
      delivered: 'delivered', failed: 'failed', error: 'failed', cancelled: 'failed', rejected: 'failed',
    };
    if(inbound)throw new Error('Inbound SMS must use the dedicated sender-bound compliance route.');
    const kind = statusKinds[status];
    if (!kind) throw new Error(`Mobile Message webhook status ${JSON.stringify(status)} is not supported.`);
    const messageId = providerMessageId(data);
    if (!messageId && kind !== 'sms-reply') throw new Error('Mobile Message status webhook has no message identifier.');
    const occurredAt = providerOccurredAt(data, verified.receivedAt);
    const identityDestination = String(data.sender ?? data.from ?? data.mobile ?? data.destination ?? '');
    const destination = kind === 'sms-reply' ? canonicalPhone(identityDestination) : identityDestination;
    if (kind === 'sms-reply' && !destination) throw new Error('Mobile Message reply has no valid destination.');
    return {
      identity: verified.providerEventId
        ? `${verified.providerEventId}:${messageId ?? identityDestination}:${kind}`
        : `${messageId ?? identityDestination}:${kind}:${occurredAt.toISOString()}:${digest}`,
      providerMessageId: messageId,
      kind,
      occurredAt,
      payloadDigest: digest,
      detail: kind === 'sms-reply'
        ? { action: replyText.replace(/\s+/g, ''), destination, providerEvent: status || 'reply', mangoReference: mangoReference(data) }
        : { providerEvent: status, mangoReference: mangoReference(data) },
    };
  }));
}

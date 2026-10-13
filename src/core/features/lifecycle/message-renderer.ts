import { renderMessageContent, invalidPersonalisation } from '@/core/features/campaigns/message-content';
import { inspectEmailHtml } from '@/core/features/campaigns/email-html-policy';
import { confirmationUnsubscribePath, oneClickUnsubscribePath } from '@/core/features/audience/unsubscribe-paths';
import type { DeliveryRequest, EligibilityResult, LifecycleRuntime } from './types';
import type { LifecycleRepository } from './repository';

type DeliveryEnvelope = NonNullable<Awaited<ReturnType<LifecycleRepository['getDeliveryEnvelope']>>>;
type EligibleContact = Extract<EligibilityResult, { eligible: true }>;

export function serializeDeliveryRequest(request: DeliveryRequest) {
  return JSON.stringify({ ...request, handoffStartedAt: request.handoffStartedAt.toISOString() });
}

export function parseDeliveryRequest(value: string): DeliveryRequest {
  const parsed = JSON.parse(value) as Omit<DeliveryRequest, 'handoffStartedAt'> & { handoffStartedAt: string };
  return { ...parsed, handoffStartedAt: new Date(parsed.handoffStartedAt) };
}

export async function prepareDeliveryRequest(
  runtime: LifecycleRuntime,
  envelope: DeliveryEnvelope,
  eligibility: EligibleContact,
  now: Date,
) {
  if (envelope.recipient.outboundRequestJson) {
    return { request: parseDeliveryRequest(envelope.recipient.outboundRequestJson), trackedLinks: [] };
  }
  const htmlPolicy = inspectEmailHtml(envelope.revision.emailBody);
  const invalidTokens = invalidPersonalisation(`${envelope.revision.emailSubject}\n${envelope.revision.preheader}\n${envelope.revision.emailBody}\n${envelope.revision.emailText}\n${envelope.revision.smsBody}`);
  if (invalidTokens.length || (envelope.recipient.channel === 'email' && htmlPolicy.issues.length)) {
    throw new Error(`Saved content is outside the allowed authoring set: ${[...htmlPolicy.issues, ...invalidTokens].join(' ')}`);
  }
  const publicBaseUrl = runtime.platform.config.publicBaseUrl.toString().replace(/\/$/, '');
  const unsubscribe = await runtime.audience.issueMarketingUnsubscribe({
    contactId: envelope.recipient.contactId,
    channel: envelope.recipient.channel,
    recipientStepId: envelope.recipient.id,
    expiresAt: new Date(now.getTime() + 365 * 86_400_000),
  });
  const trackedLinks: Array<{ tokenDigest: string; destinationUrl: string; expiresAt: Date }> = [];
  const rewritten = new Map<string, string>();
  if (envelope.revision.trackingEnabled) {
    for (const link of envelope.links) {
      const expiresAt = new Date(envelope.recipient.sendByAt.getTime() + 30 * 86_400_000);
      const token = await runtime.platform.publicTokens.issue({ id: crypto.randomUUID(), purpose: 'link', expiresAt });
      trackedLinks.push({
        tokenDigest: await runtime.platform.publicTokens.digest(token),
        destinationUrl: link.destinationUrl,
        expiresAt,
      });
      rewritten.set(link.destinationUrl, `${publicBaseUrl}/l/${encodeURIComponent(token)}`);
    }
  }
  const unsubscribeUrl = `${publicBaseUrl}${confirmationUnsubscribePath(unsubscribe.token)}`;
  const oneClickUrl = `${publicBaseUrl}${oneClickUnsubscribePath(unsubscribe.token)}`;
  const rendered = renderMessageContent(envelope.revision, {values: eligibility.contact.personalisation, unsubscribeUrl, rewrittenLinks: rewritten});
  const content: DeliveryRequest['content'] = envelope.recipient.channel === 'email'
    ? {
        subject: rendered.subject, preheader: rendered.preheader, html: rendered.html, text: rendered.text,
        from: {name: envelope.revision.senderName, email: envelope.revision.fromEmail}, replyTo: envelope.revision.replyToEmail,
        headers: {'List-Unsubscribe': `<${oneClickUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'},
      }
    : {text: rendered.sms};
  const request: DeliveryRequest = {
    recipientStepId: envelope.recipient.id,
    idempotencyKey: envelope.recipient.idempotencyKey,
    to: eligibility.contact.destination,
    sender: envelope.recipient.channel === 'email'
      ? `${envelope.revision.senderName} <${envelope.revision.fromEmail}>`
      : envelope.revision.smsSender,
    content,
    callbackUrl: `${publicBaseUrl}/webhooks/${envelope.recipient.channel === 'email' ? 'mail' : 'sms'}/status`,
    handoffStartedAt: now,
  };
  return { request, trackedLinks };
}

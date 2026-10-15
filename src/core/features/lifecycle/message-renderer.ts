import {appendOpenPixel,removeDisabledPixel} from '@/core/features/insights/open-tracking';
import { managedSmsText } from '@/core/features/sms/content';
import { smsProgrammeSchema } from '@/core/features/sms/policy';
import {renderTracking} from './message-tracking';
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
    const request=parseDeliveryRequest(envelope.recipient.outboundRequestJson);
    request.content.html=await removeDisabledPixel(runtime.platform,request.content.html);
    return { request, trackedLinks: [] };
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
  const {trackedLinks,rewritten}=await renderTracking(runtime.platform,{channel:envelope.recipient.channel,enabled:envelope.revision.trackingEnabled,smsBody:envelope.revision.smsBody,links:envelope.links,sendByAt:envelope.recipient.sendByAt});
  const unsubscribeUrl = `${publicBaseUrl}${confirmationUnsubscribePath(unsubscribe.token)}`;
  const oneClickUrl = `${publicBaseUrl}${oneClickUnsubscribePath(unsubscribe.token)}`;
  const rendered = renderMessageContent(envelope.revision, {values: eligibility.contact.personalisation, unsubscribeUrl, rewrittenLinks: rewritten});
  const smsApproval=envelope.recipient.channel==='sms'?await runtime.platform.database.$client.prepare('SELECT policy_digest,sender,policy_json FROM sms_approval_policies WHERE revision_id=?').bind(envelope.recipient.revisionId).first<{policy_digest:string;sender:string;policy_json:string}>():undefined;
  if(envelope.recipient.channel==='sms'&&!smsApproval)throw new Error('SMS approval lacks its frozen programme policy; review the revision again.');
  const smsPolicy=smsApproval?smsProgrammeSchema.parse(JSON.parse(smsApproval.policy_json).policy):undefined;
  const content: DeliveryRequest['content'] = envelope.recipient.channel === 'email'
    ? {
        subject: rendered.subject, preheader: rendered.preheader, html: await appendOpenPixel(runtime.platform,envelope.recipient.id,rendered.html,new Date(now.getTime()+30*86400000)), text: rendered.text,
        from: {name: envelope.revision.senderName, email: envelope.revision.fromEmail}, replyTo: envelope.revision.replyToEmail,
        headers: {'List-Unsubscribe': `<${oneClickUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'},
      }
    : {text: managedSmsText(rendered.sms,smsPolicy!,smsApproval!.sender)};
  const request: DeliveryRequest = {
    purpose:'marketing',
    ...(smsApproval?{smsAuthority:{policyDigest:smsApproval.policy_digest,expiresAt:envelope.recipient.sendByAt.getTime()}}:{}),
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

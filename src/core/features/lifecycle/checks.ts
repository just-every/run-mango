import { managedSmsText, smsComplianceBlock } from '@/core/features/sms/content';
import {activeProviderHolds} from './provider-holds';
import {reputationRestricted} from './reputation-guard';
import { smsProgrammeSchema, smsWindow } from '@/core/features/sms/policy';
import { smsSegments } from '@/core/features/sms/segments';
import { emailSubjectAdvisory } from './advisory-policy';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { revisionMatchesSender } from '@/core/features/settings/sender-validation';
import { authoredBody, htmlToText } from '@/core/features/campaigns/authoring-content';
import { unavailableInspection } from '@/core/features/sender-verification/service';
import { invalidPersonalisation } from '@/core/features/campaigns/message-content';
import { inspectEmailHtml } from '@/core/features/campaigns/email-html-policy';
import { inspectOwnMedia, ownMediaName } from '@/core/features/campaign-assets/own-media';
import { parseStructuredRules } from './rules';
import type { ApprovalCheck, LifecycleRepository } from './repository';
import type { CampaignRevisionSnapshot, FrozenCandidate, LifecyclePlatform, SenderCapabilities } from './types';

function check(kind: string, passed: boolean, detail: string, blocking = true): ApprovalCheck {
  return { kind, status: passed ? 'passed' : 'blocked', detail, blocking: blocking && !passed };
}

function validIanaTimeZone(value: string) {
  if (/^[+-]/.test(value)) return false;
  try {
    new Intl.DateTimeFormat('en-AU', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function transmittedDestinations(snapshot: CampaignRevisionSnapshot) {
  const destinations = new Set(snapshot.links.map((link) => link.destinationUrl));
  for (const destination of inspectEmailHtml(snapshot.revision.emailBody).destinations) destinations.add(destination);
  const authored = `${snapshot.revision.emailBody}\n${snapshot.revision.emailText}\n${snapshot.revision.smsBody}`;
  for (const match of authored.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) destinations.add(match[0].replace(/[),.;]+$/, ''));
  return [...destinations];
}

function contentChecks(snapshot: CampaignRevisionSnapshot, allowedHosts: string[]) {
  const { revision, links, steps } = snapshot;
  const selected = new Set(steps.map((step) => step.channel));
  const findings: ApprovalCheck[] = [];
  findings.push(check('campaign.name', Boolean(revision.name.trim()), 'Add a campaign name before approval.'));
  findings.push(check('audience.structured-rule', parseStructuredRules(revision.inclusionRuleJson, revision.exclusionRulesJson).ok,
    'Audience inclusion and exclusions must use complete Mango structured rule version 1 conditions; prose is never executed.'));
  findings.push(check('schedule.steps', steps.length > 0 && steps.every((step) => step.sendByAt > step.scheduledAt),
    'Each step requires a resolved UTC instant before its send-by deadline.'));
  findings.push(check('schedule.timezone', steps.every((step) => validIanaTimeZone(step.timezone)),
    'Each step requires a valid IANA time zone.'));

  const blockedLinks = links.filter((link) => {
    try {
      const url = new URL(link.destinationUrl);
      return url.protocol !== 'https:' || !allowedHosts.includes(url.hostname.toLowerCase());
    } catch {
      return true;
    }
  });
  findings.push(check('message.links', blockedLinks.length === 0,
    blockedLinks.length ? `Blocked links: ${blockedLinks.map((item) => item.destinationUrl).join(', ')}` : 'Every destination is HTTPS on an allowed host.'));

  const authored = `${revision.emailSubject}\n${revision.preheader}\n${revision.emailBody}\n${revision.emailText}\n${revision.smsBody}`;
  const htmlPolicy = inspectEmailHtml(revision.emailBody);
  findings.push(check('message.content', htmlPolicy.issues.length === 0, htmlPolicy.issues.length
    ? htmlPolicy.issues.join(' ')
    : 'Email HTML uses the allowed tags, attributes, inline styles and HTTPS destinations, and hides no text.'));
  const missingFallback = invalidPersonalisation(authored);
  findings.push(check('message.personalisation', missingFallback.length === 0,
    missingFallback.length ? `Invalid personalisation or missing fallback: ${missingFallback.join(', ')}` : 'Every personalisation token carries an explicit fallback.'));

  if (selected.has('email')) {
    const advisory = emailSubjectAdvisory(revision.emailSubject);
    if (advisory) findings.push(advisory);
    const emailComplete = Boolean(
      revision.emailSubject.trim() && revision.emailBody.trim() && revision.emailText.trim() && revision.preheader.trim()
      && revision.senderName.trim() && revision.fromEmail.trim() && revision.replyToEmail.trim() && revision.physicalAddress.trim(),
    );
    const required = {subject:revision.emailSubject, 'message body':htmlToText(authoredBody(revision.emailBody)).replace(/\{\{(?:physical_address|unsubscribe_url)\}\}/g, '').replace(/Unsubscribe|[()]/g, '').trim(), 'plain-text body':revision.emailText, preheader:revision.preheader, 'sender name':revision.senderName, 'from email':revision.fromEmail, 'reply-to email':revision.replyToEmail, 'postal address':revision.physicalAddress};
    const missingContent = Object.entries(required).filter(([,value]) => !value.trim()).map(([name]) => name);
    findings.push(check('message.email-identity', emailComplete && !missingContent.length, missingContent.length ? `Add the missing ${missingContent.join(', ')} before approval.` : 'All required email content and identity fields are present.'));
    const hasUnsubscribe = htmlPolicy.anchors.some(anchor => anchor.href === '{{unsubscribe_url}}' && anchor.label.length > 0) && revision.emailText.includes('{{unsubscribe_url}}');
    findings.push(check('message.email-unsubscribe', hasUnsubscribe, 'HTML requires a visibly labelled managed unsubscribe link; plain text must carry the same managed URL.'));
    const hasPhysicalAddress = revision.emailBody.includes('{{physical_address}}') && revision.emailText.includes('{{physical_address}}');
    findings.push(check('message.email-address', hasPhysicalAddress, 'HTML and plain-text email bodies must both carry the managed physical postal address.'));
    const htmlDestinations = new Set(htmlPolicy.anchors.filter(anchor => anchor.href !== '{{unsubscribe_url}}').map(anchor => anchor.href.replaceAll('&amp;', '&')));
    const textDestinations = new Set([...revision.emailText.matchAll(/https?:\/\/[^\s<>"']+/gi)].map(match => match[0].replace(/[),.;]+$/, '')));
    const savedDestinations = new Set(links.map(link => link.destinationUrl));
    const missing = [...new Set([...htmlDestinations, ...textDestinations, ...savedDestinations])].filter(destination => !htmlDestinations.has(destination) || !textDestinations.has(destination) || !savedDestinations.has(destination));
    findings.push(check('message.multipart-equivalence', missing.length === 0,
      missing.length ? `HTML links, plain-text URLs and saved destinations differ: ${missing.join(', ')}` : 'HTML links and plain-text URLs match the exact saved destination set.'));

  }
  if (selected.has('sms')) {
    findings.push(check('message.sms-compliance',Boolean(revision.smsBody.trim()),'A non-empty SMS body is required. Mango appends the exact configured programme, sender, frequency, jurisdiction and STOP/HELP disclosure.'));
  }
  return findings;
}

function adapterChecks(
  channel: 'email' | 'sms',
  capabilities: SenderCapabilities,
  requiredReconciliationMs: number,
) {
  const prefix = channel === 'email' ? 'mail.sender.v1' : 'sms.sender.v1';
  if (capabilities.handoffPolicy === 'single-attempt') return [
    check(`${prefix}.configured`, capabilities.configured && capabilities.canSendMarketing, capabilities.detail),
    check(`${prefix}.single-attempt`, channel === 'email' && capabilities.provider === 'sendgrid',
      'At-most-once handoff; definite nonacceptance is retry-safe, uncertainty requires operator review and is never automatically retried.'),
  ];
  return [
    check(`${prefix}.configured`, capabilities.configured && capabilities.canSendMarketing, capabilities.detail),
    check(`${prefix}.deduplication`, capabilities.effectiveDeduplication,
      capabilities.effectiveDeduplication ? 'Provider-effective idempotency is available.' : 'Provider-effective idempotency is unavailable.'),
    check(`${prefix}.reconciliation`, capabilities.effectiveReconciliation && capabilities.reconciliationWindowMs >= requiredReconciliationMs,
      `Provider lookup window ${capabilities.reconciliationWindowMs}ms; Mango requires at least ${requiredReconciliationMs}ms.`),
    check(`${prefix}.deduplication-window`, capabilities.deduplicationWindowMs >= requiredReconciliationMs,
      `Provider deduplication window ${capabilities.deduplicationWindowMs}ms; Mango requires at least ${requiredReconciliationMs}ms.`),
  ];
}

export async function runApprovalChecks(input: {
  snapshot: CampaignRevisionSnapshot;
  candidates: FrozenCandidate[];
  platform: LifecyclePlatform;
  repository: LifecycleRepository;
  now: Date;
}) {
  const { snapshot, platform, now } = input;
  await loadSenderSettings(platform);
  const selected = new Set(snapshot.steps.map((step) => step.channel));
  const baseReconciliationWindow = platform.config.unresolvedProviderOutcomeHours * 60 * 60_000
    + platform.config.providerReconciliationIntervalMinutes * 2 * 60_000;
  const requiredWindow = (channel: 'email' | 'sms') => baseReconciliationWindow + Math.max(
    0,
    ...snapshot.steps.filter((step) => step.channel === channel)
      .map((step) => step.sendByAt.getTime() - step.scheduledAt.getTime()),
  );
  const [mailCapabilities, mailInspection] = await Promise.all([
    platform.mailer.capabilities(),
    platform.mailer.inspectSender?.(`${snapshot.revision.senderName} <${snapshot.revision.fromEmail}>`)
      ?? Promise.resolve(unavailableInspection('verification-not-configured')),
  ]);
  let smsCapabilities: SenderCapabilities | undefined;
  let smsValidations: Array<{ready: boolean; detail: string}> = [];
  const checks = contentChecks(snapshot, platform.config.allowedLinkHosts.map((host) => host.toLowerCase()));
  if (selected.has('sms')) {
    if (!platform.sms) {
      const smsModule = platform.config.modules.sms;
      checks.push(check('sms.sender.v1.configured', false, smsModule.enabled
        ? 'The SMS adapter is unavailable despite complete module configuration.'
        : smsModule.detail));
    } else {
      [smsCapabilities, smsValidations] = await Promise.all([
        platform.sms.capabilities(),
        Promise.all([...new Set(input.candidates.flatMap((item) => item.channels.sms?.country ?? []))]
          .map((country) => platform.sms!.validateSender(snapshot.revision.smsSender, country))),
      ]);
    }
  }
  const destinations = transmittedDestinations(snapshot);
  const linkInspections = await Promise.all(destinations.map(async (destination) => {
    const ownMedia = ownMediaName(destination, platform.config.publicBaseUrl);
    return { destination, inspection: ownMedia
      ? await inspectOwnMedia(platform.database.$client, platform.blobs, ownMedia)
      : await platform.linkInspector.inspect(destination) };
  }));
  const blockedDestinations = linkInspections.filter(({ inspection }) => !inspection.ok);
  checks.push(check('message.links.resolved', blockedDestinations.length === 0,
    blockedDestinations.length
      ? `Blocked transmitted links: ${blockedDestinations.map(({ destination, inspection }) => `${destination} (${inspection.detail})`).join('; ')}`
      : `${linkInspections.length} transmitted destination links resolved through allowed HTTPS hosts.`));
  const configured = platform.config.mailSender;
  if (selected.has('email')) {
    checks.push(...adapterChecks('email', mailCapabilities, requiredWindow('email')));
    const holds=await activeProviderHolds(platform.database,mailCapabilities.provider??platform.config.mailProvider??'resend','email',snapshot.revision.fromEmail);
    checks.push(check('provider.restrictions',holds.length===0,holds.length?holds.map(h=>`${h.provider} ${h.scope}: ${h.detail}`).join('; '):'No observed provider restriction.'));
    checks.push(check('message.email-sender', mailInspection.ready && Boolean(mailInspection.lease), mailInspection.reason));
    checks.push(check('message.email-configured-identity',
      revisionMatchesSender(snapshot.revision, configured),
      'The saved sender identity must exactly match the configured business identity.'));
    const authentication = mailInspection.authentication;
    checks.push(check('message.email-authentication', Boolean(authentication?.spf && authentication.dkim && authentication.dmarc && authentication.aligned),
      'SPF, DKIM, DMARC, and visible From-domain alignment must all pass.'));
    checks.push(check('message.email-consent-scope', input.candidates.every((candidate) => {
      const email = candidate.channels.email;
      return !email || Boolean(
        email.consents.some((consent) =>
          consent.destination.toLowerCase() === email.destination.toLowerCase()
          && consent.brandOrLegalSender === snapshot.revision.senderName
          && consent.category === snapshot.revision.messageCategory),
      );
    }), 'Every email destination must have subscribed consent for this legal sender and message category.'));
    const reputation = await input.repository.reputation(snapshot.revision.fromEmail, 'email',
      new Date(now.getTime() - platform.config.deliverabilityReportingWindowDays * 86_400_000));
    const internalBlock = reputationRestricted(reputation);
    checks.push(check('message.sending-reputation', !internalBlock,
      `Window ${platform.config.deliverabilityReportingWindowDays}d: complaints ${reputation.complained}/${reputation.delivered}; hard bounces ${reputation.hardBounced}/${reputation.attempted}.`));
  }
  if (selected.has('sms')) {
    const smsModule=platform.config.modules.sms,policy=smsModule.enabled?smsProgrammeSchema.safeParse(smsModule.config.programme):undefined;
    const configured=policy?.success?policy.data:undefined;
    checks.push(check('message.sms-programme',Boolean(configured && smsModule.enabled && snapshot.revision.smsSender===smsModule.config.confirmationSender && snapshot.revision.messageCategory===configured.category), configured&&smsModule.enabled?`Managed disclosure appended to every SMS: ${smsComplianceBlock(configured,smsModule.config.confirmationSender)}`:'Configure the SMS sender and programme before approval.'));
    const disclosed=configured&&smsModule.enabled?managedSmsText(snapshot.revision.smsBody,configured,smsModule.config.confirmationSender):snapshot.revision.smsBody;
    checks.push(check('message.sms-segments',smsSegments(disclosed).segments<=10, `Draft plus managed disclosure estimate: ${smsSegments(disclosed).segments} ${smsSegments(disclosed).encoding} segments before recipient personalisation and tracked links. Final text is counted again at handoff; provider limit is 10 parts.`));
    checks.push(check('message.sms-policy',Boolean(configured && input.candidates.every(candidate=>{const sms=candidate.channels.sms;if(!sms)return true;const decision=smsWindow(configured,now,sms.timeZone??null,sms.timeZoneEvidenceSource??null,sms.timeZoneEvidenceAt?.getTime()??null);return decision.allowed||decision.reason==='sms-quiet-window';})), 'Current provider, jurisdiction and recipient window evidence and fresh recipient location are required; handoff waits for their intersection.'));
    if (smsCapabilities) {
      checks.push(...adapterChecks('sms', smsCapabilities, requiredWindow('sms')));
      const holds=await activeProviderHolds(platform.database,'mobile-message','sms',snapshot.revision.smsSender);
      checks.push(check('sms.provider-restrictions',holds.length===0,holds.length?holds.map(h=>String(h.detail)).join('; '):'No observed provider restriction.'));
      checks.push(check('message.sms-sender', smsValidations.every((item) => item.ready),
        smsValidations.length ? smsValidations.map((item) => item.detail).join('; ') : 'Recipient jurisdiction is missing; registered sender cannot be confirmed.'));
    }
    checks.push(check('message.sms-location-evidence', input.candidates.every((candidate) => {
      const sms = candidate.channels.sms;
      return !sms || Boolean(sms.country && sms.timeZone && sms.timeZoneEvidenceAt && sms.timeZoneEvidenceSource);
    }), 'Every SMS candidate requires recorded recipient-local country and time-zone evidence.'));
    checks.push(check('message.sms-consent-scope', input.candidates.every((candidate) => {
      const sms = candidate.channels.sms;
      return !sms || Boolean(
        sms.consents.some((consent) =>
          consent.destination === sms.destination
          && consent.smsProgramme === configured?.programme
          && consent.brandOrLegalSender === configured?.brand
          && consent.frequencyDisclosure === configured?.frequency
          && consent.category === snapshot.revision.messageCategory
          && consent.jurisdiction === sms.country),
      );
    }), 'Every SMS destination must have subscribed consent for this programme, category, and jurisdiction.'));
  }
  return { checks, mailCapabilities, smsCapabilities, senderLease: mailInspection.lease };
}

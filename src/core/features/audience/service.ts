import type {SenderWriteAuthority} from '@/core/features/settings/sender-authority';
import type {OptInMode} from './opt-in-modes';
import {recipientOptOut, recipientSuppression} from './public-resubscribe-policy';
import type { SyncWriteFence } from '@/core/features/store/sync-write-fence';
import type { CommerceSourceType, NormalizedCommerceRecord, createStoreService } from '@/core/features/store/service';
import { sha256, ulid } from '@/core/shared/ids';

import { createAudienceEligibility, selectedChannel } from './eligibility';
import { destinationForChannel, canonicalEmail, canonicalPhone } from './identity';
import type { createAudienceRepository } from './repository';

const dayMs = 24 * 60 * 60 * 1000;
const confirmationLifetimeMs = 30 * dayMs;
const dormancyMs = 365 * dayMs;
const publicTokenAllowance = 10;

export type Channel = 'email' | 'sms';
export type ChannelStatus = 'pending' | 'subscribed' | 'non-subscribed' | 'unsubscribed' | 'suppressed';

export type PublicTokenSigner = {
  issuePublicToken(id: string, purpose: string, expiresAt: Date): Promise<string> | string;
  verifyPublicToken(token: string, purpose: string): Promise<{ id: string } | undefined> | { id: string } | undefined;
};

export type ConfirmationDispatcher = {
  // Complete every asynchronous preparation step before authorizing, then invoke
  // the adapter immediately. False denotes a lost eligibility race.
  sendConfirmation(input: { channel: Channel; destination: string; token: string; expiresAt: Date; contactId: string; consentId: string }, authorizeHandoff: () => Promise<boolean>): Promise<void | boolean>;
};

export type AudienceDependencies = {
  validateConsent?(input: ConsentCapture): void;
  contactHashSalt: string;
  publicTokens: PublicTokenSigner;
  confirmationDispatcher: ConfirmationDispatcher;
  store: Pick<ReturnType<typeof createStoreService>, 'freshness' | 'ingestSuccessfulCommerceBatch' | 'recordCommerceSyncFailure' | 'sourceActivities' | 'sourceRecords' | 'moveSourceData'>;
  moveLifecycleData(mergedContactId: string, survivorContactId: string): Promise<void>;
};

export type ConsentCapture = {
  contact: { email?: string; phone?: string; displayName?: string };
  channel: Channel;
  brandOrLegalSender: string;
  smsProgram?: string;
  timeZone?: string;
  locationSource?: string;
  locationRecordedAt?: Date;
  messageCategory: string;
  frequencyDisclosure: string;
  destinationJurisdiction: string;
  captureMethod: string;
  captureSource: string;
  captureIp?: string;
  consentText: string;
  consentVersion: string;
  occurredAt: Date;
  confirmationRequired?: boolean;
  optInPolicy?:{mode?:OptInMode;credentialId?:string;allowResubscribe?:boolean;operator?:SenderWriteAuthority};
  idempotencyKey?: string;
};

export type CommerceWebhookEvent = {
  provider: string;
  completion: 'full' | 'delta';
  adapterCompleted: boolean;
  sourceTypes: CommerceSourceType[];
  receipt?: import('@/core/features/store/atomic-ingestion').CommerceReceipt;
  records: Array<NormalizedCommerceRecord & { contact?: { email?: string; phone?: string; displayName?: string } }>;
};

export type SmsComplianceReply = {
  providerEventId: string;
  destination: string;
  keyword: string;
  canonicalAction: 'opt-out' | 'help' | 'fresh-consent' | 'none';
  sender: string;
  program: string;
  jurisdiction: string;
  providerAlreadyResponded: boolean;
  occurredAt: Date;
};

function statusRank(status: string) {
  return ({ subscribed: 0, pending: 1, 'non-subscribed': 2, unsubscribed: 3, suppressed: 4 } as Record<string, number>)[status] ?? 4;
}

function mostRestrictive(left: ChannelStatus, right: ChannelStatus) {
  return statusRank(left) >= statusRank(right) ? left : right;
}

export function createAudienceService(
  repository: ReturnType<typeof createAudienceRepository>,
  dependencies?: AudienceDependencies,
) {
  function requiredDependencies() {
    if (!dependencies) throw new Error('Audience ledger dependencies are not configured.');
    return dependencies;
  }

  const eligibility = dependencies
    ? createAudienceEligibility(repository, dependencies.store, async (channel, destination) => repository.hasDestinationSuppression(await hashDestination(destination), channel))
    : undefined;

  async function hashDestination(destination: string) {
    const { contactHashSalt } = requiredDependencies();
    return sha256(`${contactHashSalt}:${destination}`);
  }

  async function identity(input: { email?: string; phone?: string }) {
    const email = canonicalEmail(input.email);
    const phone = canonicalPhone(input.phone);
    if (!email && !phone) throw new Error('A contact requires an email address or E.164 phone number.');
    return { email, phone };
  }

  async function ensureContact(input: { email?: string; phone?: string; displayName?: string }, now: Date, fence?: SyncWriteFence) {
    const normalized = await identity(input);
    const [emailContact, phoneContact] = await Promise.all([
      normalized.email ? repository.findContactByEmail(normalized.email) : undefined,
      normalized.phone ? repository.findContactByPhone(normalized.phone) : undefined,
    ]);
    if (emailContact && phoneContact && emailContact.id !== phoneContact.id) {
      throw new Error('The supplied email and phone already identify different contacts; merge them before linking identities.');
    }
    // An address new to Mango first takes any opt-out restored for it from another installation.
    const arriving = [emailContact ? undefined : normalized.email, phoneContact ? undefined : normalized.phone].filter((value): value is string => Boolean(value));
    if (arriving.length) await repository.claimPortableRestrictions(requiredDependencies().contactHashSalt, arriving);
    let contact = emailContact ?? phoneContact;
    let created = false;
    if (!contact) {
      const [emailOptOut, smsOptOut, emailSuppressed, smsSuppressed] = await Promise.all([
        normalized.email ? repository.getSurvivingOptOut(await hashDestination(normalized.email), 'email') : undefined,
        normalized.phone ? repository.getSurvivingOptOut(await hashDestination(normalized.phone), 'sms') : undefined,
        normalized.email ? repository.hasDestinationSuppression(await hashDestination(normalized.email), 'email') : false,
        normalized.phone ? repository.hasDestinationSuppression(await hashDestination(normalized.phone), 'sms') : false,
      ]);
      try {
        contact = await repository.createContact({
          id: ulid(now.getTime()),
          email: normalized.email ?? null,
          displayName: input.displayName?.trim() || normalized.email || normalized.phone || 'Unnamed contact',
          emailStatus: emailSuppressed ? 'suppressed' : emailOptOut ? 'unsubscribed' : 'non-subscribed',
          smsStatus: smsSuppressed ? 'suppressed' : smsOptOut ? 'unsubscribed' : 'non-subscribed',
          emailStatusAt: emailOptOut?.occurredAt ?? now,
          smsStatusAt: smsOptOut?.occurredAt ?? now,
          sourceCustomerRecordId: null,
          lastActivityAt: null,
          createdAt: now,
          updatedAt: now,
        }, fence);
        created = true;
      } catch (error) {
        // The unique indexes are the concurrency authority. A simultaneous
        // import that won the identity is an update, never a second contact.
        contact = (normalized.email ? await repository.findContactByEmail(normalized.email) : undefined)
          ?? (normalized.phone ? await repository.findContactByPhone(normalized.phone) : undefined);
        if (!contact) throw error;
      }
    }
    if (!contact) throw new Error('The contact could not be persisted.');
    if (normalized.email) {
      const optOut = await repository.getSurvivingOptOut(await hashDestination(normalized.email), 'email');
      const suppressed = await repository.hasDestinationSuppression(await hashDestination(normalized.email), 'email');
      const owner = await repository.addEmail({
        id: ulid(now.getTime()), contactId: contact.id, email: normalized.email,
        channelStatus: suppressed ? 'suppressed' : optOut ? 'unsubscribed' : 'non-subscribed', channelStatusAt: optOut?.occurredAt ?? now, createdAt: now, updatedAt: now,
      }, fence);
      if (!owner || owner.id !== contact.id) {
        if (created) await repository.discardUnlinkedContact(contact.id);
        throw new Error('That email is already assigned to another contact.');
      }
    }
    if (normalized.phone) {
      const optOut = await repository.getSurvivingOptOut(await hashDestination(normalized.phone), 'sms');
      const suppressed = await repository.hasDestinationSuppression(await hashDestination(normalized.phone), 'sms');
      const owner = await repository.addPhone({
        id: ulid(now.getTime()), contactId: contact.id, phoneE164: normalized.phone,
        channelStatus: suppressed ? 'suppressed' : optOut ? 'unsubscribed' : 'non-subscribed', channelStatusAt: optOut?.occurredAt ?? now,
        identityStatus: 'active', timeZone: null, locationSource: null, locationRecordedAt: null, createdAt: now, updatedAt: now,
      }, fence);
      if (!owner || owner.id !== contact.id) {
        if (created) await repository.discardUnlinkedContact(contact.id);
        throw new Error('That phone is already assigned to another contact.');
      }
    }
    if (input.displayName?.trim() && input.displayName.trim() !== contact.displayName) {
      contact = await repository.updateContact(contact.id, { displayName: input.displayName.trim(), updatedAt: now }, fence) ?? contact;
    }
    return { contact, normalized, created };
  }

  async function recordHistory(contactId: string, kind: string, detail: string, occurredAt: Date, stableId?: string) {
    await repository.recordHistory({
      id: stableId ?? ulid(occurredAt.getTime()),
      contactId,
      kind,
      detail,
      occurredAt,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
  }

  async function optOut(input: { contactId?: string; destination?: string; channel: Channel; reason: string; occurredAt: Date; stableId?: string }) {
    let destination = input.destination;
    let contact = input.contactId ? await repository.getContact(input.contactId) : undefined;
    if (!destination && contact) {
      const [emails, phones] = await Promise.all([repository.listEmails(contact.id), repository.listPhones(contact.id)]);
      destination = input.channel === 'email' ? emails[0]?.email : phones[0]?.phoneE164;
    }
    if (!destination) throw new Error('An opt-out requires a known destination.');
    const normalized = input.channel === 'email' ? canonicalEmail(destination) : canonicalPhone(destination);
    if (!normalized) throw new Error('An opt-out requires a valid destination.');
    if (!contact) contact = input.channel === 'email' ? await repository.findContactByEmail(normalized) : await repository.findContactByPhone(normalized);
    const destinationHash = await hashDestination(normalized);
    await repository.upsertSurvivingOptOut({
      id: ulid(input.occurredAt.getTime()), destinationHash, channel: input.channel, reason: input.reason,
      occurredAt: input.occurredAt, createdAt: input.occurredAt, updatedAt: input.occurredAt,
    }, normalized);
    if (contact) {
      await repository.setDestinationStatus(input.channel, normalized, 'unsubscribed', input.occurredAt);
      await recordHistory(contact.id, 'opt-out', input.reason, input.occurredAt, input.stableId);
    }
    return { contact, destination: normalized };
  }

  function matchesConsentEvidence(evidence: NonNullable<Awaited<ReturnType<typeof repository.getConsent>>>, input: ConsentCapture) {
    const destination = input.channel === 'email' ? canonicalEmail(input.contact.email ?? '') : canonicalPhone(input.contact.phone ?? '');
    return evidence.channel === input.channel && evidence.destination === destination
      && evidence.brandOrLegalSender === input.brandOrLegalSender && evidence.smsProgram === (input.smsProgram ?? null)
      && evidence.messageCategory === input.messageCategory && evidence.frequencyDisclosure === input.frequencyDisclosure
      && evidence.destinationJurisdiction === input.destinationJurisdiction && evidence.captureMethod === input.captureMethod
      && evidence.captureSource === input.captureSource && evidence.consentText === input.consentText
      && evidence.consentVersion === input.consentVersion && evidence.confirmationRequired === (input.confirmationRequired ?? true)
      && evidence.occurredAt.getTime() === input.occurredAt.getTime();
  }

  async function publicSignupState(email: string) {
    const destination = canonicalEmail(email);
    if (!destination) return 'refused' as const;
    await repository.claimPortableRestrictions(requiredDependencies().contactHashSalt, [destination]);
    const hash = await hashDestination(destination);
    const [contact, optOuts, suppressions] = await Promise.all([
      repository.findContactByEmail(destination), repository.listDestinationOptOuts(hash,'email'),
      repository.listDestinationSuppressions([hash]),
    ]);
    const address = contact && (await repository.listEmails(contact.id)).find(row=>row.email===destination);
    const blocks = suppressions.filter(row=>row.channel==='email');
    if (!contact && optOuts.length) await ensureContact({email:destination},new Date());
    if (blocks.some(row=>!recipientSuppression(row)) || optOuts.some(row=>!recipientOptOut(row.reason))) return 'refused' as const;
    if (contact?.mergeLock || contact?.emailStatus==='subscribed' || address?.channelStatus==='subscribed') return 'refused' as const;
    if (contact?.emailStatus==='suppressed' || address?.channelStatus==='suppressed') {
      if (!blocks.length) return 'refused' as const;
    }
    return optOuts.length || blocks.length || contact?.emailStatus==='unsubscribed' || address?.channelStatus==='unsubscribed'
      ? 'resubscribe' as const : 'new' as const;
  }

  async function canCapturePublicEmail(email: string) {
    return await publicSignupState(email) !== 'refused';
  }

  async function recordPublicSignupRefusal(email: string, reason: string, now = new Date()) {
    const contact = await repository.findContactByEmail(canonicalEmail(email) ?? '');
    if (contact && contact.emailStatus!=='subscribed') await recordHistory(contact.id,'resubscribe-refused',reason,now);
  }

  // Public reconsent creates evidence without relaxing the existing channel state.
  async function capturePublicSignup(input: ConsentCapture, now = new Date()) {
    if (input.channel !== 'email' || !await canCapturePublicEmail(input.contact.email ?? '')) return undefined;
    const destination = canonicalEmail(input.contact.email)!;
    const publicInput = {...input, confirmationRequired: input.confirmationRequired!==false || await publicSignupState(destination)==='resubscribe'};
    const values = consentValues(publicInput, ulid(now.getTime()), destination, now);
    const captured = await repository.capturePublicSignupAtomic(values, await hashDestination(destination), input.contact.displayName, input.captureIp,input.optInPolicy);
    if (!captured) return undefined;
    const evidence = await repository.getConsent(values.id);
    const contact = evidence && await repository.getContact(evidence.contactId);
    if (!evidence || !contact) return undefined;
    if(!evidence.confirmationRequired)return {contact,evidence,confirmation:undefined};
    return sendConsentConfirmation(publicInput, contact, evidence, now, true);
  }

  function consentValues(input: ConsentCapture, contactId: string, destination: string, now: Date) {
    const confirmationRequired = input.confirmationRequired ?? true;
    return {
      id: input.idempotencyKey ?? ulid(now.getTime()), contactId, channel: input.channel, destination,
      brandOrLegalSender: input.brandOrLegalSender, smsProgram: input.smsProgram ?? null,
      messageCategory: input.messageCategory, frequencyDisclosure: input.frequencyDisclosure,
      destinationJurisdiction: input.destinationJurisdiction, captureMethod: input.captureMethod, captureSource: input.captureSource,
      consentText: input.consentText, consentVersion: input.consentVersion, occurredAt: input.occurredAt, confirmationRequired,
      confirmedAt: confirmationRequired ? null : input.occurredAt, createdAt: now, updatedAt: now,
    };
  }

  async function captureConsent(input: ConsentCapture, now = new Date()) {
    requiredDependencies().validateConsent?.(input);
    if(input.channel==='sms' && !input.smsProgram?.trim())throw new Error('SMS programme is required.');
    if (input.idempotencyKey) {
      const previous = await repository.getConsent(input.idempotencyKey);
      if (previous) {
        if (!matchesConsentEvidence(previous, input)) {
          throw new Error('Consent idempotency key cannot be reused for different affirmative evidence.');
        }
        const current = await repository.getContact(previous.contactId);
        if (!current) throw new Error('Consent replay refers to a removed contact.');
        return {contact: current, evidence: previous, confirmation: undefined};
      }
    }
    const { contact, normalized, created } = await ensureContact(input.contact, now);
    const destination = destinationForChannel(input.channel, normalized);
    if(input.channel==='sms' && input.timeZone && input.locationSource && input.locationRecordedAt)await repository.recordPhoneLocation(destination,input.timeZone,input.locationSource,input.locationRecordedAt);
    const evidenceId = input.idempotencyKey ?? ulid(now.getTime());
    const confirmationRequired = input.confirmationRequired ?? true;
    if (confirmationRequired) requiredDependencies().confirmationDispatcher;
    const manualSms=input.channel==='sms'&&input.captureMethod==='operator-recorded';
    const values={...consentValues(input,contact.id,destination,now),id:evidenceId};
    if(manualSms&&(!input.optInPolicy?.operator||!await repository.recordManualSmsCapture(values,await hashDestination(destination),input.optInPolicy.operator)))throw new Error('This phone is already subscribed, unsubscribed or suppressed, or operator authority changed. Hand entry cannot change that state.');
    const evidence = manualSms?await repository.getConsent(evidenceId):await repository.recordConsent(values);
    if (!evidence) throw new Error('Consent evidence could not be persisted.');
    if (input.captureIp) await repository.recordConsentCaptureIp(evidence.id,contact.id,input.captureIp,now);
    if (evidence.contactId !== contact.id || !matchesConsentEvidence(evidence, input)) throw new Error('Consent idempotency key cannot be reused for different affirmative evidence.');
    await recordHistory(contact.id, 'consent-captured', `${input.channel} consent captured through ${input.captureMethod}.`, input.occurredAt, `${evidenceId}_captured`);
    const survivingOptOut = await repository.getSurvivingOptOut(await hashDestination(destination), input.channel);
    if (!manualSms && !(created && survivingOptOut)) await repository.setDestinationStatus(input.channel, destination, 'pending', input.occurredAt);
    if (!contact.lastActivityAt || contact.lastActivityAt < input.occurredAt) {
      await repository.updateContact(contact.id, { lastActivityAt: input.occurredAt, updatedAt: now });
    }
    if (!confirmationRequired) {
      const subscribed = await repository.subscribeFromConfirmedEvidence(contact.id, input.channel, input.occurredAt, input.occurredAt);
      await repository.setDestinationStatus(input.channel, destination, 'subscribed', input.occurredAt);
      return { contact: subscribed ?? contact, evidence, confirmation: undefined };
    }
    const dispatched=await sendConsentConfirmation(input,contact,evidence,now,false);
    if(manualSms){const current=await repository.getContact(contact.id);if(!current)throw new Error('The contact changed during confirmation delivery.');return {...dispatched,contact:current};}
    return dispatched;
  }

  async function sendConsentConfirmation(input: ConsentCapture, contact: NonNullable<Awaited<ReturnType<typeof repository.getContact>>>,
    evidence: NonNullable<Awaited<ReturnType<typeof repository.getConsent>>>, now: Date, publicCapture: boolean) {
    const destination = evidence.destination;
    const destinationHash = await hashDestination(destination);
    const dispatchAllowed = async () => {
      const [suppressed, optOut, address] = await Promise.all([
        publicCapture ? repository.listDestinationSuppressions([destinationHash]).then(rows=>rows.some(row=>row.channel===input.channel&&!recipientSuppression(row))) : repository.hasDestinationSuppression(destinationHash, input.channel),
        repository.getSurvivingOptOut(destinationHash, input.channel),
        repository.destinationStatus(input.channel, destination),
      ]);
      return !suppressed && (!publicCapture ? address?.channelStatus !== 'suppressed' : await publicSignupState(destination) !== 'refused')
        && !(optOut && optOut.occurredAt >= input.occurredAt)
        && !(publicCapture && address?.channelStatus === 'subscribed');
    };
    if (!await dispatchAllowed()) return { contact, evidence, confirmation: undefined };
    const expiresAt = new Date(now.getTime() + confirmationLifetimeMs);
    const existingConfirmation = await repository.getConfirmationByConsentEvidenceId(evidence.id);
    if (existingConfirmation) {
      return { contact, evidence, confirmation: undefined };
    }
    const confirmationId = `${evidence.id}_confirmation`;
    const token = await requiredDependencies().publicTokens.issuePublicToken(confirmationId, 'consent-confirmation', expiresAt);
    await repository.createConfirmation({
      id: confirmationId,
      consentEvidenceId: evidence.id,
      contactId: contact.id,
      channel: input.channel,
      tokenDigest: await sha256(token),
      sentAt: now,
      expiresAt,
      confirmedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    if (!publicCapture && input.captureMethod!=='operator-recorded') await repository.setPendingFromEvidence(contact.id, input.channel, input.occurredAt);
    if (!await dispatchAllowed()) return { contact, evidence, confirmation: undefined };
    const sent = await requiredDependencies().confirmationDispatcher.sendConfirmation({ channel: input.channel, destination, token, expiresAt, contactId:contact.id, consentId:evidence.id },
      () => repository.claimConfirmationHandoff(confirmationId, destinationHash, input.channel, publicCapture));
    if (sent === false) return { contact, evidence, confirmation: undefined };
    await recordHistory(contact.id,'confirmation-handed-off',`${input.channel} confirmation handed to the mail provider; expires ${expiresAt.toISOString()}.`,new Date(),`${evidence.id}_handoff`);
    return { contact, evidence, confirmation: { token, expiresAt } };
  }

  async function previewConsentConfirmation(token: string, now = new Date()) {
    const verified = await requiredDependencies().publicTokens.verifyPublicToken(token, 'consent-confirmation');
    if (!verified) return { kind: 'invalid' as const };
    const confirmation = await repository.getConfirmationByTokenDigest(await sha256(token));
    if (!confirmation || confirmation.id !== verified.id || confirmation.expiresAt <= now) return { kind: 'invalid' as const };
    if (confirmation.confirmedAt) return { kind: 'already-confirmed' as const };
    const evidence = await repository.getConsent(confirmation.consentEvidenceId);
    if (!evidence || (evidence.channel==='sms'&&evidence.captureMethod==='operator-recorded')) return { kind: 'invalid' as const };
    const hash = await hashDestination(evidence.destination);
    const [owner, optOut, suppressed] = await Promise.all([
      confirmation.channel === 'email' ? repository.findContactByEmail(evidence.destination) : repository.findContactByPhone(evidence.destination),
      repository.getSurvivingOptOut(hash, confirmation.channel as Channel),
      repository.hasDestinationSuppression(hash, confirmation.channel as Channel),
    ]);
    const status = confirmation.channel === 'email' ? owner?.emailStatus : owner?.smsStatus;
    const statusAt = confirmation.channel === 'email' ? owner?.emailStatusAt : owner?.smsStatusAt;
    const publicResubscribe = (await repository.listHistory(confirmation.contactId)).some(row=>row.id===`${evidence.id}_resubscribe`);
    const recipientOnly = publicResubscribe && await publicSignupState(evidence.destination) !== 'refused';
    if (owner?.id !== confirmation.contactId || ((suppressed || status === 'suppressed') && !recipientOnly)
      || (status === 'unsubscribed' && statusAt && statusAt >= evidence.occurredAt)
      || (optOut && evidence.occurredAt <= optOut.occurredAt)) return { kind: 'invalid' as const };
    return { kind: 'confirmation-required' as const };
  }

  async function confirmConsent(token: string, now = new Date(), confirmationIp?: string) {
    const verified = await requiredDependencies().publicTokens.verifyPublicToken(token, 'consent-confirmation');
    if (!verified) return { kind: 'invalid' as const };
    const confirmation = await repository.getConfirmationByTokenDigest(await sha256(token));
    if (!confirmation || confirmation.id !== verified.id || confirmation.expiresAt <= now) return { kind: 'invalid' as const };
    if (confirmation.confirmedAt) return { kind: 'already-confirmed' as const };
    const evidence = await repository.getConsent(confirmation.consentEvidenceId);
    if (!evidence || (evidence.channel==='sms'&&evidence.captureMethod==='operator-recorded')) return { kind: 'invalid' as const };
    const [activeOwner, optOut] = await Promise.all([
      confirmation.channel === 'email' ? repository.findContactByEmail(evidence.destination) : repository.findContactByPhone(evidence.destination),
      repository.getSurvivingOptOut(await hashDestination(evidence.destination), confirmation.channel as Channel),
    ]);
    if (activeOwner?.id !== confirmation.contactId || (optOut && evidence.occurredAt <= optOut.occurredAt)) {
      return { kind: 'blocked-by-later-opt-out' as const };
    }
    const contact = await repository.confirmConsentAtomic(confirmation, evidence, await hashDestination(evidence.destination), now, confirmationIp);
    if (!contact) return { kind: 'blocked-by-later-opt-out' as const };
    return { kind: 'confirmed' as const, contact };
  }

  async function issueMarketingUnsubscribe(input: { contactId: string; channel: Channel; recipientStepId: string; expiresAt: Date }, now = new Date()) {
    const { contactId, channel, recipientStepId, expiresAt } = input;
    const contact = await repository.getContact(contactId);
    if (!contact) throw new Error('Cannot issue an unsubscribe token for an unknown contact.');
    if (expiresAt <= now) throw new Error('An unsubscribe token must outlive its recipient-step hand-off.');
    const id = ulid(now.getTime());
    const token = await requiredDependencies().publicTokens.issuePublicToken(id, 'unsubscribe', expiresAt);
    await repository.createPublicActionToken({
      id, contactId, channel, recipientStepId, purpose: 'unsubscribe', tokenDigest: await sha256(token), expiresAt, usedAt: null, createdAt: now, updatedAt: now,
    });
    return { token, expiresAt };
  }

  function issueUnsubscribeToken(contactId: string, channel: Channel, now = new Date()) {
    return issueMarketingUnsubscribe({ contactId, channel, recipientStepId: `manual_${ulid(now.getTime())}`, expiresAt: new Date(now.getTime() + 365 * dayMs) }, now);
  }

  async function unsubscribeWithToken(token: string, now = new Date(), method: 'link' | 'one-click' = 'link') {
    const verified = await requiredDependencies().publicTokens.verifyPublicToken(token, 'unsubscribe');
    if (!verified) return { kind: 'invalid' as const };
    const digest = await sha256(token);
    const requests = await repository.takePublicTokenAllowance(digest, now);
    if (requests > publicTokenAllowance) return { kind: 'rate-limited' as const };
    const action = await repository.getPublicActionToken(digest, 'unsubscribe');
    if (!action || action.id !== verified.id || action.expiresAt <= now) return { kind: 'invalid' as const };
    // A link opts out its channel on the surviving person, including merged aliases.
    // Older tokens have no destination, so never guess which address was intended.
    const destinations=action.channel==='email'?(await repository.listEmails(action.contactId)).map(row=>row.email):(await repository.listPhones(action.contactId)).map(row=>row.phoneE164);
    if(!destinations.length)return {kind:'invalid' as const};
    for(const [index,destination] of destinations.entries()) await optOut({contactId:action.contactId,destination,channel:action.channel as Channel,reason:'recipient-unsubscribe',occurredAt:now,stableId:`${action.id}_optout_${index}`});
    await repository.markPublicActionUsed(action.id, now, method);
    return { kind: 'unsubscribed' as const };
  }

  async function previewUnsubscribeToken(token: string, now = new Date()) {
    const verified = await requiredDependencies().publicTokens.verifyPublicToken(token, 'unsubscribe');
    if (!verified) return { kind: 'invalid' as const };
    const digest = await sha256(token);
    const requests = await repository.takePublicTokenAllowance(digest, now);
    if (requests > publicTokenAllowance) return { kind: 'rate-limited' as const };
    const action = await repository.getPublicActionToken(digest, 'unsubscribe');
    if (!action || action.id !== verified.id || action.expiresAt <= now) return { kind: 'invalid' as const };
    return { kind: 'confirmation-required' as const };
  }

  async function recordProviderSuppression(input: { destination: string; channel: Channel; cause: string; occurredAt: Date; providerEventId?: string }) {
    const destination = input.channel === 'email' ? canonicalEmail(input.destination) : canonicalPhone(input.destination);
    if (!destination) throw new Error('A provider suppression requires a destination.');
    const contact = input.channel === 'email' ? await repository.findContactByEmail(destination) : await repository.findContactByPhone(destination);
    const destinationHash = await hashDestination(destination);
    const result = await repository.recordProviderSuppressionAtomic({
      id: ulid(input.occurredAt.getTime()), destination, destinationHash, channel: input.channel,
      cause: input.cause, occurredAt: input.occurredAt, providerEventId: input.providerEventId,
    });
    return {...result, contact};
  }

  async function reconcileSoftBounceState(contactId: string, email: string, now: Date) {
    const facts = await repository.listBounceFacts(contactId);
    const latestDelivery = facts.filter((fact) => fact.kind === 'delivery').at(-1)?.occurredAt.getTime() ?? 0;
    const bounces = facts.filter((fact) => fact.kind === 'soft-bounce' && fact.occurredAt.getTime() > latestDelivery);
    await repository.setSoftBounceCount(contactId, bounces.length, now);
    if (bounces.length >= 3) {
      await recordProviderSuppression({
        destination: email,
        channel: 'email',
        cause: 'three-consecutive-soft-bounces',
        occurredAt: bounces.at(-1)!.occurredAt,
        providerEventId: bounces.at(-1)!.providerEventId,
      });
      return bounces.length;
    }
    const destinationHash = await hashDestination(email);
    // Only the soft-bounce records are lifted. Opt-outs and other suppressions are their own
    // records, and the address returns to subscribed only when none of them remains.
    await repository.removeSoftBounceSuppression(contactId, destinationHash);
    await repository.removeSurvivingOptOutForReason(destinationHash, 'email', 'three-consecutive-soft-bounces');
    if (!await repository.hasSuppression(destinationHash)) {
      if (await repository.getSurvivingOptOut(destinationHash, 'email')) await repository.settleLiftedSuppression(email, 'unsubscribed', now);
      else {
        const consent = (await repository.listConsent(contactId)).find((entry) => (
          entry.channel === 'email' && entry.destination === email && entry.confirmedAt
        ));
        if (consent) await repository.settleLiftedSuppression(email, 'subscribed', now);
      }
    }
    return bounces.length;
  }

  async function recordBounce(input: { destination: string; kind: 'hard' | 'soft' | 'complaint' | 'provider-suppression'; occurredAt: Date; providerEventId?: string }) {
    const email = canonicalEmail(input.destination);
    if (!email) throw new Error('A bounce requires an email destination.');
    const contact = await repository.findContactByEmail(email);
    if (input.kind === 'soft') {
      if (!contact) return { kind: 'recorded' as const };
      if (!input.providerEventId) throw new Error('A provider soft-bounce event identifier is required.');
      const inserted = await repository.recordBounceFact({ providerEventId: input.providerEventId, contactId: contact.id, kind: 'soft-bounce', occurredAt: input.occurredAt, createdAt: input.occurredAt });
      if (!inserted) return { kind: 'duplicate' as const };
      const count = await reconcileSoftBounceState(contact.id, email, input.occurredAt);
      await recordHistory(contact.id, 'soft-bounce', `Consecutive soft bounce count: ${count}.`, input.occurredAt, input.providerEventId);
      if (count < 3) return { kind: 'recorded' as const, count };
      await recordProviderSuppression({ destination: email, channel: 'email', cause: 'three-consecutive-soft-bounces', occurredAt: input.occurredAt, providerEventId: input.providerEventId });
      return { kind: 'suppressed' as const, count };
    }
    return recordProviderSuppression({ destination: email, channel: 'email', cause: input.kind, occurredAt: input.occurredAt, providerEventId: input.providerEventId });
  }

  async function recordProviderDelivery(contactId: string, channel: Channel, occurredAt: Date, providerEventId?: string) {
    if (channel === 'email') {
      if (!providerEventId) throw new Error('A provider delivery event identifier is required.');
      const inserted = await repository.recordBounceFact({ providerEventId, contactId, kind: 'delivery', occurredAt, createdAt: occurredAt });
      if (!inserted) return;
      const contact = await repository.getContact(contactId);
      const destination = contact ? (await repository.listEmails(contact.id))[0]?.email : undefined;
      if (destination) await reconcileSoftBounceState(contactId, destination, occurredAt);
    }
    await recordHistory(contactId, 'provider-delivery', `${channel} delivery confirmed by the provider.`, occurredAt);
  }

  async function receiveSmsComplianceReply(reply: SmsComplianceReply) {
    const destination = canonicalPhone(reply.destination);
    if (!destination) throw new Error('An SMS compliance reply requires an E.164 destination.');
    const contact = await repository.findContactByPhone(destination);
    const inserted = await repository.recordSmsComplianceReply({
      id: ulid(reply.occurredAt.getTime()), providerEventId: reply.providerEventId, contactId: contact?.id ?? null, channel: 'sms',
      canonicalAction: reply.canonicalAction, keyword: reply.keyword, sender: reply.sender, program: reply.program,
      jurisdiction: reply.jurisdiction, occurredAt: reply.occurredAt, createdAt: reply.occurredAt, updatedAt: reply.occurredAt,
    });
    if (reply.canonicalAction === 'opt-out') {
      await optOut({ destination, channel: 'sms', reason: `sms-${reply.keyword.toLowerCase()}`, occurredAt: reply.occurredAt, stableId: `${reply.providerEventId}_optout` });
    } else if (contact && inserted) {
      const kind = reply.canonicalAction === 'fresh-consent' ? 'sms-fresh-consent-requested' : reply.canonicalAction === 'help' ? 'sms-help-requested' : 'sms-reply';
      await recordHistory(contact.id, kind, `SMS reply ${reply.keyword} received for ${reply.program}.`, reply.occurredAt, reply.providerEventId);
    }
    return { duplicate: !inserted, respond: !reply.providerAlreadyResponded, action: reply.canonicalAction };
  }

  async function mergeContacts(survivorContactId: string, mergedContactId: string, operatorId?: string) {
    if (survivorContactId === mergedContactId) throw new Error('A contact cannot be merged into itself.');
    const now = new Date();
    const mergeLock = ulid(now.getTime());
    if (!await repository.acquireMergeLocks(survivorContactId, mergedContactId, mergeLock, now)) {
      throw new Error('One of these contacts is already being merged; retry after that merge completes.');
    }
    try {
      const [survivor, merged] = await Promise.all([repository.getContact(survivorContactId), repository.getContact(mergedContactId)]);
      if (!survivor || !merged) throw new Error('Both contacts must exist before they can be merged.');
      const emailStatus = mostRestrictive(survivor.emailStatus as ChannelStatus, merged.emailStatus as ChannelStatus);
      const smsStatus = mostRestrictive(survivor.smsStatus as ChannelStatus, merged.smsStatus as ChannelStatus);
      await repository.updateContact(survivor.id, {
        emailStatus,
        smsStatus,
        emailStatusAt: new Date(Math.max(survivor.emailStatusAt?.getTime() ?? 0, merged.emailStatusAt?.getTime() ?? 0)),
        smsStatusAt: new Date(Math.max(survivor.smsStatusAt?.getTime() ?? 0, merged.smsStatusAt?.getTime() ?? 0)),
        lastActivityAt: survivor.lastActivityAt || merged.lastActivityAt ? new Date(Math.max(survivor.lastActivityAt?.getTime() ?? 0, merged.lastActivityAt?.getTime() ?? 0)) : null,
        updatedAt: now,
      });
      await requiredDependencies().moveLifecycleData(merged.id, survivor.id);
      await requiredDependencies().store.moveSourceData(merged.id, survivor.id);
      await repository.moveContactData(merged.id, survivor.id, now, operatorId);
      await recordHistory(survivor.id, 'contact-merged', 'A duplicate contact was merged under the most restrictive channel states.', now);
      return repository.getContact(survivor.id);
    } finally {
      await repository.releaseMergeLocks([survivorContactId, mergedContactId], mergeLock, new Date());
    }
  }


  return {
    async importLocalDemo(contacts: LocalDemoContact[], now: Date) {
      for (const contact of contacts) {
        await repository.importLocalDemoContact({
          id: contact.id,
          email: contact.email,
          displayName: contact.displayName,
          emailStatus: contact.emailStatus,
          smsStatus: contact.smsStatus,
          emailStatusAt: now,
          smsStatusAt: now,
          sourceCustomerRecordId: null,
          lastActivityAt: now,
          createdAt: now,
          updatedAt: now,
        });
        for (const [index, event] of contact.history.entries()) {
          await repository.importLocalDemoHistory({
            id: `${contact.id}_history_${index + 1}`,
            contactId: contact.id,
            kind: event.kind,
            detail: event.detail,
            occurredAt: new Date(now.getTime() - (index + 1) * dayMs),
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    },

    async localDemoContacts(ids: string[]) {
      const contacts = await repository.listContactsById(ids);
      if (contacts.length !== ids.length) throw new Error('The local demo audience could not load every persisted contact.');
      return Promise.all(contacts.map(async (contact) => ({ contact, history: await repository.listHistory(contact.id) })));
    },

    list: () => repository.listContacts(),

    async detail(id: string) {
      const contact = await repository.getContact(id);
      if (!contact) return undefined;
      const [history, consent, suppressions, phones, emails] = await Promise.all([
        repository.listHistory(id), repository.listConsent(id), repository.listSuppressions(id), repository.listPhones(id), repository.listEmails(id),
      ]);
      const destinationSuppressions = await repository.listDestinationSuppressions(await Promise.all([...emails.map(value => value.email), ...phones.map(value => value.phoneE164)].map(hashDestination)));
      const visibleSuppressions = [...new Map([...suppressions, ...destinationSuppressions].map(value => [value.id, value])).values()].sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
      return { contact, history, consent, suppressions: visibleSuppressions, phones, emails, sourceActivity:await requiredDependencies().store.sourceActivities(id) };
    },

    ensureContact,
    captureConsent,
    canCapturePublicEmail,
    publicSignupState,
    recordPublicSignupRefusal,
    capturePublicSignup,
    previewConsentConfirmation,
    confirmConsent,
    issueUnsubscribeToken,
    issueMarketingUnsubscribe,
    previewUnsubscribeToken,
    unsubscribeWithToken,
    recordChannelOptOut: optOut,
    recordProviderSuppression,
    recordBounce,
    recordProviderDelivery,
    receiveSmsComplianceReply,
    search: (address: string, exact: boolean) => repository.searchContacts(address, exact),
    async previewMerge(survivorContactId: string, mergedContactId: string) {
      if (survivorContactId === mergedContactId) throw new Error('Choose another contact as the survivor.');
      const [survivor, merged] = await Promise.all([repository.getContact(survivorContactId),repository.getContact(mergedContactId)]);
      if (!survivor || !merged) throw new Error('Both contacts must exist before they can be merged.');
      return {survivor,merged,emailStatus:mostRestrictive(survivor.emailStatus as ChannelStatus,merged.emailStatus as ChannelStatus),smsStatus:mostRestrictive(survivor.smsStatus as ChannelStatus,merged.smsStatus as ChannelStatus)};
    },
    mergeContacts,
    async hasConfirmedEmailConsent(contactId: string) {
      return Boolean(await selectedChannel(repository, contactId, 'email', new Date(), async (channel, destination) => repository.hasDestinationSuppression(await hashDestination(destination), channel)));
    },
    recheckHandoffEligibility(input: Parameters<NonNullable<typeof eligibility>['recheckHandoffEligibility']>[0]) {
      return requiredDependencies() && eligibility!.recheckHandoffEligibility(input);
    },

    resolveFrozenCandidates(input: Parameters<NonNullable<typeof eligibility>['resolveFrozenCandidates']>[0]) {
      return requiredDependencies() && eligibility!.resolveFrozenCandidates(input);
    },

    async ingestCommerceWebhook(event: CommerceWebhookEvent, now = new Date(), fence?: SyncWriteFence) {
      if (!event.records.length && (event.completion !== 'full' || !event.adapterCompleted)) {
        await requiredDependencies().store.recordCommerceSyncFailure(event.sourceTypes, 'The accepted webhook carried no source records.', now);
        throw new Error('The accepted webhook carried no source records.');
      }
      const records = event.records;
      await requiredDependencies().store.ingestSuccessfulCommerceBatch(
        event.provider,
        records,
        event.completion,
        event.sourceTypes,
        event.adapterCompleted,
        now,
        fence,
        event.receipt,
        requiredDependencies().contactHashSalt,
      );
      return { accepted: records.length };
    },

    async recordCommerceFailure(sourceTypes: CommerceSourceType[], error: string, now = new Date()) {
      await requiredDependencies().store.recordCommerceSyncFailure(sourceTypes, error, now);
    },

    async getContactDispatchFacts(contactId: string, channel: Channel) {
      const contact = await repository.getContact(contactId);
      if (!contact) return undefined;
      const [emails, phones, evidence] = await Promise.all([repository.listEmails(contactId), repository.listPhones(contactId), repository.listConsent(contactId)]);
      const channelEvidence = evidence.find((entry) => entry.channel === channel);
      if (channel === 'email') return { contact, channel, destination: emails[0]?.email, consent: channelEvidence };
      return { contact, channel, destination: phones[0]?.phoneE164, phone: phones[0], consent: channelEvidence };
    },
  };
}

export type LocalDemoContact = {
  id: string;
  email: string;
  displayName: string;
  emailStatus: string;
  smsStatus: string;
  history: Array<{ kind: string; detail: string }>;
};

import { contactPersonalisation } from './contact-personalisation';
import {productCoverage,ruleCoverage,type CoverageStore} from './source-coverage';
import {commerceExclusions} from './commerce-exclusions';
import { productIdsFromRules, parseStructuredRules, type ExclusionRule, type FrozenCandidate, type InclusionRule } from '@/core/features/lifecycle';
import type { CommerceSourceType, createStoreService } from '@/core/features/store/service';

import type { Channel } from './service';
import type { createAudienceRepository } from './repository';

const dayMs = 24 * 60 * 60 * 1000;
const dormancyMs = 365 * dayMs;

type AudienceRepository = ReturnType<typeof createAudienceRepository>;
type Store = Pick<ReturnType<typeof createStoreService>, 'freshness' | 'sourceActivities' | 'sourceRecords'> & CoverageStore;
type Predicate = InclusionRule['predicates'][number];

function storeSourceType(sourceType: string): CommerceSourceType {
  return (sourceType === 'browsing' ? 'browsing-event' : sourceType) as CommerceSourceType;
}

function asRecord(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function fieldValue(payload: Record<string, unknown>, field: string, source: { sourceType: string; providerSourceId: string; occurredAt: Date }, activity?: { kind: string; productId: string | null; state: string }) {
  if (field === 'sourceType') return source.sourceType;
  if (field === 'providerSourceId') return source.providerSourceId;
  if (field === 'occurredAt') return source.occurredAt.toISOString();
  if (field.startsWith('activity.')) return activity?.[field.slice('activity.'.length) as keyof typeof activity];
  return field.split('.').reduce<unknown>((current, key) => (
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, unknown>)[key]
      : undefined
  ), payload);
}

function comparable(value: unknown) {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : undefined;
}

function matchesComparator(actual: unknown, comparator: Predicate['comparator'], expected: Predicate['value']) {
  const value = comparable(actual);
  if (value === undefined) return false;
  if (comparator === 'eq') return value === expected;
  if (comparator === 'neq') return value !== expected;
  if (comparator === 'contains') return typeof value === 'string' && typeof expected === 'string' && value.includes(expected);
  if (comparator === 'in') return Array.isArray(expected) && expected.includes(String(value));
  if (typeof value !== 'number' || typeof expected !== 'number') return false;
  if (comparator === 'gt') return value > expected;
  if (comparator === 'gte') return value >= expected;
  if (comparator === 'lt') return value < expected;
  if (comparator === 'lte') return value <= expected;
  return false;
}

async function predicateMatches(repository:AudienceRepository, store: Store, contactId: string, predicate: Predicate, now: Date, contact?: Record<string, unknown>) {
  if(predicate.sourceType==='campaign')return repository.followupMember(String(predicate.value),contactId);
  if (predicate.sourceType === 'contact') return matchesComparator(contact?.[predicate.field], predicate.comparator, predicate.value);
  const [records, activities] = await Promise.all([store.sourceRecords(contactId), store.sourceActivities(contactId)]);

  const earliest = predicate.lookbackDays === undefined ? undefined : now.getTime() - predicate.lookbackDays * dayMs;
  return records.some((source) => {
    if (source.sourceType !== storeSourceType(predicate.sourceType)) return false;
    const payload=asRecord(source.payload);
    const occurred=source.sourceType==='order'&&typeof payload.processedAt==='string'?Date.parse(payload.processedAt):source.occurredAt.getTime();
    if(occurred>now.getTime() || (earliest !== undefined && occurred < earliest)) return false;
    const related = activities.filter(activity => activity.sourceRecordId === source.id);
    return (related.length ? related : [undefined]).some(activity => matchesComparator(fieldValue(asRecord(source.payload), predicate.field, source, activity), predicate.comparator, predicate.value));
  });
}

async function matchingExclusions(repository:AudienceRepository, store: Store, contactId: string, exclusions: ExclusionRule[], now: Date, contact?: Record<string, unknown>) {
  const reasons:string[]=[];
  for (const exclusion of exclusions) {
    if (await predicateMatches(repository,store, contactId, exclusion.predicate, now, contact)) reasons.push(exclusion.reason);
  }
  return reasons;
}

async function selectedChannel(
  repository: AudienceRepository,
  contactId: string,
  channel: Channel,
  now: Date,
  isSuppressed: (channel: Channel, destination: string) => Promise<boolean>,
): Promise<FrozenCandidate['channels'][Channel] | undefined> {
  const contact = await repository.getContact(contactId);
  if (!contact || (channel === 'email' ? contact.emailStatus : contact.smsStatus) !== 'subscribed') return undefined;
  const [emails, phones, evidence] = await Promise.all([
    repository.listEmails(contactId),
    repository.listPhones(contactId),
    repository.listConsent(contactId),
  ]);
  if (channel === 'email') {
    const address = emails
      .filter((entry) => entry.channelStatus === 'subscribed')
      .sort((left, right) => (right.channelStatusAt?.getTime() ?? 0) - (left.channelStatusAt?.getTime() ?? 0))[0];
    if (!address || await isSuppressed('email', address.email)) return undefined;
    const consents = evidence
      .filter((entry) => entry.channel === 'email' && entry.destination === address.email && entry.confirmedAt && entry.confirmedAt <= now)
      .map((entry) => ({
        destination: entry.destination,
        brandOrLegalSender: entry.brandOrLegalSender,
        smsProgramme: entry.smsProgram ?? undefined,
        frequencyDisclosure: entry.frequencyDisclosure,
        category: entry.messageCategory,
        jurisdiction: entry.destinationJurisdiction,
      }));
    return consents.length ? { destination: address.email, consents } : undefined;
  }
  const phone = phones
    .filter((entry) => entry.identityStatus === 'active' && entry.channelStatus === 'subscribed')
    .sort((left, right) => (right.channelStatusAt?.getTime() ?? 0) - (left.channelStatusAt?.getTime() ?? 0))[0];
  if (!phone || await isSuppressed('sms', phone.phoneE164)) return undefined;
  const consents = evidence
    .filter((entry) => entry.channel === 'sms' && entry.destination === phone.phoneE164 && entry.confirmedAt && entry.confirmedAt <= now)
    .map((entry) => ({
      destination: entry.destination,
      brandOrLegalSender: entry.brandOrLegalSender,
      smsProgramme: entry.smsProgram ?? undefined,
        frequencyDisclosure: entry.frequencyDisclosure,
      category: entry.messageCategory,
      jurisdiction: entry.destinationJurisdiction,
    }));
  if (!consents.length) return undefined;
  // A telephone calling code is not an ISO jurisdiction (`+61` could not be
  // passed to a sender-registration check that expects `AU`). The consent
  // evidence is the legal destination scope and is therefore the authority.
  const country = consents
    .map((consent) => consent.jurisdiction.trim().toUpperCase())
    .find((jurisdiction) => /^[A-Z]{2}$/.test(jurisdiction));
  return {
    destination: phone.phoneE164,
    country,
    timeZone: phone.timeZone ?? undefined,
    timeZoneEvidenceAt: phone.locationRecordedAt ?? undefined,
    timeZoneEvidenceSource: phone.locationSource ?? undefined,
    consents,
  };
}

export function createAudienceEligibility(repository: AudienceRepository, store: Store, isSuppressed: (channel: Channel, destination: string) => Promise<boolean>) {
  async function recheckHandoffEligibility(input: {
    contactId: string;
    channel: Channel;
    sourceTypes: string[];
    productId?: string;
    productIds?: string[];
    inclusionRule?: InclusionRule;
    exclusionRules?: ExclusionRule[];
    lastMarketingAt?: Date;
    frequencyWindowMs?: number;
    now?: Date;
  }) {
    const now = input.now ?? new Date();
    const sourceGeneration=await repository.sourceGeneration();
    const products = input.productIds ?? (input.productId ? [input.productId] : []);
    const sourceTypes = [...new Set([...input.sourceTypes.map(storeSourceType), ...(products.length ? ['order','refund'] as const : [])])];
    const freshnessIssues = [...await store.freshness(sourceTypes, now), ...await productCoverage(store,products,now), ...(input.inclusionRule ? await ruleCoverage(store,input.inclusionRule,input.exclusionRules??[],now) : [])];
    const contact = await repository.getContact(input.contactId);
    if (!contact) return await repository.findMerge(input.contactId)
      ? {eligible:false as const,reason:'contact-merged',detail:'The approved contact was merged. This recipient is excluded; approval never transfers to another contact.'}
      : { eligible: false as const, reason: 'contact-erased', detail: 'The contact no longer exists.' };
    if (contact.mergeLock) return {eligible:false as const,reason:'contact-merging',detail:'The contact is being merged.'};
    const channelData = await selectedChannel(repository, contact.id, input.channel, now, isSuppressed);
    if (!channelData) return { eligible: false as const, reason: 'channel-not-subscribed', detail: 'Only a subscribed destination with confirmed consent is eligible for marketing.' };
    const lastActivity = await repository.lastQualifyingActivity(contact.id, now);
    if (!lastActivity || lastActivity.getTime() < now.getTime() - dormancyMs) {
      return { eligible: false as const, reason: 'dormant', detail: 'No click, order, or consent change was recorded in the dormancy window.' };
    }
    if (input.frequencyWindowMs && input.lastMarketingAt && now.getTime() - input.lastMarketingAt.getTime() < input.frequencyWindowMs) {
      return { eligible: false as const, reason: 'frequency-window', detail: 'The channel frequency window has not elapsed.' };
    }
    const commerceReasons = commerceExclusions(await store.sourceRecords(contact.id), products, now);
    if (commerceReasons.size) return {eligible:false as const,reason:[...commerceReasons][0],detail:'Recorded product purchase, return, or refund excludes this contact.'};
    if (freshnessIssues.length) {
      return {
        eligible: false as const,
        reason: freshnessIssues[0].reason,
        detail: freshnessIssues[0].detail,
        retryAt: new Date(now.getTime() + 60_000),
      };
    }
    // Frozen candidates are an upper bound, not continuing selection authority.
    // Re-evaluate every saved condition against current facts for every step and
    // handoff. Unavailable sources above must defer, never masquerade as a miss.
    const matches = input.inclusionRule
      ? await Promise.all(input.inclusionRule.predicates.map(predicate => predicateMatches(repository, store, contact.id, predicate, now, contact)))
      : undefined;
    const included = !matches || (input.inclusionRule!.operator === 'all' ? matches.every(Boolean) : matches.some(Boolean));
    const exclusions = await matchingExclusions(repository, store, contact.id, input.exclusionRules ?? [], now, contact);
    if(sourceGeneration!==await repository.sourceGeneration()) return {eligible:false as const,reason:'source-authority-changed',detail:'Store authority changed while eligibility was being checked.',retryAt:new Date(now.getTime()+60_000)};
    if (!included) return {
      eligible: false as const,
      reason: input.inclusionRule?.predicates.some(predicate => predicate.sourceType === 'campaign') ? 'followup-not-eligible' : 'audience-no-longer-matches',
      detail: 'This person is outside the saved audience conditions.',
    };
    if (exclusions.length) return {eligible: false as const, reason: exclusions[0], detail: 'This person now matches a saved audience exclusion.'};
    return {
      eligible: true as const,
      sourceGeneration,
      contact: {
        contactId: contact.id,
        destination: channelData.destination,
        country: channelData.country,
        timeZone: channelData.timeZone,
        timeZoneEvidenceAt: channelData.timeZoneEvidenceAt,
        timeZoneEvidenceSource: channelData.timeZoneEvidenceSource,
        personalisation: contactPersonalisation(contact, channelData.destination),
      },
    };
  }

  async function resolveFrozenCandidates(input: {
    inclusionRule: unknown;
    exclusionRules: unknown[];
    sourceTypes: string[];
    channels: Channel[];
    now: Date;
  }) {
    const parsed = parseStructuredRules(JSON.stringify(input.inclusionRule), JSON.stringify(input.exclusionRules));
    if (!parsed.ok) return { status: 'unavailable' as const, sourceTypes: [], detail: parsed.detail };
    for(const predicate of [...parsed.inclusion.predicates,...parsed.exclusions.map(rule=>rule.predicate)].filter(p=>p.sourceType==='campaign')) {
      if(!await repository.followupExists(String(predicate.value)))return {status:'unavailable' as const,sourceTypes:[],detail:'The saved follow-up audience is unavailable. Choose an existing source before review.'};
    }
    const products = productIdsFromRules(parsed.inclusion, parsed.exclusions);
    const requiredSources = [...new Set([...parsed.sourceTypes.map(storeSourceType), ...(products.length ? ['order','refund'] as const : [])])];
    const freshnessIssues = [...await store.freshness(requiredSources, input.now), ...await productCoverage(store,products,input.now), ...await ruleCoverage(store,parsed.inclusion,parsed.exclusions,input.now)];
    const contacts = await repository.listContacts();
    const counts = new Map<string, number>();
    const candidates: FrozenCandidate[] = [];
    let candidateCount = 0;
    const matchedContactIds:string[]=[];
    for (const contact of contacts) {
      const matches = await Promise.all(parsed.inclusion.predicates.map((predicate) => predicateMatches(repository,store, contact.id, predicate, input.now, contact)));
      const included = parsed.inclusion.operator === 'all' ? matches.every(Boolean) : matches.some(Boolean);
      if (!included) continue;
      candidateCount++;
      matchedContactIds.push(contact.id);
      const reasons = new Set(await matchingExclusions(repository,store, contact.id, parsed.exclusions, input.now, contact));
      const lastActivity = await repository.lastQualifyingActivity(contact.id, input.now);
      if (!lastActivity || lastActivity.getTime() < input.now.getTime() - dormancyMs) reasons.add('dormant');
      for (const reason of commerceExclusions(await store.sourceRecords(contact.id), products, input.now)) reasons.add(reason);
      if (contact.mergeLock) reasons.add('contact-merging');
      const channels = Object.fromEntries((await Promise.all(input.channels.map(async (channel) => [channel, await selectedChannel(repository, contact.id, channel, input.now, isSuppressed)] as const)))
        .filter((entry): entry is [Channel, NonNullable<FrozenCandidate['channels'][Channel]>] => Boolean(entry[1])));
      // Report every observed exclusion, including consent when another rule or
      // dormancy also excludes this contact. Reason counts may overlap.
      for(const channel of input.channels) if(!channels[channel]) {
        const status=channel==='email'?contact.emailStatus:contact.smsStatus;
        const reason=status==='subscribed'?`${channel}-consent-or-suppression`:`${channel}-${status}`;
        counts.set(reason,(counts.get(reason)??0)+1);
      }
      for(const reason of reasons) counts.set(reason,(counts.get(reason)??0)+1);
      if(reasons.size || !Object.keys(channels).length) continue;
      candidates.push({ contactId: contact.id, contactIdentityKey: contact.id, channels });
    }
    if (freshnessIssues.length) {
      const unavailable = freshnessIssues.filter((issue) => issue.reason === 'source-unavailable').map((issue) => issue.sourceType);
      return {
        observedExclusions: [...counts.entries()].map(([reason,count])=>({reason,count})),
        status: unavailable.length ? 'unavailable' as const : 'stale' as const,
        sourceTypes: [...new Set(freshnessIssues.map((issue) => issue.sourceType))],
        sourceIssues: freshnessIssues.map(({sourceType, reason}) => ({sourceType, reason})),
        detail: freshnessIssues.map((issue) => issue.detail).join(' '),
      };
    }
    return {
      status: 'ok' as const,
      candidateCount,
      matchedContactIds,
      asOf: input.now,
      candidates,
      exclusions: [...counts.entries()].map(([reason, count]) => ({ reason, count })),
    };
  }

  return { recheckHandoffEligibility, resolveFrozenCandidates };
}

import {flattenPredicates,predicateSourceTypes} from '@/core/features/lifecycle/rules';
import {createRuleMatcher} from './rule-matcher';
import {segmentAvailability} from './segment-availability';
import {readDormancyPolicy} from './dormancy-policy';
import { contactPersonalisation } from './contact-personalisation';
import {productCoverage,ruleCoverage,type CoverageStore} from './source-coverage';
import {commerceExclusions} from './commerce-exclusions';
import { productIdsFromRules, parseStructuredRules, type ExclusionRule, type FrozenCandidate, type InclusionRule } from '@/core/features/lifecycle';
import type { CommerceSourceType, createStoreService } from '@/core/features/store/service';

import type { Channel } from './service';
import type { createAudienceRepository } from './repository';

const dayMs = 24 * 60 * 60 * 1000;


type AudienceRepository = ReturnType<typeof createAudienceRepository>;
type Store = Pick<ReturnType<typeof createStoreService>, 'freshness' | 'sourceActivities' | 'sourceRecords'> & CoverageStore;

function storeSourceType(sourceType: string): CommerceSourceType {
  return (sourceType === 'browsing' ? 'browsing-event' : sourceType) as CommerceSourceType;
}

export async function selectedChannel(
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
  async function dormancy(contactId:string,now:Date,policyJson?:string) {
    const policy=readDormancyPolicy(policyJson),cutoff=now.getTime()-policy.windowDays*dayMs;
    const [last,history]=await Promise.all([repository.lastQualifyingActivity(contactId,now),repository.importedHistoryWindow(contactId,now,cutoff)]);
    const dormant=(!last||last.getTime()<cutoff)&&!history.noHistory;
    const openOnly=dormant&&history.importedOpens;
    return {dormant,noHistory:history.noHistory,openOnly,excluded:policy.enabled&&dormant&&!(policy.includeOpenOnly&&openOnly)};
  }
  async function recheckHandoffEligibility(input: {
    contactId: string;
    dormancyPolicyJson?: string;
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
    const matcher=createRuleMatcher(repository,store,now,(id,channel)=>selectedChannel(repository,id,channel,now,isSuppressed));
    const sourceGeneration=await repository.sourceGeneration();
    const products = input.productIds ?? (input.productId ? [input.productId] : []);
    const ruleSources=input.inclusionRule?[...flattenPredicates(input.inclusionRule),...(input.exclusionRules??[]).map(rule=>rule.predicate)].flatMap(predicateSourceTypes):[];
    const sourceTypes = [...new Set([...[...input.sourceTypes,...ruleSources].map(storeSourceType), ...(products.length ? ['order','refund'] as const : [])])];
    const freshnessIssues = [...await store.freshness(sourceTypes, now), ...await productCoverage(store,products,now), ...(input.inclusionRule ? [...await ruleCoverage(store,input.inclusionRule,input.exclusionRules??[],now),...await segmentAvailability(repository,input.inclusionRule,input.exclusionRules??[])] : [])];
    const contact = await repository.getContact(input.contactId);
    if (!contact) return await repository.findMerge(input.contactId)
      ? {eligible:false as const,reason:'contact-merged',detail:'The approved contact was merged. This recipient is excluded; approval never transfers to another contact.'}
      : { eligible: false as const, reason: 'contact-erased', detail: 'The contact no longer exists.' };
    if (contact.mergeLock) return {eligible:false as const,reason:'contact-merging',detail:'The contact is being merged.'};
    const channelData = await selectedChannel(repository, contact.id, input.channel, now, isSuppressed);
    if (!channelData) return { eligible: false as const, reason: 'channel-not-subscribed', detail: 'Only a subscribed destination with confirmed consent is eligible for marketing.' };
    if ((await dormancy(contact.id,now,input.dormancyPolicyJson)).excluded) {
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
    const included = !input.inclusionRule || await matcher.groupMatches(contact.id,input.inclusionRule,contact);
    const exclusions:string[]=[];
    for(const rule of input.exclusionRules??[])if(await matcher.predicateMatches(contact.id,rule.predicate,contact))exclusions.push(rule.reason);
    if(sourceGeneration!==await repository.sourceGeneration()) return {eligible:false as const,reason:'source-authority-changed',detail:'Store authority changed while eligibility was being checked.',retryAt:new Date(now.getTime()+60_000)};
    if (!included) return {
      eligible: false as const,
      reason: input.inclusionRule&&flattenPredicates(input.inclusionRule).some(predicate => predicate.sourceType === 'campaign') ? 'followup-not-eligible' : 'audience-no-longer-matches',
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
    dormancyPolicyJson?: string;
    inclusionRule: unknown;
    exclusionRules: unknown[];
    sourceTypes: string[];
    channels: Channel[];
    now: Date;
  }) {
    const parsed = parseStructuredRules(JSON.stringify(input.inclusionRule), JSON.stringify(input.exclusionRules));
    if (!parsed.ok) return { status: 'unavailable' as const, sourceTypes: [], detail: parsed.detail };
    for(const predicate of [...flattenPredicates(parsed.inclusion),...parsed.exclusions.map(rule=>rule.predicate)].filter(p=>p.sourceType==='campaign')) {
      if(!await repository.followupExists(String(predicate.value)))return {status:'unavailable' as const,sourceTypes:[],detail:'The saved follow-up audience is unavailable. Choose an existing source before review.'};
    }
    const products = productIdsFromRules(parsed.inclusion, parsed.exclusions);
    const requiredSources = [...new Set([...parsed.sourceTypes.map(storeSourceType), ...(products.length ? ['order','refund'] as const : [])])];
    const freshnessIssues = [...await store.freshness(requiredSources, input.now), ...await productCoverage(store,products,input.now), ...await ruleCoverage(store,parsed.inclusion,parsed.exclusions,input.now),...await segmentAvailability(repository,parsed.inclusion,parsed.exclusions)];
    const matcher=createRuleMatcher(repository,store,input.now,(id,channel)=>selectedChannel(repository,id,channel,input.now,isSuppressed));
    const contacts = await repository.listContacts();
    const counts = new Map<string, number>();
    const candidates: FrozenCandidate[] = [];
    let candidateCount = 0, openOnlyCount=0;
    const noHistoryContactIds:string[]=[],dormancyIncludedContactIds:string[]=[];
    const matchedContactIds:string[]=[];
    for (const contact of contacts) {
      const included = await matcher.groupMatches(contact.id,parsed.inclusion,contact);
      if (!included) continue;
      candidateCount++;
      matchedContactIds.push(contact.id);
      const reasons = new Set<string>();
      for(const rule of parsed.exclusions)if(await matcher.predicateMatches(contact.id,rule.predicate,contact))reasons.add(rule.reason);
      const inactivity=await dormancy(contact.id,input.now,input.dormancyPolicyJson);
      if(inactivity.excluded){reasons.add('dormant');if(inactivity.openOnly)openOnlyCount++;}
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
      if(inactivity.noHistory)noHistoryContactIds.push(contact.id);
      if(inactivity.dormant)dormancyIncludedContactIds.push(contact.id);
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
      noHistoryContactIds,dormancyIncludedContactIds,openOnlyCount,
      candidateCount,
      matchedContactIds,
      asOf: input.now,
      candidates,
      exclusions: [...counts.entries()].map(([reason, count]) => ({ reason, count })),
    };
  }

  return { recheckHandoffEligibility, resolveFrozenCandidates };
}

import { marketingFrequencyWindowMs } from './policies';
import { audienceMarketingHistory } from './audience-marketing-history';
import { parseStructuredRules, productIdsFromRules } from './rules';
import type { LifecycleRepository } from './repository';
import type { Channel, FrozenCandidate, LifecycleRuntime } from './types';

/** One eligibility calculation for saved segments, draft estimates and approval review. */
export async function evaluateAudience(runtime:LifecycleRuntime,_repository:LifecycleRepository,input:{inclusionRuleJson:string;exclusionRulesJson:string;channels:Channel[]},now:Date) {
  const parsedRules = parseStructuredRules(input.inclusionRuleJson, input.exclusionRulesJson);
  const selectedChannels = [...new Set(input.channels)];
  const audience = parsedRules.ok
    ? await runtime.audience.resolveFrozenCandidates({
        inclusionRule: parsedRules.inclusion,
        exclusionRules: parsedRules.exclusions,
        sourceTypes: parsedRules.sourceTypes,
        channels: selectedChannels,
        now,
      })
    : { status: 'unavailable' as const, sourceTypes: [], detail: parsedRules.detail };
  const candidates: FrozenCandidate[] = [];
  const personalisations=new Map<string,Record<string,string|null|undefined>>();
  const exclusionCounts = new Map(audience.status === 'ok'
    ? audience.exclusions.map((item) => [item.reason, item.count] as const)
    : ('observedExclusions' in audience ? audience.observedExclusions ?? [] : []).map(item=>[item.reason,item.count] as const));
  const blockingEligibility = new Set<string>();
  if (audience.status === 'ok' && parsedRules.ok) {
    const productIds = productIdsFromRules(parsedRules.inclusion, parsedRules.exclusions);
    const frequencyExcluded=new Set<string>();
    const matchedContactIds = audience.matchedContactIds ?? audience.candidates.map(c=>c.contactId);
    const history = await audienceMarketingHistory(runtime.platform.database,
      [...matchedContactIds, ...audience.candidates.map(candidate=>candidate.contactId)], selectedChannels);
    for(const contactId of matchedContactIds) {
      for(const channel of selectedChannels) {
        const last=history.get(`${contactId}:${channel}`);
        if(last&&audience.asOf.getTime()-last.getTime()<marketingFrequencyWindowMs(channel,runtime.platform.config))frequencyExcluded.add(contactId);
      }
    }
    if(frequencyExcluded.size) exclusionCounts.set('frequency-window',frequencyExcluded.size);
    // Bound concurrent rechecks, then consume them in the original candidate /
    // channel order so exclusions and failure precedence remain deterministic.
    for (let offset = 0; offset < audience.candidates.length; offset += 8) {
      const group = audience.candidates.slice(offset, offset + 8);
      const rechecks = await Promise.allSettled(group.flatMap(candidate => selectedChannels
        .filter(channel => candidate.channels[channel])
        .map(channel => runtime.audience.recheckHandoffEligibility({
          contactId: candidate.contactId,
          channel,
          sourceTypes: parsedRules.sourceTypes,
          productIds,
          inclusionRule:parsedRules.inclusion,
          exclusionRules:parsedRules.exclusions,
          now:audience.asOf,
          lastMarketingAt: history.get(`${candidate.contactId}:${channel}`),
          frequencyWindowMs: marketingFrequencyWindowMs(channel,runtime.platform.config),
        }))));
      let recheckIndex = 0;
      for (const candidate of group) {
        const contactReasons = new Set<string>();
        const channels: FrozenCandidate['channels'] = {};
        for (const channel of selectedChannels) {
          const frozenChannel = candidate.channels[channel];
          if (!frozenChannel) continue;
          const recheck = rechecks[recheckIndex++];
          if (recheck.status === 'rejected') throw recheck.reason;
          const eligibility = recheck.value;
          if (eligibility.eligible && eligibility.contact.destination === frozenChannel.destination) {
            channels[channel] = frozenChannel;
            personalisations.set(`${candidate.contactId}:${channel}`,eligibility.contact.personalisation??{});
            continue;
          }
          const reason = eligibility.eligible ? 'destination-changed' : eligibility.reason;
          if(reason!=='frequency-window')contactReasons.add(reason);
          if (reason.startsWith('source-')) blockingEligibility.add(reason);
        }
        for (const reason of contactReasons) exclusionCounts.set(reason, (exclusionCounts.get(reason) ?? 0) + 1);
        if (Object.keys(channels).length) candidates.push({ ...candidate, channels });
      }
    }
  }
  return {parsedRules,selectedChannels,audience,candidates,exclusionCounts,blockingEligibility,personalisations};
}

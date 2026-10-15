import { marketingFrequencyWindowMs } from './policies';
import { parseStructuredRules, productIdsFromRules } from './rules';
import type { LifecycleRepository } from './repository';
import type { Channel, FrozenCandidate, LifecycleRuntime } from './types';

/** One eligibility calculation for saved segments, draft estimates and approval review. */
export async function evaluateAudience(runtime:LifecycleRuntime,repository:LifecycleRepository,input:{inclusionRuleJson:string;exclusionRulesJson:string;channels:Channel[]},now:Date) {
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
    for(const contactId of audience.matchedContactIds ?? audience.candidates.map(c=>c.contactId)) {
      for(const channel of selectedChannels) {
        const last=await repository.lastMarketingAt(contactId,channel);
        if(last&&audience.asOf.getTime()-last.getTime()<marketingFrequencyWindowMs(channel,runtime.platform.config))frequencyExcluded.add(contactId);
      }
    }
    if(frequencyExcluded.size) exclusionCounts.set('frequency-window',frequencyExcluded.size);
    for (const candidate of audience.candidates) {
      const contactReasons = new Set<string>();
      const channels: FrozenCandidate['channels'] = {};
      for (const channel of selectedChannels) {
        const frozenChannel = candidate.channels[channel];
        if (!frozenChannel) continue;
        const eligibility = await runtime.audience.recheckHandoffEligibility({
          contactId: candidate.contactId,
          channel,
          sourceTypes: parsedRules.sourceTypes,
          productIds,
          inclusionRule:parsedRules.inclusion,
          exclusionRules:parsedRules.exclusions,
          now:audience.asOf,
          lastMarketingAt: await repository.lastMarketingAt(candidate.contactId, channel),
          frequencyWindowMs: marketingFrequencyWindowMs(channel,runtime.platform.config),
        });
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
  return {parsedRules,selectedChannels,audience,candidates,exclusionCounts,blockingEligibility,personalisations};
}

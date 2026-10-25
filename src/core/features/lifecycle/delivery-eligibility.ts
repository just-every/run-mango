import {inspectEmailHtml} from '@/core/features/campaigns/email-html-policy';
import {marketingFrequencyWindowMs} from './policies';
import {parseStructuredRules,productIdsFromRules} from './rules';
import type {LifecycleRepository} from './repository';
import type {LifecycleRuntime} from './types';

/** The same current source, consent and frequency view drives dispatch and ETA. */
export function recheckDeliveryEligibility(runtime:LifecycleRuntime,repository:LifecycleRepository,envelope:NonNullable<Awaited<ReturnType<LifecycleRepository['getDeliveryEnvelope']>>>,now:Date) {
  if(envelope.recipient.channel==='email'&&(!inspectEmailHtml(envelope.revision.emailBody).anchors.some(anchor=>anchor.href==='{{preferences_url}}'&&anchor.label)||!envelope.revision.emailText.includes('{{preferences_url}}')))return Promise.resolve({eligible:false as const,reason:'preferences-link-missing'});
  const rules=parseStructuredRules(envelope.inclusionRuleJson,envelope.exclusionRulesJson);
  return repository.lastMarketingAt(envelope.recipient.contactId,envelope.recipient.channel).then(lastMarketingAt=>runtime.audience.recheckHandoffEligibility({
    dormancyPolicyJson:envelope.dormancyPolicyJson,
    contactId:envelope.recipient.contactId,channel:envelope.recipient.channel,sourceTypes:envelope.sourceTypes,
    productIds:rules.ok?productIdsFromRules(rules.inclusion,rules.exclusions):undefined,
    inclusionRule:rules.ok?rules.inclusion:undefined,exclusionRules:rules.ok?rules.exclusions:undefined,
    now,lastMarketingAt,frequencyWindowMs:marketingFrequencyWindowMs(envelope.recipient.channel,runtime.platform.config),
  }));
}

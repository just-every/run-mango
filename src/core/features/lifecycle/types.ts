import type { InclusionRule, ExclusionRule } from './rules';
import type { Hono } from 'hono';

import type {
  Channel as PlatformChannel,
  DeliveryRequest as PlatformDeliveryRequest,
  JobDispatcher,
  Platform,
  ProviderFact as PlatformProviderFact,
  ProviderHandoff as PlatformProviderHandoff,
  QueueCommand,
  SenderAdapter,
  SenderCapabilities as PlatformSenderCapabilities,
} from '@/core/shared/platform';

export type Channel = PlatformChannel;
export type PersonalisationUsage = {channel: Channel; eligibleContactCount: number; fallbackContactCount: number};
export type TransportDisposition =
  | 'queued'
  | 'handoff-unknown'
  | 'handed-off'
  | 'accepted'
  | 'delivered'
  | 'bounced'
  | 'skipped'
  | 'failed';

export type FrozenCandidate = {
  contactId: string;
  contactIdentityKey: string;
  channels: Partial<Record<Channel, {
    destination: string;
    country?: string;
    timeZone?: string;
    timeZoneEvidenceAt?: Date;
    timeZoneEvidenceSource?: string;
    consents: Array<{
      destination: string;
      brandOrLegalSender: string;
      smsProgramme?: string;
      frequencyDisclosure?: string;
      category: string;
      jurisdiction: string;
    }>;
  }>>;
};

export type EligibilityResult =
  | { eligible: false; reason: string; retryAt?: Date }
  | {
      eligible: true;
      sourceGeneration: number;
      contact: {
        contactId: string;
        destination: string;
        timeZone?: string;
        timeZoneEvidenceAt?: Date;
        timeZoneEvidenceSource?: string;
        country?: string;
        consentScope?: string;
        personalisation?: Record<string, string | null | undefined>;
      };
    };

export interface LifecycleAudience {
  resolveFrozenCandidates(input: {
    dormancyPolicyJson?:string;
    inclusionRule: unknown;
    exclusionRules: unknown[];
    sourceTypes: string[];
    channels: Channel[];
    now: Date;
  }): Promise<
    | {
        status: 'ok';
        candidateCount?: number;
        matchedContactIds?: string[];
        noHistoryContactIds?:string[];dormancyIncludedContactIds?:string[];openOnlyCount?:number;
        asOf: Date;
        candidates: FrozenCandidate[];
        exclusions: Array<{ reason: string; count: number }>;
      }
    | { status: 'stale' | 'unavailable'; sourceTypes: string[]; detail: string; sourceIssues?: Array<{sourceType: string; reason: string}>; observedExclusions?: Array<{reason:string;count:number}> }
  >;
  recheckHandoffEligibility(input: {
    dormancyPolicyJson?:string;
    contactId: string;
    channel: Channel;
    sourceTypes: string[];
    productId?: string;
    productIds?: string[];
    inclusionRule?: InclusionRule;
    exclusionRules?: ExclusionRule[];
    now: Date;
    lastMarketingAt?: Date;
    frequencyWindowMs: number;
  }): Promise<EligibilityResult>;
  recordProviderSuppression(input: {
    destination: string;
    channel: Channel;
    cause: string;
    occurredAt: Date;
    providerEventId?: string;
  }): Promise<void>;
  issueMarketingUnsubscribe(input: {
    contactId: string;
    channel: Channel;
    recipientStepId: string;
    expiresAt: Date;
  }): Promise<{ token: string }>;
  recordChannelOptOut(input: {
    contactId?: string;
    destination?: string;
    channel: Channel;
    reason: string;
    occurredAt: Date;
    stableId?: string;
  }): Promise<void>;
  /** Counts toward the soft-bounce policy (CONT-006); replays of one provider event count once. */
  recordSoftBounce(input: { destination: string; occurredAt: Date; providerEventId: string }): Promise<void>;
  /** A provider-confirmed delivery to a Mango recipient resets the consecutive soft-bounce count. */
  recordProviderDelivery(input: { contactId: string; occurredAt: Date; providerEventId: string }): Promise<void>;
}

export type DeliveryRequest = PlatformDeliveryRequest;
export type ProviderHandoff = PlatformProviderHandoff;
export type ProviderFact = PlatformProviderFact;
export type SenderCapabilities = PlatformSenderCapabilities;
export type LifecycleSender = SenderAdapter;
export type LifecycleQueueCommand = QueueCommand;
export type LifecycleJobs = JobDispatcher;
export type LifecyclePlatform = Platform;

export type LifecycleRuntime = {
  synchronizeCommerce?: (payload: Record<string, unknown>) => Promise<unknown>;
  platform: LifecyclePlatform;
  audience: LifecycleAudience;
};

export type LifecycleApp = Hono<any>;

export type QueueMessage = {
  body: LifecycleQueueCommand;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
};

export type LifecycleQueueBatch = { messages: QueueMessage[] };

export type CampaignRevisionSnapshot = {
  revision: {
    dormancyPolicyJson?:string;
    id: string;
    campaignId: string;
    state: string;
    version: number;
    name: string;
    audienceRule: string;
    inclusionRuleJson: string;
    exclusionRulesJson: string;
    sourceTypesJson: string;
    emailSubject: string;
    emailBody: string;
    emailText: string;
    preheader: string;
    smsBody: string;
    senderName: string;
    fromEmail: string;
    replyToEmail: string;
    smsSender: string;
    physicalAddress: string;
    messageCategory: string;
    trackingEnabled: boolean;
    updatedAt: Date;
  };
  campaign: {
    id: string;
    state: string;
    activeRevisionId: string | null;
    updatedAt: Date;
  };
  steps: Array<{
    id: string;
    channel: Channel;
    sequence: number;
    timezone: string;
    scheduledAt: Date;
    sendByAt: Date;
    whyThisTime: string;
  }>;
  links: Array<{ id: string; label: string; destinationUrl: string; sequence: number }>;
};

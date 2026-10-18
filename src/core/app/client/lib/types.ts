import type { CampaignResults } from '@/core/features/campaigns/result-model';
export type Channel = 'email' | 'sms';

export type Provider = {
  id: string;
  adapter: string;
  configured: boolean;
  status: string;
  detail: string;
  updatedAt: string;
};

export type SourceSync = {
  id: string;
  sourceType: string;
  lastSuccessfulAt: string | null;
  lastError: string | null;
  updatedAt: string | null;
};

export type Audience = {
  id: string;
  revisionId: string;
  asOfAt: string;
  candidateCount: number;
  excludedCount: number;
  eligibleCount: number;
};

export type AudienceChannelCount = {
  id: string;
  audienceId: string;
  channel: Channel;
  recipientStepCount: number;
  eligibleContactCount?: number | null;
  fallbackContactCount?: number | null;
};

export type Campaign = {
  id: string;
  proposalId: string | null;
  state: string;
  activeRevisionId: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Revision = {
  trackingEnabled?: boolean;
  stepSettings?: Array<{channel:'email'|'sms';timezone:string;whyThisTime:string}>;
  inclusionRuleJson: string;
  exclusionRulesJson: string;
  messageCategory: string;
  id: string;
  campaignId: string;
  version: number;
  state: string;
  name: string;
  emailSubject: string;
  emailBody: string;
  emailText: string;
  preheader: string;
  physicalAddress: string;
  smsBody: string;
  senderName: string;
  fromEmail: string;
  audienceRule: string;
  replyToEmail: string;
  smsSender: string;
  createdAt: string;
  updatedAt: string;
};

export type Step = {
  claimsUnavailable?: string;
  id: string;
  revisionId: string;
  sequence: number;
  channel: Channel;
  timezone: string;
  scheduledAt: string;
  sendByAt: string;
  whyThisTime: string;
};

export type ProposalStep = Omit<Step, 'revisionId' | 'whyThisTime'> & {
  proposalId: string;
  whyThisTime?: string;
};

export type RevisionLink = {
  id: string;
  revisionId: string;
  sequence: number;
  label: string;
  destinationUrl: string;
};

export type Check = {
  findingIdentity?: string;
  acknowledgement?: {operatorId: string; acknowledgedAt: string};
  id: string;
  kind: string;
  status: string;
  detail: string;
  blocking: boolean;
};

export type CampaignDetail = {
  smsPreview?: import('@/core/features/sms/review-preview').SmsReviewPreview;
  scheduler?: import('@/core/features/lifecycle/scheduler-observation').SchedulerObservation;
  results?: CampaignResults;
  uncertainDeliveries?: Array<{id:string;destination:string;providerMessageId:string|null;detail:string}>;
  campaign: Campaign;
  revision?: Revision;
  steps: Step[];
  links: RevisionLink[];
  audience?: Audience;
  audienceChannelCounts: AudienceChannelCount[];
  audienceState: 'saved' | 'needs_recomputation';
  checks?: Check[];
  /** The deployment's own origin, where its campaign images are served (CAMP-012). */
  mediaOrigin: string;
};

export type Proposal = {
  id: string;
  state: string;
  title: string;
  summary: string;
  evidence: string;
  audienceRule: string;
  inclusionRuleJson: string;
  exclusionRulesJson: string;
  lookbackStartAt?: string | null;
  triggerEventsJson?: string;
  sourceDataAsOf: string;
  sendByAt: string;
  campaignId: string | null;
};

export type Exclusion = { id: string; reason: string; count: number };

export type ProposalEntry = {
  claimsUnavailable?: string;
  evidenceItems?: Array<{key:string;sourceRecordId:string;sourceType:string;observedValue:unknown;occurredAt:string}>;
  history?: Array<{fromState:string;toState:string;actorId:string;reason:string|null;occurredAt:string}>;
  explanation?:string;
  forecast?:{status:string;valueMinor?:number|null;currency?:string|null;method:string;campaignIds?:string[];sourceEventIds?:string[];sampleSize?:number;campaignCount?:number;eventCount?:number;historicalNetRevenueMinor?:number|null;proposedRecipientSteps?:number;asOf?:string};
  composition?:{revision?:Revision;links:RevisionLink[]};
  proposal: Proposal;
  exclusions: Exclusion[];
  steps: ProposalStep[];
  audience?: Audience;
  audienceChannelCounts: AudienceChannelCount[];
};

export type ApprovalBlocker = {
  kind: string;
  status: string;
  detail: string;
  blocking: boolean;
};

export type ProposalDecision = {proposalId:string;title:string;state:string;actorId:string;reason:string|null;occurredAt:string};

export type DecisionDesk = {
  recentDecisions?:ProposalDecision[];
  policy?:{id:string;detail:string};
  sourceStatus: { providers: Provider[]; sourceSyncs: SourceSync[] };
  proposals: ProposalEntry[];
};

export type Contact = {
  id: string;
  email: string | null;
  displayName: string;
  emailStatus: string;
  smsStatus: string;
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactHistory = {
  id: string;
  contactId: string;
  kind: string;
  detail: string;
  occurredAt: string;
};

export type Insight = {
  id: string;
  campaignId: string;
  metric: string;
  value: number;
  observedAt: string;
  source: string;
};

export type CampaignListEntry = Campaign & { name:string|null; channels:Channel[]; audienceSummary:string; nextScheduledAt:string|null; lastOutcomeAt:string|null; lastOutcome:string|null; lastSkipReason:string|null };
export type CampaignCollection = { campaigns:CampaignListEntry[]; total:number; smsEnabled:boolean; commerceEnabled:boolean; aiEnabled:boolean; marketingConnectionRequired:boolean; timezone:string;
  counts:{allStates:number;allChannels:number;states:Record<string,number>;channels:Record<Channel,number>} };

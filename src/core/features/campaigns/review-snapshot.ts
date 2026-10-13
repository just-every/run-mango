import { parseStructuredRules } from '../lifecycle/rules';

export type ReviewSnapshotState = 'saved' | 'needs_recomputation';

type CampaignRevisionForReview = {
  name: string;
  audienceRule: string;
  inclusionRuleJson: string;
  exclusionRulesJson: string;
  emailSubject: string;
  emailBody: string;
  emailText: string;
  smsBody: string;
  senderName: string;
  fromEmail: string;
  replyToEmail: string;
  smsSender: string;
};

type CampaignStepForReview = { channel: string; whyThisTime: string };
type ProposalStepForReview = { channel: string };
type ChannelCount = { channel: string };

type VisibleReviewSnapshot<TAudience, TCount extends ChannelCount> = {
  audience: TAudience;
  audienceChannelCounts: TCount[];
  audienceState: 'saved';
};

type IncompleteReviewSnapshot<TCount extends ChannelCount> = {
  audience: undefined;
  audienceChannelCounts: TCount[];
  audienceState: 'needs_recomputation';
};

type ReviewSnapshot<TAudience, TCount extends ChannelCount> =
  | VisibleReviewSnapshot<TAudience, TCount>
  | IncompleteReviewSnapshot<TCount>;

function hasText(value: string) {
  return value.trim().length > 0;
}

function hasCompleteChannelCounts(
  steps: ReadonlyArray<{ channel: string }>,
  counts: ReadonlyArray<ChannelCount>,
) {
  const selectedChannels = new Set(steps.map((step) => step.channel));
  if (selectedChannels.size === 0) return false;

  const countedChannels = new Set(counts.map((count) => count.channel));
  return (
    countedChannels.size === selectedChannels.size &&
    [...selectedChannels].every((channel) => countedChannels.has(channel))
  );
}

function exposeCompleteSnapshot<TAudience, TCount extends ChannelCount>(
  complete: boolean,
  audience: TAudience | undefined,
  audienceChannelCounts: TCount[],
): ReviewSnapshot<TAudience, TCount> {
  if (complete && audience) {
    return { audience, audienceChannelCounts, audienceState: 'saved' };
  }
  return { audience: undefined, audienceChannelCounts: [], audienceState: 'needs_recomputation' };
}

export function campaignReviewSnapshot<TAudience, TCount extends ChannelCount>(
  revision: CampaignRevisionForReview,
  steps: ReadonlyArray<CampaignStepForReview>,
  audience: TAudience | undefined,
  audienceChannelCounts: TCount[],
): ReviewSnapshot<TAudience, TCount> {
  const rules = parseStructuredRules(revision.inclusionRuleJson, revision.exclusionRulesJson);
  const validRules = rules.ok;
  const complete =
    hasText(revision.name) && validRules &&
    (!steps.some(step => step.channel === 'email') || ['emailSubject', 'emailBody', 'emailText', 'senderName', 'fromEmail', 'replyToEmail'].every(field => hasText(revision[field as keyof CampaignRevisionForReview]))) &&
    (!steps.some(step => step.channel === 'sms') || (hasText(revision.smsBody) && hasText(revision.smsSender))) &&
    steps.every((step) => hasText(step.whyThisTime)) &&
    hasCompleteChannelCounts(steps, audienceChannelCounts);
  return exposeCompleteSnapshot(complete, audience, audienceChannelCounts);
}

export function proposalReviewSnapshot<TAudience, TCount extends ChannelCount>(
  steps: ReadonlyArray<ProposalStepForReview>,
  audience: TAudience | undefined,
  audienceChannelCounts: TCount[],
): ReviewSnapshot<TAudience, TCount> {
  return exposeCompleteSnapshot(
    hasCompleteChannelCounts(steps, audienceChannelCounts),
    audience,
    audienceChannelCounts,
  );
}

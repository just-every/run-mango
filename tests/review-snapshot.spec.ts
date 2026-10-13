import { draftCompositionSchema } from '@/core/features/campaigns/draft-composition';
import { expect, test } from '@playwright/test';

import {
  campaignReviewSnapshot,
  proposalReviewSnapshot,
} from '@/core/features/campaigns/review-snapshot';
import { deriveDemoAudienceSnapshot } from '@/core/features/campaigns/demo-audience-snapshot';

const completeRevision = {
  name: 'Linen table runner follow-up',
  audienceRule: 'Saved a linen table runner and did not purchase it.',
  inclusionRuleJson: JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'browsing',field:'savedProduct',comparator:'eq',value:true,lookbackDays:30}]}),
  exclusionRulesJson: '[]',
  emailSubject: 'Your saved linen table runner',
  emailBody: '<p>Your saved linen table runner is still available.</p>',
  emailText: 'Your saved linen table runner is still available.',
  smsBody: 'Your saved linen table runner is still available. Reply STOP to unsubscribe.',
  senderName: 'Mango sample store',
  fromEmail: 'offers@example.test',
  replyToEmail: 'care@example.test',
  smsSender: 'MangoStore',
};

const v4Audience = { candidateCount: 3, excludedCount: 1, eligibleCount: 2 };
const v4Counts = [
  { channel: 'email', recipientStepCount: 2 },
  { channel: 'sms', recipientStepCount: 1 },
];

test.describe('review snapshot completeness', () => {
  test('hides a v1-shaped campaign snapshot with required composition defaults', () => {
    const snapshot = campaignReviewSnapshot(
      { ...completeRevision, audienceRule: '', replyToEmail: '', smsSender: '' },
      [
        { channel: 'email', whyThisTime: '' },
        { channel: 'sms', whyThisTime: '' },
      ],
      { candidateCount: 186, excludedCount: 23, eligibleCount: 163 },
      [],
    );

    expect(snapshot).toEqual({
      audience: undefined,
      audienceChannelCounts: [],
      audienceState: 'needs_recomputation',
    });
  });

  test('does not borrow campaign counts for a legacy proposal', () => {
    const snapshot = proposalReviewSnapshot(
      [{ channel: 'email' }, { channel: 'sms' }],
      undefined,
      [],
    );

    expect(snapshot).toEqual({
      audience: undefined,
      audienceChannelCounts: [],
      audienceState: 'needs_recomputation',
    });
  });

  test('keeps the v4 review snapshot with exact proposal-owned channel counts', () => {
    const snapshot = proposalReviewSnapshot(
      [{ channel: 'email' }, { channel: 'sms' }],
      v4Audience,
      v4Counts,
    );

    expect(snapshot).toEqual({
      audience: v4Audience,
      audienceChannelCounts: v4Counts,
      audienceState: 'saved',
    });
  });

  test('treats an explicit zero recipient-step count as a saved channel snapshot', () => {
    const derived = deriveDemoAudienceSnapshot(
      [
        {
          contact: { emailStatus: 'subscribed', smsStatus: 'non-subscribed' },
          history: [{ kind: 'saved-product' }],
        },
      ],
      'saved-product',
      [{ channel: 'sms' }],
    );
    const snapshot = campaignReviewSnapshot(
      completeRevision,
      [{ channel: 'sms', whyThisTime: 'A reviewed SMS time.' }],
      {
        candidateCount: derived.candidateCount,
        excludedCount: derived.excludedCount,
        eligibleCount: derived.eligibleCount,
      },
      derived.channelCounts,
    );

    expect(snapshot).toEqual({
      audience: { candidateCount: 1, excludedCount: 1, eligibleCount: 0 },
      audienceChannelCounts: [{ channel: 'sms', recipientStepCount: 0 }],
      audienceState: 'saved',
    });
  });
});

test('email-only review does not require unused SMS content or sender', () => {
  expect(campaignReviewSnapshot({...completeRevision, smsBody: '', smsSender: ''}, [{channel: 'email', whyThisTime: 'Reviewed instant'}], v4Audience, [{channel: 'email', recipientStepCount: 2}]).audienceState).toBe('saved');
});

// Draft storage may retain an empty unused channel; approval enforces selected-channel completeness.
test('email-only draft accepts empty SMS content without fabricating a sender', () => {
  expect(draftCompositionSchema.safeParse({...completeRevision, smsBody: '', smsSender: ''}).success).toBe(true);
  expect(draftCompositionSchema.safeParse({fromEmail: 'not-an-email'}).success).toBe(false);
});
test('SMS-only draft accepts empty email fields but rejects malformed populated addresses', () => {
  expect(draftCompositionSchema.safeParse({smsBody: 'Offer. Reply STOP.', smsSender: 'Store', emailSubject: '', emailBody: '', emailText: '', senderName: '', fromEmail: '', replyToEmail: ''}).success).toBe(true);
});

export type DemoAudienceContact = {
  contact: { emailStatus: string; smsStatus: string };
  history: Array<{ kind: string }>;
};

export type DemoAudienceSnapshot = {
  candidateCount: number;
  excludedCount: number;
  eligibleCount: number;
  exclusions: Array<{ reason: string; count: number }>;
  channelCounts: Array<{ channel: 'email' | 'sms'; recipientStepCount: number }>;
};

export function deriveDemoAudienceSnapshot(
  contacts: DemoAudienceContact[],
  candidateHistoryKind: string,
  steps: ReadonlyArray<{ channel: 'email' | 'sms' }>,
): DemoAudienceSnapshot {
  const candidates = contacts.filter((entry) =>
    entry.history.some((event) => event.kind === candidateHistoryKind),
  );
  const eligibleCount = candidates.filter((entry) =>
    steps.some((step) =>
      step.channel === 'email'
        ? entry.contact.emailStatus === 'subscribed'
        : entry.contact.smsStatus === 'subscribed',
    ),
  ).length;
  const channelCounts = (['email', 'sms'] as const).flatMap((channel) => {
    if (!steps.some((step) => step.channel === channel)) return [];
    const recipientStepCount = steps
      .filter((step) => step.channel === channel)
      .reduce(
        (count, _step) =>
          count +
          candidates.filter((entry) =>
            channel === 'email'
              ? entry.contact.emailStatus === 'subscribed'
              : entry.contact.smsStatus === 'subscribed',
          ).length,
        0,
      );
    return [{ channel, recipientStepCount }];
  });
  const excludedCount = candidates.length - eligibleCount;

  return {
    candidateCount: candidates.length,
    excludedCount,
    eligibleCount,
    exclusions: excludedCount ? [{ reason: 'no-eligible-channel', count: excludedCount }] : [],
    channelCounts,
  };
}

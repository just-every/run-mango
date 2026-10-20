import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { inspectRevisionLinks } from './link-checks';
import { unavailableInspection } from '@/core/features/sender-verification/service';
import type { CampaignRevisionSnapshot, LifecyclePlatform } from './types';

/** Live checks that do not depend on the evaluated recipient set. */
export async function prepareApprovalChecks(snapshot: CampaignRevisionSnapshot, platform: LifecyclePlatform) {
  await loadSenderSettings(platform);
  const results = Promise.allSettled([
    Promise.all([
      platform.mailer.capabilities(),
      snapshot.steps.some(step => step.channel === 'email')
        ? platform.mailer.inspectSender?.(`${snapshot.revision.senderName} <${snapshot.revision.fromEmail}>`)
          ?? Promise.resolve(unavailableInspection('verification-not-configured'))
        : undefined,
    ]),
    inspectRevisionLinks(snapshot, platform),
  ]);
  return {results};
}

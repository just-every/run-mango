import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { loadLinkHosts } from '@/core/features/settings/link-hosts';
import { inspectEmailHtml } from '@/core/features/campaigns/email-html-policy';
import { inspectOwnMedia, ownMediaName } from '@/core/features/campaign-assets/own-media';
import { unavailableInspection } from '@/core/features/sender-verification/service';
import type { CampaignRevisionSnapshot, LifecyclePlatform } from './types';

/** Live checks that do not depend on the evaluated recipient set. */
export async function prepareApprovalChecks(snapshot: CampaignRevisionSnapshot, platform: LifecyclePlatform) {
  const settings = await Promise.allSettled([loadSenderSettings(platform), loadLinkHosts(platform)]);
  for (const result of settings) if (result.status === 'rejected') throw result.reason;
  const destinations = new Set(snapshot.links.map(link => link.destinationUrl));
  for (const destination of inspectEmailHtml(snapshot.revision.emailBody).destinations) destinations.add(destination);
  const authored = `${snapshot.revision.emailBody}\n${snapshot.revision.emailText}\n${snapshot.revision.smsBody}`;
  for (const match of authored.matchAll(/\bhttps?:\/\/[^\s<>"']+/gi)) destinations.add(match[0].replace(/[),.;]+$/, ''));
  const results = Promise.allSettled([
    Promise.all([
      platform.mailer.capabilities(),
      snapshot.steps.some(step => step.channel === 'email')
        ? platform.mailer.inspectSender?.(`${snapshot.revision.senderName} <${snapshot.revision.fromEmail}>`)
          ?? Promise.resolve(unavailableInspection('verification-not-configured'))
        : undefined,
    ]),
    Promise.all([...destinations].map(async destination => {
      const ownMedia = ownMediaName(destination, platform.config.publicBaseUrl);
      return {destination, inspection: ownMedia
        ? await inspectOwnMedia(platform.database.$client, platform.blobs, ownMedia)
        : await platform.linkInspector.inspect(destination)};
    })),
  ]);
  return {results};
}

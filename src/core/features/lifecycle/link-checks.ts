import {liveCatalogValues} from '@/core/features/campaigns/catalog-values';
import {catalogBlocks,insertCatalogHtml,catalogTextValues} from '@/core/features/campaigns/catalog-blocks';
import { textLinkDestinations } from '@/core/features/campaigns/message-links';
import { contactLink } from '@/core/features/campaigns/contact-links';
import { inspectEmailHtml } from '@/core/features/campaigns/email-html-policy';
import { inspectOwnMedia, ownMediaName } from '@/core/features/campaign-assets/own-media';
import { loadLinkHosts } from '@/core/features/settings/link-hosts';
import type { LinkInspection } from '@/core/shared/platform';
import type { LifecyclePlatform } from './types';

export type LinkCheckInput = {
  revision: {emailBody: string; emailText: string; smsBody: string};
  links: ReadonlyArray<{destinationUrl: string}>;
};

export function blockedLinkHosts(destinations: Array<{destination: string; inspection: LinkInspection}>) {
  const hosts = new Map<string, Set<string>>();
  for (const {destination, inspection} of destinations) if (!inspection.ok && inspection.blockedHost) {
    const links = hosts.get(inspection.blockedHost) ?? new Set<string>();
    links.add(destination);
    hosts.set(inspection.blockedHost, links);
  }
  return [...hosts].map(([host, links]) => ({host, links: [...links]}));
}

/** Review, approval and test-send inspect the same transmitted destinations. */
export async function inspectRevisionLinks(snapshot: LinkCheckInput, platform: LifecyclePlatform) {
  await loadLinkHosts(platform);
  if(catalogBlocks(snapshot.revision.emailBody).length){try{const values=await liveCatalogValues(platform,snapshot.revision.emailBody);snapshot={...snapshot,revision:{...snapshot.revision,emailBody:insertCatalogHtml(snapshot.revision.emailBody,values),emailText:catalogTextValues(snapshot.revision.emailText,values)}};const issues=inspectEmailHtml(snapshot.revision.emailBody).issues;if(issues.length)return [{destination:'Chosen catalog presentation',inspection:{ok:false,detail:issues.join(' ')}}];}catch{return [{destination:'Chosen catalog products',inspection:{ok:false,detail:'The chosen catalog values could not be read.'}}];}}
  const destinations = new Set(snapshot.links.map(link => link.destinationUrl));
  for (const destination of inspectEmailHtml(snapshot.revision.emailBody).destinations) destinations.add(destination);
  const authored = `${snapshot.revision.emailBody}\n${snapshot.revision.emailText}\n${snapshot.revision.smsBody}`;
  for (const destination of textLinkDestinations(authored)) destinations.add(destination);
  return Promise.all([...destinations].map(async destination => {
    const ownMedia = ownMediaName(destination, platform.config.publicBaseUrl);
    return {destination, inspection: contactLink(destination)
      ? {ok: true, detail: 'Validated contact link; no host or network inspection required.'}
      : ownMedia
      ? await inspectOwnMedia(platform.database.$client, platform.blobs, ownMedia)
      : await platform.linkInspector.inspect(destination)};
  }));
}

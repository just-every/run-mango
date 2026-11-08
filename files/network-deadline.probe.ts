import { test } from '@playwright/test';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve } from './harness';

test('[MSG-006] synthetic shop link approval tolerates an unavailable external test edge', async () => {
  const edge = await providerEdge(), site = await installation(edge, eventSigner());
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    await site.control('/_golive/sender-evidence');
    await confirmedContact(site, edge, cookie, 'deadline-reader@example.test', 'Garden reader');
    await json(await site.call('/api/settings/link-hosts', {method: 'PUT', cookie, body: {hosts: 'shop.example.test'}}), 200);
    const clock = await site.control('/_golive/clock', {hold: true});
    const campaign = await draftCampaign(site, cookie, 'Synthetic network deadline', ['deadline-reader@example.test'], new Date(clock.now + 3600000));
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method: 'PATCH', cookie,
      body: {emailBody: '<p><a href="https://shop.example.test/market">Garden market</a></p>'}}), 200);
    await approve(site, cookie, campaign);
  } finally {await site.runtime.close();await edge.close();}
});

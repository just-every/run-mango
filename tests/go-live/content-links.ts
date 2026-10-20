import { expect, type Page, type TestInfo } from '@playwright/test';
import { json, draftCampaign, type Installation } from './harness';
import { openPage } from '../support/navigation';

export const linkNetwork = {
  'https://via.example/start': {location:'https://landing.example/offer'},
};

const schemeLinks = [
  ['http:', 'http://plain.example/offer'],
  ['javascript:', 'javascript:alert(1)'],
  ['data:', 'data:text/html,hello'],
  ['file:', 'file:///etc/passwd'],
] as const;

/** MSG-006: review names every blocked link with the scheme or host that blocks it; only a host can be allowed. */
export async function linkRulesJourney(site: Installation, owner: string, page: Page, info: TestInfo, now: number) {
  await json(await site.call('/api/settings/link-hosts',{method:'PUT',cookie:owner,body:{hosts:'mango.example.test,via.example'}}),200);
  const campaign = await draftCampaign(site,owner,'Link rules',['garden-reader@example.test'],new Date(now+7200000));
  const links = [...schemeLinks.map(([scheme,destinationUrl]) => ({label:`Link ${scheme}`,destinationUrl})),
    {label:'Redirecting link',destinationUrl:'https://via.example/start'},
    {label:'Email us',destinationUrl:'mailto:hello@example.test'},{label:'Call us',destinationUrl:'tel:+14155550100'}];
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie:owner,body:{links,
    emailBody:'<p><a href="https://">Empty address</a> <a href="mailto:hello@example.test">Email us</a> <a href="tel:+14155550100">Call us</a></p><p><img src="http://images.example/leaf.png" width="100" height="100" alt="Leaf"> <img src="https://pics.example/hero.png" width="100" height="100" alt="Hero"></p>'}}),200);
  await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}}),200);
  const detail = await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie:owner}),200);
  const text = (kind:string) => detail.checks.find((check:any) => check.kind === kind).detail as string;
  const direct = text('message.links');
  expect(direct).toContain('https:// (is malformed');
  for (const [scheme,destination] of schemeLinks) expect(direct).toContain(`${destination} (uses the ${scheme} scheme`);
  expect(direct).not.toContain('mailto:hello@example.test');
  expect(direct).not.toContain('tel:+14155550100');
  expect(text('message.links.resolved')).toContain('https://via.example/start (Link redirects to host landing.example, which is not allowed.)');
  expect(text('message.content')).toContain('Image source http://images.example/leaf.png uses the http: scheme; image sources must use HTTPS.');
  expect(direct).toContain('Blocked images: https://pics.example/hero.png (uses host pics.example, which is not on the allowed list)');
  const review = await json(await site.call(`/api/campaigns/${campaign.campaignId}/review`,{cookie:owner}),200);
  // Schemes and malformed links never offer an allow action; only unlisted HTTPS hosts do, here the redirect's and the image's.
  expect(review.blockedHosts.map((entry:any) => entry.host).sort()).toEqual(['landing.example','pics.example']);
  await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId,idempotencyKey:'link-rules-blocked-approval'}}),409);
  await page.context().clearCookies();
  await page.context().addCookies([{name:owner.split('=')[0],value:owner.split('=')[1],url:site.runtime.url}]);
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    const panel = page.locator('.approval-checks');
    for (const [scheme,destination] of schemeLinks) await expect(panel).toContainText(`${destination} (uses the ${scheme} scheme`);
    await expect(panel).toContainText('Image source http://images.example/leaf.png uses the http: scheme');
    await expect(page.locator('[aria-label^="Blocked host "]')).toHaveCount(2);
    for (const host of ['landing.example','pics.example']) await expect(page.locator(`[aria-label="Blocked host ${host}"]`).getByRole('button',{name:'Allow this host',exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Allow this host',exact:true})).toHaveCount(2);
    await panel.screenshot({path:info.outputPath(`link-rules-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
}

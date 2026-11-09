import { expect, type Page, type TestInfo } from '@playwright/test';
import { json, draftCampaign, type Installation } from './harness';
import { openPage } from '../support/navigation';
import { png } from '../support/images';

export const linkNetwork = {
  'https://via.example/start': {location:'https://landing.example/offer'},
  'https://landing.example/offer': {},
  'https://pics.example/hero.png': {},
  'https://via.example/insecure': {location:'http://via.example/offer'},
  'https://via.example/private': {location:'https://127.0.0.1/offer'},
  'https://via.example/unreachable': {status:503},
  'https://via.example/missing-location': {status:302},
  'https://via.example/loop': {location:'https://via.example/loop'},
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
  for (const width of [1440]) {
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
  // A real review allowance removes only the host fault, never the other safety findings.
  for (const host of ['landing.example','pics.example','127.0.0.1','unresolved-review.example.test','private.mcusercontent.com']) {
    await json(await site.call(`/api/campaigns/${campaign.campaignId}/link-hosts`,{method:'POST',cookie:owner,body:{host}}),200);
  }
  const allowed = await json(await site.call(`/api/campaigns/${campaign.campaignId}/review`,{cookie:owner}),200);
  expect(allowed.blockedHosts).toEqual([]);
  expect(allowed.checks.find((check:any)=>check.kind==='message.content')).toMatchObject({blocking:true});
  expect(allowed.checks.find((check:any)=>check.kind==='message.links').detail).toContain('https:// (is malformed');
  for (const [scheme,destination] of schemeLinks) expect(allowed.checks.find((check:any)=>check.kind==='message.links').detail).toContain(`${destination} (uses the ${scheme} scheme`);
  await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId,idempotencyKey:'synthetic-mango-169'}}),409);
  const unsafe = [
    ['https://via.example/insecure','the http: scheme'],
    ['https://via.example/private','private-network address'],
    ['https://via.example/unreachable','HTTP 503'],
    ['https://via.example/missing-location','no Location header'],
    ['https://via.example/loop','redirect limit'],
    ['https://unresolved-review.example.test/offer','did not resolve'],
    ['https://private.mcusercontent.com/offer','resolves to a private-network address'],
  ];
  for (const [index,[destination,reason]] of unsafe.entries()) {
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie:owner,
      body:{emailBody:`<p><a href="${destination}">Partner offer</a></p>`,links:[]}}),200);
    const failure = await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`,{method:'POST',cookie:owner,
      body:{revisionId:campaign.revisionId,idempotencyKey:`synthetic-mango-170-${index}`}}),409);
    expect(failure.blockers).toContainEqual(expect.objectContaining({kind:'message.links.resolved',detail:expect.stringContaining(reason)}));
  }
  // The deployment allowance cannot substitute for custody of a campaign image.
  const image = png(4,3,172), form = new FormData();
  form.set('file',new Blob([image],{type:'image/png'}),'synthetic-mango-172.png');
  const uploaded = await json(await site.call('/api/campaign-assets',{method:'POST',cookie:owner,raw:form}),201);
  const imageBody = (source:string) => `<p><a href="${source}">View image</a></p><img src="${source}" alt="Garden image" width="4" height="3">`;
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie:owner,body:{emailBody:imageBody(uploaded.asset.url),links:[]}}),200);
  const stored = await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}}),200);
  expect(stored.checks.find((check:any)=>check.kind==='message.links.resolved')).toMatchObject({blocking:false});
  const missing = `${site.origin}/media/${'0'.repeat(64)}`;
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie:owner,body:{emailBody:imageBody(missing),links:[]}}),200);
  const absent = await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`,{method:'POST',cookie:owner,
    body:{revisionId:campaign.revisionId,idempotencyKey:'synthetic-mango-173'}}),409);
  expect(absent.blockers).toContainEqual(expect.objectContaining({kind:'message.links.resolved',detail:expect.stringContaining(`${missing} (This deployment holds no campaign image with that address.)`)}));
  // A positive control with only valid contact links still needs no host entry.
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie:owner,
    body:{emailBody:`<p><a href="mailto:${['synthetic-mango-171','example.test'].join('@')}">Email</a> <a href="tel:+14155550100">Phone</a> <a href="sms:+14155550100?body=Hello">Text</a></p>`,links:[]}}),200);
  await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}}),200);
  const contact = await json(await site.call(`/api/campaigns/${campaign.campaignId}/review`,{cookie:owner}),200);
  expect(contact.blockedHosts).toEqual([]);
  expect(contact.checks.find((check:any)=>check.kind==='message.links')).toMatchObject({blocking:false});
  expect(contact.checks.find((check:any)=>check.kind==='message.links.resolved')).toMatchObject({blocking:false});
  expect(await site.rows(`SELECT state,approved_at FROM campaign_revisions WHERE id='${campaign.revisionId}'`)).toEqual([{state:'draft',approved_at:null}]);
  expect(await site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${campaign.campaignId}'`)).toEqual([]);
  expect(await site.rows(`SELECT * FROM recipient_steps WHERE campaign_id='${campaign.campaignId}'`)).toEqual([]);
  expect(await site.rows(`SELECT * FROM step_dispatches WHERE revision_id='${campaign.revisionId}'`)).toEqual([]);
  expect((await site.control('/_golive/emissions')).filter((entry:any)=>entry.command.kind==='campaign.dispatch'&&entry.command.payload.revisionId===campaign.revisionId)).toEqual([]);
}

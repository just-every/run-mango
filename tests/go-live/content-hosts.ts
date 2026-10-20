import { expect, type Page, type TestInfo } from '@playwright/test';
import { json, draftCampaign, approve, type Installation } from './harness';
import { openPage, reloadPage } from '../support/navigation';
import { zip } from '../move-in/archive';
import { importArchive } from '../move-in/support';

export const hostNetwork = {
  'https://partner.example/offer': {},
  'https://redirect.example/start': {location:'https://partner.example/offer'},
  'https://shop.myshop.com/offer': {},
  'https://myshop.com/offer': {},
  'https://myshop.com.evil.example/offer': {},
};

export async function blockedHostJourney(site: Installation, owner: string, page: Page, info: TestInfo, now: number) {
  const author = await site.open('lena@example.test','host-author');
  const manager = await site.open('maya@example.test','host-manager');
  for (const [id,role] of [['host-author','author'],['host-manager','manager']]) {
    await json(await site.call(`/api/operators/${id}/role`,{method:'PUT',cookie:owner,body:{role}}),200);
  }
  await site.runtime.sql("UPDATE oa_operators SET display_name=CASE id WHEN 'host-author' THEN 'Lena Chen' ELSE 'Maya Torres' END WHERE id IN ('host-author','host-manager') RETURNING id");
  const campaign = await draftCampaign(site,author,'Garden partners',['garden-reader@example.test'],new Date(now+7200000));
  const path = `/api/campaigns/${campaign.campaignId}`;
  // Both the saved destination and a redirect destination are named, alongside the authored link.
  await json(await site.call('/api/settings/link-hosts',{method:'PUT',cookie:owner,body:{hosts:'mango.example.test,redirect.example,myshop.com'}}),200);
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie:author,body:{emailBody:'<p>Visit our <a href="https://partner.example/offer">Garden partner offer</a> or <a href="https://redirect.example/start">Market partner redirect</a>.</p>'}}),200);
  const rejected = await json(await site.call(`${path}/approve`,{method:'POST',cookie:manager,body:{revisionId:campaign.revisionId,idempotencyKey:'partner-host-blocked'}}),409);
  expect(JSON.stringify(rejected.blockers)).toContain('partner.example');
  expect(JSON.stringify(rejected.blockers)).toContain('https://redirect.example/start');
  const view = async (cookie:string) => {
    await page.context().clearCookies();
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
  };
  await view(author);
  const blocked = page.locator('[aria-label="Blocked host partner.example"]');
  await expect(blocked).toContainText('Garden partner offer');
  await expect(blocked).toContainText('Market partner redirect');
  await expect(blocked.getByRole('button',{name:'Allow this host',exact:true})).toHaveCount(0);
  await json(await site.call(`${path}/link-hosts`,{method:'POST',cookie:author,body:{host:'partner.example'}}),403);
  await page.getByRole('button',{name:'Request approval',exact:true}).click();
  await expect(page.getByText(/Approval requested by Lena Chen/)).toBeVisible();
  await view(manager);
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await expect(blocked.getByRole('button',{name:'Allow this host',exact:true})).toBeVisible();
    await blocked.screenshot({path:info.outputPath(`blocked-host-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await blocked.getByRole('button',{name:'Allow this host',exact:true}).click();
  await expect(blocked).toHaveCount(0);
  await reloadPage(page);
  await expect(blocked).toHaveCount(0);
  const allowed = await json(await site.call('/api/settings/link-hosts',{cookie:manager}),200);
  expect(allowed.hosts).toEqual(expect.arrayContaining(['mango.example.test','redirect.example','myshop.com','partner.example']));
  expect(allowed.sources).toContainEqual(expect.objectContaining({host:'partner.example',source:'allowed in review',campaignId:campaign.campaignId,operatorId:'host-manager'}));
  const activity = await json(await site.call(`/api/activity?operator=host-manager&action=link-host.allowed&object=${campaign.campaignId}`,{cookie:owner}),200);
  expect(activity.entries).toHaveLength(1);
  expect(activity.entries[0]).toMatchObject({operatorId:'host-manager',operatorName:'Maya Torres',objectId:campaign.campaignId,detail:expect.objectContaining({host:'partner.example'})});
  await json(await site.call('/api/activity',{cookie:manager}),403);
  await json(await site.call('/api/activity',{cookie:author}),403);
  await page.getByRole('button',{name:'Approve & schedule',exact:true}).click();
  await page.getByRole('alertdialog',{name:'Approve and schedule?'}).getByRole('button',{name:'Approve & schedule',exact:true}).click();
  await expect(page.getByRole('link',{name:'View schedule and results'})).toBeVisible();
  expect((await json(await site.call(path,{cookie:manager}),200)).campaign.state).toBe('scheduled');
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await expect(page.locator('[aria-label="Blocked link hosts"]')).toHaveCount(0);
    await page.screenshot({path:info.outputPath(`allowed-host-approved-${width}.png`),fullPage:true});
  }
  // Exact entries do not authorize subdomains. An explicit wildcard does, without matching a deceptive suffix or its bare domain.
  const domains = await draftCampaign(site,author,'Shop domain review',['garden-reader@example.test'],new Date(now+7200000));
  const domainBody = async (destination:string) => json(await site.call(`/api/campaign-revisions/${domains.revisionId}`,{method:'PATCH',cookie:author,body:{emailBody:`<p><a href="${destination}">Browse seedlings</a></p>`}}),200);
  await domainBody('https://shop.myshop.com/offer');
  expect((await json(await site.call(`/api/campaigns/${domains.campaignId}/review`,{cookie:manager}),200)).blockedHosts.map((entry:any)=>entry.host)).toContain('shop.myshop.com');
  await json(await site.call(`/api/campaigns/${domains.campaignId}/link-hosts`,{method:'POST',cookie:manager,body:{host:'*.myshop.com'}}),200);
  await approve(site,manager,domains);
  const evil = await draftCampaign(site,author,'Untrusted suffix',['garden-reader@example.test'],new Date(now+7200000));
  await json(await site.call(`/api/campaign-revisions/${evil.revisionId}`,{method:'PATCH',cookie:author,body:{emailBody:'<p><a href="https://myshop.com.evil.example/offer">Untrusted shop</a></p>'}}),200);
  expect((await site.call(`/api/campaigns/${evil.campaignId}/approve`,{method:'POST',cookie:manager,body:{revisionId:evil.revisionId,idempotencyKey:'evil-hostname-blocked'}})).status).toBe(409);
  await json(await site.call('/api/settings/link-hosts',{method:'PUT',cookie:owner,body:{hosts:'mango.example.test,*.myshop.com'}}),200);
  await json(await site.call(`/api/campaign-revisions/${evil.revisionId}`,{method:'PATCH',cookie:author,body:{emailBody:'<p><a href="https://myshop.com/offer">Bare shop</a></p>'}}),200);
  const bare = await json(await site.call(`/api/campaigns/${evil.campaignId}/approve`,{method:'POST',cookie:manager,body:{revisionId:evil.revisionId,idempotencyKey:'bare-domain-blocked'}}),409);
  expect(JSON.stringify(bare.blockers)).toContain('myshop.com');
  // A real Mailchimp-shaped archive creates the draft starter; no handcrafted campaign substitutes for the import.
  const hosts = ['partners.garden.example','workshops.market.example','seeds.community.example'];
  const html = `<html><head><title>Community garden partners</title></head><body><h2>Meet our garden partners</h2>${hosts.map((host,index)=>`<p><a href="https://${host}/visit">Garden partner ${index+1}</a></p>`).join('')}</body></html>`;
  await importArchive(site,owner,zip([{name:'templates/Community partners.html',data:html}]));
  const [imported] = await site.rows("SELECT campaign_id,revision_id FROM move_in_content WHERE title='Community garden partners'");
  await page.context().clearCookies();
  await page.context().addCookies([{name:manager.split('=')[0],value:manager.split('=')[1],url:site.runtime.url}]);
  await openPage(page,`${site.runtime.url}/app/campaigns/${imported.campaign_id}/review`);
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    for (const [index,host] of hosts.entries()) {
      const group=page.locator(`[aria-label="Blocked host ${host}"]`);
      await expect(group).toContainText(`Garden partner ${index+1}`);
      await expect(group.getByRole('button',{name:'Allow this host',exact:true})).toBeVisible();
      await group.screenshot({path:info.outputPath(`imported-host-${index+1}-${width}.png`)});
    }
    await page.locator('[aria-label="Blocked link hosts"]').screenshot({path:info.outputPath(`imported-hosts-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
}

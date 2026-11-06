import {templateConversionJourney} from './template-conversion';
import AxeBuilder from '@axe-core/playwright';
import {syncSource} from './source-edge';
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
  'https://admin-review.example.test/offer': {},
  'https://author-review.example.test/offer': {},
};

async function adminHostAllowance(site: Installation, owner: string, page: Page, info: TestInfo, now: number) {
  const operatorId = 'synthetic-mango-167';
  const admin = await site.open([operatorId, 'example.test'].join('@'), operatorId);
  await json(await site.call(`/api/operators/${operatorId}/role`, {method:'PUT', cookie:owner, body:{role:'admin'}}), 200);
  await site.runtime.sql(`UPDATE oa_operators SET display_name='Synthetic Mango Admin' WHERE id='${operatorId}' RETURNING id`);
  expect((await json(await site.call('/api/operator', {cookie:admin}), 200)).operator.role).toBe('admin');
  const host = 'admin-review.example.test', destination = `https://${host}/offer`;
  const readers = await site.rows("SELECT email FROM contacts WHERE display_name='Garden reader'");
  expect(readers).toHaveLength(1);
  const campaign = await draftCampaign(site, admin, 'Synthetic Mango Admin review', [readers[0].email], new Date(now + 7200000));
  const path = `/api/campaigns/${campaign.campaignId}`;
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method:'PATCH', cookie:admin,
    body:{emailBody:`<p><a href="${destination}">Admin partner offer</a></p>`}}), 200);
  const before = await json(await site.call(`${path}/review`, {cookie:admin}), 200);
  expect(before.blockedHosts).toContainEqual({host, links:[destination]});
  expect((await json(await site.call('/api/settings/link-hosts', {cookie:admin}), 200)).hosts).not.toContain(host);
  const noAuthority = async () => {
    expect(await site.rows(`SELECT state,active_revision_id FROM campaigns WHERE id='${campaign.campaignId}'`))
      .toEqual([{state:'draft', active_revision_id:campaign.revisionId}]);
    expect(await site.rows(`SELECT state,approved_at,approved_by_operator_id FROM campaign_revisions WHERE id='${campaign.revisionId}'`))
      .toEqual([{state:'draft', approved_at:null, approved_by_operator_id:null}]);
    expect(await site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${campaign.campaignId}'`)).toEqual([]);
    expect(await site.rows(`SELECT * FROM recipient_steps WHERE campaign_id='${campaign.campaignId}'`)).toEqual([]);
    expect(await site.rows(`SELECT * FROM step_dispatches WHERE revision_id='${campaign.revisionId}'`)).toEqual([]);
    expect((await site.control('/_golive/emissions')).filter((entry:any) =>
      entry.command.kind === 'campaign.dispatch' && entry.command.payload.revisionId === campaign.revisionId)).toEqual([]);
  };
  await noAuthority();
  await page.context().clearCookies();
  await page.context().addCookies([{name:admin.split('=')[0], value:admin.split('=')[1], url:site.runtime.url}]);
  await page.setViewportSize({width:1440, height:1000});
  await openPage(page, `${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
  const blocked = page.getByRole('region', {name:`Blocked host ${host}`, exact:true});
  await expect(blocked).toContainText('Admin partner offer');
  await expect(blocked.getByLabel(`Host entry for ${host}`)).toHaveValue(host);
  await expect(blocked.getByRole('button', {name:'Allow this host', exact:true})).toBeVisible();
  // Capture the same saved review on both screens; the behavioural journey runs at desktop width.
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:1000});
    await blocked.screenshot({path:info.outputPath(`admin-blocked-host-${width}.png`)});
  }
  await page.setViewportSize({width:1440, height:1000});
  const allowanceResponse = page.waitForResponse(response => response.url().endsWith(`${path}/link-hosts`) && response.request().method() === 'POST');
  await blocked.getByRole('button', {name:'Allow this host', exact:true}).click();
  const response = await allowanceResponse;
  expect(response.status()).toBe(200);
  expect(response.request().postDataJSON()).toEqual({host});
  const allowance = await response.json();
  expect(allowance.host).toBe(host);
  expect(allowance.review.kind).toBe('preview');
  expect(allowance.review.checks.find((check:any) => check.kind === 'message.links')).toMatchObject({blocking:false});
  expect(allowance.review.checks.find((check:any) => check.kind === 'message.links.resolved')).toMatchObject({blocking:false});
  await expect(blocked).toHaveCount(0);
  await reloadPage(page);
  await expect(blocked).toHaveCount(0);
  const reloaded = await json(await site.call(`${path}/review`, {cookie:admin}), 200);
  expect(reloaded.blockedHosts).not.toContainEqual(expect.objectContaining({host}));
  expect(reloaded.checks.find((check:any) => check.kind === 'message.links.resolved')).toMatchObject({blocking:false});
  const settings = await json(await site.call('/api/settings/link-hosts', {cookie:admin}), 200);
  expect(settings.hosts).toContain(host);
  expect(settings.hosts).not.toContain('*.example.test');
  expect(settings.sources.filter((source:any) => source.host === host && source.source === 'allowed in review'))
    .toEqual([expect.objectContaining({host, source:'allowed in review', campaignId:campaign.campaignId, operatorId})]);
  const activity = await json(await site.call(`/api/activity?operator=${operatorId}&action=link-host.allowed&object=${campaign.campaignId}`, {cookie:admin}), 200);
  expect(activity.entries).toEqual([expect.objectContaining({operatorId, operatorName:'Synthetic Mango Admin', objectId:campaign.campaignId,
    action:'link-host.allowed', detail:{host, source:'allowed in review', campaignId:campaign.campaignId, operatorId}})]);
  const [record] = await site.rows(`SELECT actor_id,entity_id,detail_json FROM lifecycle_audit_entries WHERE id='${activity.entries[0].id}'`);
  expect(record).toEqual({actor_id:operatorId, entity_id:campaign.campaignId, detail_json:JSON.stringify(activity.entries[0].detail)});
  await noAuthority();
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:1000});
    await page.screenshot({path:info.outputPath(`admin-allowed-host-${width}.png`), fullPage:true});
  }
  await page.setViewportSize({width:1440, height:1000});
  const custody = await site.rows(`SELECT * FROM lifecycle_audit_entries WHERE action='link-host.allowed' AND entity_id='${campaign.campaignId}'`);
  await json(await site.call(`/api/operators/${operatorId}/role`, {method:'PUT', cookie:owner, body:{role:'author'}}), 200);
  await json(await site.call(`${path}/link-hosts`, {method:'POST', cookie:admin, body:{host:'revoked-review.example.test'}}), 403);
  expect((await json(await site.call('/api/settings/link-hosts', {cookie:owner}), 200)).hosts).not.toContain('revoked-review.example.test');
  expect(await site.rows(`SELECT * FROM lifecycle_audit_entries WHERE action='link-host.allowed' AND entity_id='${campaign.campaignId}'`)).toEqual(custody);
  await noAuthority();
  await json(await site.call(`/api/operators/${operatorId}/role`, {method:'PUT', cookie:owner, body:{role:'admin'}}), 200);
  // An exact allowance cannot silently authorize a descendant host.
  const childHost = `child.${host}`, childDestination = `https://${childHost}/offer`;
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method:'PATCH', cookie:admin,
    body:{emailBody:`<p><a href="${childDestination}">Another partner</a></p>`}}), 200);
  expect((await json(await site.call(`${path}/review`, {cookie:admin}), 200)).blockedHosts)
    .toEqual([{host:childHost, links:[childDestination]}]);
  const refused = await json(await site.call(`${path}/approve`, {method:'POST', cookie:admin,
    body:{revisionId:campaign.revisionId, idempotencyKey:'synthetic-mango-168'}}), 409);
  expect(JSON.stringify(refused.blockers)).toContain(childHost);
  await noAuthority();
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method:'PATCH', cookie:admin,
    body:{emailBody:`<p><a href="${destination}">Admin partner offer</a></p>`}}), 200);
  // Removing and allowing the host again appends history; it cannot rewrite the original custody.
  const original = await site.rows(`SELECT * FROM lifecycle_audit_entries WHERE id='${activity.entries[0].id}'`);
  await json(await site.call('/api/settings/link-hosts', {method:'PUT', cookie:owner,
    body:{hosts:settings.hosts.filter((entry:string) => entry !== host).join(',')}}), 200);
  expect((await json(await site.call(`${path}/review`, {cookie:admin}), 200)).blockedHosts)
    .toEqual([{host, links:[destination]}]);
  expect((await json(await site.call(`/api/activity?operator=${operatorId}&action=link-host.allowed&object=${campaign.campaignId}`, {cookie:admin}), 200)).entries)
    .toEqual(activity.entries);
  await site.control('/_golive/clock', {advanceMs:1000});
  await openPage(page, `${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
  await blocked.getByRole('button', {name:'Allow this host', exact:true}).click();
  await expect(blocked).toHaveCount(0);
  const retained = await json(await site.call(`/api/activity?operator=${operatorId}&action=link-host.allowed&object=${campaign.campaignId}`, {cookie:admin}), 200);
  expect(retained.entries).toHaveLength(2);
  expect(retained.entries[1]).toEqual(activity.entries[0]);
  expect(retained.entries[0].id).not.toBe(retained.entries[1].id);
  expect(retained.entries[0].occurredAt).toBeGreaterThan(retained.entries[1].occurredAt);
  expect(retained.entries[0].detail).toEqual(activity.entries[0].detail);
  expect(await site.rows(`SELECT * FROM lifecycle_audit_entries WHERE id='${activity.entries[0].id}'`)).toEqual(original);
  await noAuthority();
  await openPage(page, `${site.runtime.url}/app/settings/activity`);
  const entries = page.getByRole('region', {name:'Activity entries', exact:true});
  const filters = page.getByRole('form', {name:'Activity filters', exact:true});
  await expect(entries).toHaveAttribute('aria-busy','false');
  await filters.getByLabel('Operator', {exact:true}).fill(operatorId);
  await filters.getByLabel('Action', {exact:true}).fill('link-host.allowed');
  await filters.getByLabel('Object', {exact:true}).fill(campaign.campaignId);
  const apply = async () => {
    const wanted = await Promise.all(['Operator','Action','Object'].map(label=>filters.getByLabel(label,{exact:true}).inputValue()));
    const response = page.waitForResponse(value => {
      const url = new URL(value.url());
      return url.pathname === '/api/activity' && value.request().method() === 'GET'
        && ['operator','action','object'].every((field,index)=>url.searchParams.get(field)===wanted[index]);
    });
    await filters.getByRole('button', {name:'Apply filters', exact:true}).click();
    const result = await response;
    expect(result.status()).toBe(200);
    return result.json();
  };
  expect((await apply()).entries).toEqual(retained.entries);
  await expect(entries.locator('tbody tr')).toHaveCount(2);
  await expect(entries).toContainText(host);
  await expect(entries).toContainText('Synthetic Mango Admin');
  for (const [label,wrong,right] of [['Operator','go-live-owner',operatorId],['Action','link-host.removed','link-host.allowed'],['Object',campaign.revisionId,campaign.campaignId]]) {
    await filters.getByLabel(label, {exact:true}).fill(wrong);
    expect((await apply()).entries).toEqual([]);
    await expect(entries).toContainText('No activity matches these filters.');
    await filters.getByLabel(label, {exact:true}).fill(right);
    expect((await apply()).entries).toEqual(retained.entries);
    await expect(entries.locator('tbody tr')).toHaveCount(2);
  }
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:1000});
    if (width === 390) await page.getByRole('region',{name:'Activity log table',exact:true}).evaluate(element=>{element.scrollLeft=element.scrollWidth;});
    await page.screenshot({path:info.outputPath(`admin-host-activity-${width}.png`), fullPage:true});
  }
}

export async function blockedHostJourney(site: Installation, owner: string, page: Page, info: TestInfo, now: number) {
  const initial=await json(await site.call('/api/settings/link-hosts',{cookie:owner}),200);
  expect(initial.sources).toContainEqual(expect.objectContaining({host:'mango.example.test',source:'Deployment host'}));
  expect(initial.sources).toContainEqual(expect.objectContaining({host:'www.instagram.com',source:'Social defaults'}));
  expect(initial.sources.filter((row:any)=>row.source==='Configured Shopify connection host')).toEqual([{host:'mango-test.myshopify.com',source:'Configured Shopify connection host'}]);
  const freshReview=await draftCampaign(site,owner,'Synthetic Mango source review',['garden-reader@example.test'],new Date(now+3*3600000));
  await json(await site.call(`/api/campaigns/${freshReview.campaignId}/link-hosts`,{method:'POST',cookie:owner,body:{host:'fresh-review.example.test'}}),200);
  expect((await json(await site.call('/api/settings/link-hosts',{cookie:owner}),200)).sources).toContainEqual(expect.objectContaining({host:'www.instagram.com',source:'Social defaults'}));
  await json(await site.call('/api/settings/link-hosts',{method:'PUT',cookie:owner,body:{hosts:initial.hosts.filter((host:string)=>host!=='www.instagram.com').join(',')}}),200);
  await syncSource(site,owner,'product');
  const removed=await json(await site.call('/api/settings/link-hosts',{cookie:owner}),200);expect(removed.hosts).not.toContain('www.instagram.com');
  expect((await json(await site.call('/api/activity?action=link-host.removed',{cookie:owner}),200)).entries.some((entry:any)=>entry.detail.host==='www.instagram.com')).toBe(true);
  await page.context().clearCookies();await page.context().addCookies([{name:owner.split('=')[0],value:owner.split('=')[1],url:site.runtime.url}]);
  for(const width of [1440]){await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/settings');const panel=page.getByRole('region',{name:'Link host sources',exact:true});await expect(panel).toContainText('Deployment host');await expect(panel).toContainText('Social defaults');await expect(panel).not.toContainText('www.instagram.com');await panel.getByRole('heading',{name:'Link host sources'}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`link-host-sources-${width}.png`)});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);}
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
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie:author,body:{emailBody:'<p>Visit our <a href="https://partner.example/offer">Garden partner offer</a> or <a href="https://redirect.example/start">Market partner redirect</a> and <a href="https://author-review.example.test/offer">Another garden partner</a>.</p>'}}),200);
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
  await expect(page.getByRole('button',{name:'Allow this host',exact:true})).toHaveCount(0);
  await json(await site.call(`${path}/link-hosts`,{method:'POST',cookie:author,body:{host:'partner.example'}}),403);
  const expectedHosts = [{host:'partner.example',links:['https://partner.example/offer','https://redirect.example/start']},{host:'author-review.example.test',links:['https://author-review.example.test/offer']}];
  const requestedHosts = [{host:'partner.example'},{host:'author-review.example.test'}];
  expect((await json(await site.call(`${path}/review`,{cookie:author}),200)).blockedHosts).toEqual(expectedHosts);
  await page.getByRole('button',{name:'Request approval',exact:true}).click();
  await expect(page.getByText(/Approval requested by Lena Chen/)).toBeVisible();
  await expect(page.getByText('Blocked hosts in this request: partner.example, author-review.example.test.',{exact:true})).toBeVisible();
  const requested = await site.rows(`SELECT * FROM lifecycle_audit_entries WHERE action='campaign.approval-requested' AND entity_id='${campaign.revisionId}'`);
  expect(requested).toHaveLength(1);
  expect(requested[0].actor_id).toBe('host-author');
  expect(JSON.parse(requested[0].detail_json)).toEqual({campaignId:campaign.campaignId,revisionId:campaign.revisionId,blockedHosts:requestedHosts});
  await json(await site.call(`${path}/request-approval`,{method:'POST',cookie:author,body:{revisionId:campaign.revisionId,blockedHosts:[{host:'forged-review.example.test'}]}}),400);
  await json(await site.call(`${path}/request-approval`,{method:'POST',cookie:author,body:{revisionId:freshReview.revisionId}}),409);
  await json(await site.call(`${path}/request-approval`,{method:'POST',cookie:author,body:{revisionId:campaign.revisionId}}),200);
  expect(await site.rows(`SELECT * FROM lifecycle_audit_entries WHERE action='campaign.approval-requested' AND entity_id='${campaign.revisionId}'`)).toEqual(requested);
  expect(await site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${campaign.campaignId}'`)).toEqual([]);
  expect(await site.rows(`SELECT * FROM recipient_steps WHERE campaign_id='${campaign.campaignId}'`)).toEqual([]);
  for (const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.screenshot({path:info.outputPath(`author-host-request-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  await view(manager);
  for (const width of [1440]) {
    await page.setViewportSize({width,height:1000});
    await expect(blocked.getByRole('button',{name:'Allow this host',exact:true})).toBeVisible();
    await blocked.screenshot({path:info.outputPath(`blocked-host-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await blocked.getByRole('button',{name:'Allow this host',exact:true}).click();
  await expect(blocked).toHaveCount(0);
  await reloadPage(page);
  await expect(blocked).toHaveCount(0);
  expect((await json(await site.call(`${path}/approval-requests`,{cookie:manager}),200)).requests)
    .toEqual([{revisionId:campaign.revisionId,requestedAt:requested[0].occurred_at,operator:'Lena Chen',blockedHosts:requestedHosts}]);
  await expect(page.getByText('Blocked hosts in this request: partner.example, author-review.example.test.',{exact:true})).toBeVisible();
  const allowed = await json(await site.call('/api/settings/link-hosts',{cookie:manager}),200);
  expect(allowed.hosts).toEqual(expect.arrayContaining(['mango.example.test','redirect.example','myshop.com','partner.example']));
  expect(allowed.sources).toContainEqual(expect.objectContaining({host:'partner.example',source:'allowed in review',campaignId:campaign.campaignId,operatorId:'host-manager'}));
  const activity = await json(await site.call(`/api/activity?operator=host-manager&action=link-host.allowed&object=${campaign.campaignId}`,{cookie:owner}),200);
  expect(activity.entries).toHaveLength(1);
  expect(activity.entries[0]).toMatchObject({operatorId:'host-manager',operatorName:'Maya Torres',objectId:campaign.campaignId,detail:expect.objectContaining({host:'partner.example'})});
  await json(await site.call('/api/activity',{cookie:manager}),403);
  await json(await site.call('/api/activity',{cookie:author}),403);
  await page.getByRole('region',{name:'Blocked host author-review.example.test',exact:true}).getByRole('button',{name:'Allow this host',exact:true}).click();
  await expect(page.getByRole('region',{name:'Blocked host author-review.example.test',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Approve & schedule',exact:true}).click();
  await page.getByRole('alertdialog',{name:'Approve and schedule?'}).getByRole('button',{name:'Approve & schedule',exact:true}).click();
  await expect(page.getByRole('link',{name:'View schedule and results'})).toBeVisible();
  expect((await json(await site.call(path,{cookie:manager}),200)).campaign.state).toBe('scheduled');
  for (const width of [1440]) {
    await page.setViewportSize({width,height:1000});
    await expect(page.locator('[aria-label="Blocked link hosts"]')).toHaveCount(0);
    await page.screenshot({path:info.outputPath(`allowed-host-approved-${width}.png`),fullPage:true});
  }
  await adminHostAllowance(site, owner, page, info, now);
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
  // A real Mailchimp-shaped archive files a library template; its public start door creates the draft.
  const hosts = ['partners.garden.example','workshops.market.example','seeds.community.example'];
  const html = `<html><head><title>synthetic-mango-156</title></head><body><h2>Meet our garden partners</h2>${hosts.map((host,index)=>`<p><a href="https://${host}/visit">Garden partner ${index+1}</a></p>`).join('')}</body></html>`;
  const moved=await importArchive(site,owner,zip([{name:'templates/synthetic-mango-156.html',data:html},{name:'emails.csv',data:'Title,Subject,Campaign ID\nsynthetic-mango-157,Synthetic archive history,synthetic-mango-157'},{name:'campaigns_content/synthetic-mango-157.html',data:`<p><a href="https://${hosts[0]}/visit">First use</a> <a href="https://${hosts[0]}/visit-again">Second use</a></p>`}]));
  const archive=await json(await site.call(`/api/audience/archives/${moved.archive.id}`,{cookie:owner}),200);
  const imported=archive.content.find((row:any)=>row.title==='synthetic-mango-156');
  expect(imported.campaign_id).toBeNull();
  const reconciliation = await (await site.call(`/api/audience/archives/${moved.archive.id}/report`,{cookie:owner})).text();
  for (const host of hosts) { expect(JSON.parse(imported.removed_json)).toContain(`Outside host ${host}: 1 uses`); expect(reconciliation).toContain(`| ${host} | ${host === hosts[0] ? 3 : 1} |`); }
  const library=await json(await site.call('/api/campaign-templates',{cookie:manager}),200);
  expect(library.templates).toContainEqual(expect.objectContaining({id:imported.id,name:'synthetic-mango-156',kind:'saved'}));
  const draft=await json(await site.call(`/api/campaign-templates/${imported.id}/start`,{method:'POST',cookie:manager}),201);
  await page.context().clearCookies();
  await page.context().addCookies([{name:manager.split('=')[0],value:manager.split('=')[1],url:site.runtime.url}]);
  await openPage(page,`${site.runtime.url}/app/campaigns/${draft.campaignId}/review`);
  for (const width of [1440]) {
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
  await templateConversionJourney(site,owner,page,info);
}

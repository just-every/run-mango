import {oversizedAdoption,oversizedSignalStarter} from './email-size-adoption';
import { exerciseCampaignReuse } from './reuse-journey';
import { hydrated, openPage, reloadPage } from '../support/navigation';
import { localSessionCookieName } from '../support/local-session';
import {test,expect} from '@playwright/test';
import {authoringRuntime} from './browser-runtime.mjs';

test.describe.configure({mode:'serial',timeout:120000});
test.use({timezoneId:'America/Los_Angeles'});
for(const width of [1440,390]) test(`[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-018][BUILD-002] fresh authoring through actual Worker and D1 at ${width}px`,async({page,request}, testInfo)=>{
  const runtime=await authoringRuntime();
  try {
    await page.setViewportSize({width,height:1000});
    const open=await request.post(runtime.url+'/_authoring/open',{headers:{'X-Test-Token':runtime.token}});expect(open.status(),await open.text()).toBe(200);
    const {token}=await open.json();await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:token,url:runtime.url}]);
    expect((await request.post(runtime.url+'/api/campaigns',{data:{}})).status()).toBe(401);
    const call=(path:string,body:unknown)=>page.evaluate(async({path,body})=>{const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};},{path,body});
    await openPage(page, runtime.url+'/app/campaigns');
    await expect(page.getByText('No campaigns yet. Start with New campaign.')).toBeVisible();
    await page.getByRole('button',{name:'New campaign',exact:true}).click();
    const starters=page.getByRole('region',{name:'Choose a campaign starter'});
    await expect(starters).toBeVisible();
    await expect(starters.getByRole('heading',{name:'From store signals',exact:true})).toHaveCount(0);
    await expect(starters.getByRole('heading',{name:'Saved suggestions',exact:true})).toHaveCount(0);
    await expect(starters.getByRole('button',{name:'Blank newsletter',exact:true})).toBeEnabled();
    await page.screenshot({path:testInfo.outputPath(`starters-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Blank newsletter',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Untitled campaign',exact:true})).toBeVisible();
    // Creation enters the server-rendered review document; interact once it hydrates.
    await hydrated(page);
    const campaignId=new URL(page.url()).pathname.split('/')[3];
    if(width===1440) {
      // The initial resource read now runs inside SSR; fail its request transport too.
      await page.context().setExtraHTTPHeaders({'X-Test-Token':runtime.token,'X-Test-Unavailable-Resource':'/api/campaign-authoring'});
      await reloadPage(page);
      await expect(page.getByText('Campaign authoring is unavailable: the configured store time zone could not be loaded.',{exact:true})).toBeVisible();
      await expect(page.getByRole('button',{name:'Add email step',exact:true})).toHaveCount(0);
      await page.context().setExtraHTTPHeaders({});
      await reloadPage(page);
      await expect(page.getByRole('button',{name:'Add email step',exact:true})).toBeVisible();
    }
    expect((await call('/api/campaigns',{composition:{inclusionRuleJson:'not-json'}})).status).toBe(400);
    const read=()=>page.evaluate(async id=>(await fetch(`/api/campaigns/${id}`)).json(),campaignId);
    let detail=await read();
    expect(await page.evaluate(async id=>(await fetch(`/api/campaign-revisions/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({exclusionRulesJson:'{}'})})).status,detail.revision.id)).toBe(400);
    expect(detail.campaign.state).toBe('draft');expect(detail.steps).toEqual([]);
    const state=async()=> (await request.get(runtime.url+'/_authoring/state',{headers:{'X-Test-Token':runtime.token}})).json();
    expect(await state()).toEqual({jobs:[],recipients:[],approvals:[]});
    await page.getByLabel('Campaign name',{exact:true}).fill('');
    await page.getByRole('button',{name:'Add email step',exact:true}).click();
    await expect(page.getByLabel('IANA time zone',{exact:true})).toHaveValue('Australia/Brisbane');
    await page.getByLabel('Local send date and time',{exact:true}).fill('2031-04-07T10:00');
    await expect(page.getByLabel('Local send-by date and time',{exact:true})).toHaveValue('2031-04-07T23:59');
    await expect(page.getByLabel('Resolved UTC send instant',{exact:true})).toHaveValue('2031-04-07T00:00:00.000Z');
    await expect(page.getByLabel('Resolved UTC send instant',{exact:true})).not.toBeEditable();
    await page.getByLabel('Local send-by date and time',{exact:true}).fill('2031-04-07T18:00');
    await page.getByLabel('Local send date and time',{exact:true}).fill('2031-04-07T10:15');
    await expect(page.getByLabel('Local send-by date and time',{exact:true})).toHaveValue('2031-04-07T18:00');
    await page.getByLabel('Local send-by date and time',{exact:true}).fill('2031-04-07T23:59');
    await page.getByLabel('Local send date and time',{exact:true}).fill('2031-04-07T10:00');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    await expect(page.getByRole('button',{name:'Approve & schedule',exact:true})).toBeDisabled();
    await expect(page.locator('#approval-blocked-reason')).toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    const refused=await call(`/api/campaigns/${campaignId}/approve`,{revisionId:detail.revision.id,idempotencyKey:'incomplete-draft'});
    expect(refused.status).toBe(409);
    await expect(page.getByText('Add the missing subject, message body, preheader before approval.',{exact:false})).toBeVisible();
    await expect(page.locator('#approval-blocked-reason')).toContainText('Campaign name');
    expect(await state()).toEqual({jobs:[],recipients:[],approvals:[]});
    await page.getByLabel('Campaign name',{exact:true}).fill(`Authored newsletter ${width}`);
    await page.getByLabel('Email subject',{exact:true}).fill('Garden news');
    await page.getByLabel('Email preheader',{exact:true}).fill('Our October letter');
    await page.getByRole('textbox',{name:'Email body',exact:true}).fill('Written by the operator.');
    await page.getByRole('textbox',{name:'Email body',exact:true}).press('ControlOrMeta+A');
    await page.getByRole('button',{name:'Bold',exact:true}).click();
    await expect(page.getByRole('textbox',{name:'Email body',exact:true}).locator('b,strong')).toHaveText('Written by the operator.');
    await expect(page.getByLabel('Plain-text email',{exact:true})).not.toBeEditable();
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();
    const authored='<h2>Garden news</h2><p><strong>Written by the operator.</strong> <a href="https://example.test/read">Read our letter</a></p>';
    await page.getByLabel('Email body',{exact:true}).fill(authored);
    await page.getByRole('button',{name:'Rich text',exact:true}).click();
    await expect(page.getByRole('textbox',{name:'Email body',exact:true}).locator('a')).toHaveAttribute('href','https://example.test/read');
    await page.getByRole('textbox',{name:'Email body',exact:true}).locator('a').click();expect(page.url()).toContain(`/campaigns/${campaignId}/review`);
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();await expect(page.getByLabel('Email body',{exact:true})).toHaveValue(authored);
    const requestedImages:string[]=[];page.on('request',req=>{if(req.url().includes('image.test'))requestedImages.push(req.url());});
    const imageHtml=authored+'<img src="https://image.test/picture.png" width="200" height="100" alt="Garden">';
    await page.getByLabel('Email body',{exact:true}).fill(imageHtml);await expect(page.getByRole('button',{name:'Rich text',exact:true})).toBeDisabled();
    await expect(page.getByLabel('Email body',{exact:true})).toHaveValue(imageHtml);expect(requestedImages).toEqual([]);
    // This approval journey has no outbound destination links; link preservation is proven above and below in saved state.
    await page.getByLabel('Email body',{exact:true}).fill(authored);
    await page.getByRole('button',{name:'Rich text',exact:true}).click();
    await page.getByRole('textbox',{name:'Email body',exact:true}).evaluate(element=>{const data=new DataTransfer();data.setData('text/html','<img src="https://image.test/pasted.png" width="200" height="100" alt="Pasted">');element.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));});
    await expect(page.getByRole('button',{name:'Rich text',exact:true})).toBeDisabled();
    await expect(page.getByLabel('Email body',{exact:true})).toHaveValue(/pasted.png/);expect(requestedImages).toEqual([]);
    await page.getByLabel('Email body',{exact:true}).fill(authored);
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    detail=await read();expect(detail.revision.emailBody).toContain(authored);expect(detail.revision.emailText).toContain('Read our letter (https://example.test/read)');expect(detail.links[0].destinationUrl).toBe('https://example.test/read');
    if(width===390)await page.getByRole('button',{name:'Remove link 1',exact:true}).click();
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();
    await page.getByLabel('Email body',{exact:true}).fill('<h2>Garden news</h2><p><strong>Written by the operator.</strong></p>');
    await page.getByLabel('Include 1 field',{exact:true}).selectOption('contact:email');
    await page.getByLabel('Include 1 comparison',{exact:true}).selectOption('contains');
    await page.getByLabel('Include 1 value',{exact:true}).fill('@example.test');
    await expect(page.getByLabel('Live audience estimate')).toContainText('2 candidates · 1 eligible contact');
    if(width===1440) {
      // Delay an actual Worker response, without replacing any application data.
      let release!:()=>void, observed!:()=>void, returned!:()=>void;
      const gate=new Promise<void>(resolve=>release=resolve),seen=new Promise<void>(resolve=>observed=resolve),finished=new Promise<void>(resolve=>returned=resolve);
      await page.route('**/api/campaign-authoring/audience',async route=>{
        const body=route.request().postDataJSON();
        if(JSON.parse(body.inclusionRuleJson).predicates[0].value!=='subscribed@'){await route.continue();return;}
        const response=await route.fetch();observed();await gate;await route.fulfill({response});returned();
      });
      await page.getByLabel('Include 1 value',{exact:true}).fill('subscribed@');await seen;
      await page.getByLabel('Include 1 value',{exact:true}).fill('@example.test');
      await expect(page.getByLabel('Live audience estimate')).toContainText('2 candidates · 1 eligible contact');
      release();await finished;await page.unroute('**/api/campaign-authoring/audience');
      await expect(page.getByLabel('Live audience estimate')).toContainText('2 candidates · 1 eligible contact');
    }
    await page.getByRole('button',{name:'Add exclusion',exact:true}).click();
    await expect(page.getByLabel('Live audience estimate')).toContainText('Counts unavailable.');
    await page.getByLabel('Exclude 1 value',{exact:true}).fill('subscribed@');
    await expect(page.getByLabel('Live audience estimate')).toContainText('2 candidates · 0 eligible contacts');
    await page.getByRole('button',{name:'Remove exclusion 1',exact:true}).click();
    await expect(page.getByLabel('Live audience estimate')).toContainText('2 candidates · 1 eligible contact');
    await page.getByLabel('Include 1 field',{exact:true}).selectOption('order:productId');
    await expect(page.getByLabel('Live audience estimate')).toContainText('Counts unavailable.');
    await page.getByLabel('Include 1 field',{exact:true}).selectOption('contact:email');
    await expect(page.getByLabel('Live audience estimate')).toContainText('2 candidates · 1 eligible contact');
    // Both UI and API reject a half-hour DST fold and a gap without mutating the saved draft.
    await page.getByLabel('IANA time zone',{exact:true}).fill('Australia/Lord_Howe');
    await page.getByLabel('Local send date and time',{exact:true}).fill('2031-04-06T01:45');
    await expect(page.getByRole('alert').filter({hasText:'occurs more than once'})).toBeVisible();
    for(const local of ['2031-04-06T01:45','2031-10-05T02:15']) {
      const rejected=await page.evaluate(async({id,local})=>{const response=await fetch(`/api/campaign-revisions/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({steps:[{channel:'email',timezone:'Australia/Lord_Howe',localScheduledAt:local,whyThisTime:'Operator time'}]})});return response.status;},{id:detail.revision.id,local});expect(rejected).toBe(400);
    }
    await page.getByLabel('IANA time zone',{exact:true}).fill('Australia/Brisbane');
    await page.getByLabel('Local send date and time',{exact:true}).fill('2031-04-07T10:00');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();await reloadPage(page);
    await expect(page.getByRole('heading',{name:`Authored newsletter ${width}`,exact:true})).toBeVisible();
    detail=await read();expect(detail.links).toEqual([]);expect(detail.revision.emailBody).not.toContain('example.test/read');expect(detail.revision.emailBody.match(/Unsubscribe/g)).toHaveLength(1);expect(detail.revision.emailText.match(/Unsubscribe/g)).toHaveLength(1);
    expect(await state()).toEqual({jobs:[],recipients:[],approvals:[]});
    await expect(page.getByRole('textbox',{name:'Email body',exact:true}).locator('h2')).toHaveText('Garden news');
    await expect(page.frameLocator('iframe[title="Saved email preview"]').getByRole('heading',{name:'Garden news'})).toBeVisible();
    await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('strong')).toHaveText('Written by the operator.');
    await expect(page.getByLabel('Live audience estimate')).toContainText('2 candidates · 1 eligible contact');
    expect(detail.revision.emailText).not.toContain('<h2>');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    await page.locator('iframe[title="Saved email preview"]').scrollIntoViewIfNeeded();
    await page.locator('iframe[title="Saved email preview"]').screenshot({path:testInfo.outputPath(`preview-${width}.png`)});
    await page.screenshot({path:testInfo.outputPath(`authoring-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:'Approve & schedule',exact:true}).click();
    await page.getByRole('alertdialog').getByRole('button',{name:'Approve & schedule'}).click();
    await expect(page.getByRole('status').filter({hasText:'exact saved revision is approved and scheduled'})).toBeVisible();
    await expect(page.locator('#campaign-composer')).toHaveCount(0);
    await expect(page.frameLocator('iframe[title="Saved email preview"]').getByRole('heading',{name:'Garden news'})).toBeVisible();
    detail=await read();expect(detail.campaign.state).toBe('scheduled');expect(detail.revision.state).toBe('approved');expect(detail.steps[0].scheduledAt).toBe('2031-04-07T00:00:00.000Z');
    const again=await call(`/api/campaigns/${campaignId}/approve`,{revisionId:detail.revision.id,idempotencyKey:'authoring-repeat-approval'});expect(again.status).toBe(200);expect(again.data.idempotent).toBe(true);
    // Future approval persists recipients and authority; Cron enqueues dispatch only when due.
    const final=await state();expect(final.jobs).toEqual([]);expect(final.recipients).toHaveLength(1);expect(final.recipients[0].transport_disposition).toBe('queued');expect(final.approvals).toHaveLength(1);
    await exerciseCampaignReuse(page,campaignId,runtime.url,width,testInfo,runtime.sql);
    // Store starter comes from an actual Shopify-shaped imported product, without an AI adapter.
    expect((await request.post(runtime.url+'/_authoring/source',{headers:{'X-Test-Token':runtime.token}})).status()).toBe(200);
    await openPage(page, runtime.url+'/app/campaigns');await page.getByRole('button',{name:'New campaign',exact:true}).click();await page.getByRole('button',{name:'Product newsletter: Garden linen',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Product newsletter: Garden linen',exact:true})).toBeVisible();await expect(page.getByLabel('Audience summary',{exact:true})).toContainText('Email subscription status is "subscribed"');
    await oversizedSignalStarter(page,runtime.url,width,testInfo,runtime.sql);
    expect((await request.post(runtime.url+'/_authoring/stale',{headers:{'X-Test-Token':runtime.token}})).status()).toBe(200);
    const stale=await call('/api/campaign-authoring/audience',{inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'product',field:'title',comparator:'eq',value:'Garden linen'}]}),exclusionRulesJson:'[]',channels:['email']});
    expect(stale.data).toMatchObject({status:'stale',candidateCount:null,eligibleCount:null});
    const generated=await call('/api/proposals/generate',{});expect(generated.status).toBe(409);expect(generated.data.kind).toBe('unavailable');
    expect((await state()).jobs).toEqual([]);
    const makeProposal=async()=> (await request.post(runtime.url+'/_authoring/proposal',{headers:{'X-Test-Token':runtime.token}})).json();
    const proposal=await makeProposal();
    const race=await Promise.all(Array.from({length:6},()=>call(`/api/proposals/${proposal.id}/adopt`,{})));
    expect(race.every(result=>result.status===200)).toBe(true);expect(new Set(race.map(result=>result.data.campaignId)).size).toBe(1);
    const campaigns=await page.evaluate(async()=>(await (await fetch('/api/campaigns')).json()).campaigns);
    expect(campaigns.filter((item:any)=>item.proposalId===proposal.id)).toHaveLength(1);
    const unlinked=await makeProposal();await openPage(page, runtime.url+'/app');
    await page.locator(`[data-proposal-id="${unlinked.id}"]`).click();await page.getByRole('button',{name:'Use this',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Recorded suggestion',exact:true})).toBeVisible();
    const adoptedUrl=page.url();await openPage(page, runtime.url+'/app');await page.locator(`[data-proposal-id="${unlinked.id}"]`).click();await page.getByRole('button',{name:'Use this',exact:true}).click();await expect(page).toHaveURL(adoptedUrl);
    expect((await state()).jobs).toEqual([]);
    await oversizedAdoption(page,runtime.url,unlinked.id,width,testInfo,runtime.sql);

  } finally {await runtime.close();}
});

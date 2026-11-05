import {expect,test} from '@playwright/test';
import {authoringRuntime} from './browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';
import {openPage,reloadPage} from '../support/navigation';

test('[PROP-003] saved email proposals label populations separately from recipient-steps and incomplete snapshots expose no counts or authority',async({page,request},info)=>{
  test.setTimeout(180000);
  const runtime=await authoringRuntime({suite:'proposal-counts'});
  try {
    const fixtureHeaders={'X-Test-Token':runtime.token};
    const opened=await request.post(runtime.url+'/_authoring/open',{headers:fixtureHeaders});
    expect(opened.status()).toBe(200);
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:(await opened.json()).token,url:runtime.url}]);
    const api=page.context().request;
    const state=async()=>{
      const response=await request.get(runtime.url+'/_authoring/state',{headers:fixtureHeaders});
      expect(response.status()).toBe(200);
      return response.json();
    };
    expect(await state()).toEqual({jobs:[],recipients:[],approvals:[]});
    const mutations:string[]=[];
    page.on('request',item=>{if(item.url().startsWith(runtime.url+'/api/')&&item.method()!=='GET')mutations.push(item.method()+' '+new URL(item.url()).pathname);});
    await page.setViewportSize({width:1440,height:1000});
    for(const snapshot of ['complete','missing-audience','missing-channel-counts']) {
      const fixture=await request.post(runtime.url+'/_authoring/proposal-counts',{headers:fixtureHeaders,data:{snapshot}});
      expect(fixture.status()).toBe(200);
      const {id}=await fixture.json();
      const read=async()=>{
        const response=await api.get(`${runtime.url}/api/proposals/${id}`);
        expect(response.status()).toBe(200);
        return response.json();
      };
      const detail=await read();
      expect(detail.proposal).toMatchObject({state:'proposed',campaignId:null});
      expect(detail.steps.map((step:{channel:string})=>step.channel)).toEqual(['email','email']);
      expect(detail.claimsUnavailable).toBeUndefined();
      await openPage(page,runtime.url+'/app');
      await page.locator(`[data-proposal-id="${id}"]`).click();
      const audience=page.locator('section.audience-snapshot');
      await expect(audience).toBeVisible();
      if(snapshot==='complete') {
        expect(detail.audienceState).toBe('saved');
        expect(detail.audience).toMatchObject({candidateCount:9,excludedCount:4,eligibleCount:5});
        expect(detail.audienceChannelCounts).toEqual([expect.objectContaining({channel:'email',recipientStepCount:10})]);
        const populations=audience.locator('dl.metric-row');
        await expect(populations.locator('dt')).toHaveText(['Candidates','Excluded','Eligible contacts']);
        await expect(populations.locator('dd')).toHaveText(['9','4','5']);
        await expect(populations).not.toContainText(/recipient/i);
        const channel=audience.getByLabel('Saved channel step counts');
        await expect(channel.locator('p').filter({has:page.locator('strong')})).toHaveText('Email10');
        await expect(channel.locator('strong')).toHaveText('10');
        await expect(audience.getByLabel('Saved audience exclusions')).toContainText('Unsubscribed4');
      } else {
        expect(detail.audienceState).toBe('needs_recomputation');
        expect(detail.audience).toBeUndefined();
        expect(detail.audienceChannelCounts).toEqual([]);
        await expect(audience.getByRole('heading',{name:'No saved audience snapshot'})).toBeVisible();
        await expect(audience).toContainText('No audience or message counts were saved');
        await expect(audience.locator('dd,strong')).toHaveCount(0);
        await expect(audience).not.toContainText(/recipient/i);
      }
      await reloadPage(page);
      await page.locator(`[data-proposal-id="${id}"]`).click();
      await expect(audience).toBeVisible();
      expect(await read()).toEqual(detail);
      // The phone capture records the same public screen; assertions run at
      // desktop width once, as the seed's verification budget requires.
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        await page.screenshot({path:info.outputPath(`proposal-counts-${snapshot}-${width}.png`),fullPage:true});
      }
      await page.setViewportSize({width:1440,height:1000});
    }
    expect(mutations).toEqual([]);
    expect(await state()).toEqual({jobs:[],recipients:[],approvals:[]});
    expect(await runtime.sql('SELECT (SELECT COUNT(*) FROM campaigns) AS campaigns,(SELECT COUNT(*) FROM campaign_revisions) AS revisions,(SELECT COUNT(*) FROM campaign_approval_requests) AS approvals,(SELECT COUNT(*) FROM recipient_steps) AS recipients')).toEqual([{campaigns:0,revisions:0,approvals:0,recipients:0}]);
    console.log('PROBE PROP-003 saved proposal reads: Candidates=9; Excluded=4; Eligible contacts=5; Email step count=10. Missing audience and missing channel counts: unavailable. Approval, recipient and dispatch authority: none.');
  } finally {await runtime.close();}
});

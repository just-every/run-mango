import {expect,test,type APIResponse} from '@playwright/test';
import {authoringRuntime} from './browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';
import {hydrated,openPage,reloadPage} from '../support/navigation';

test('[CAMP-021] start an editable newsletter within three clicks and adopt only live suggestions once without delivery authority',async({page},info)=>{
  test.setTimeout(300000);
  const runtime=await authoringRuntime({suite:'start-adopt'});
  try {
    const body=async(response:APIResponse,status=200)=>{
      expect(response.status(),await response.text()).toBe(status);return response.json();
    };
    const control=async(path:string)=>body(await page.request.get(runtime.url+'/_authoring/'+path,{headers:{'X-Test-Token':runtime.token}}));
    const session=await control('open');
    const headers={Cookie:`${localSessionCookieName(runtime.url)}=${session.token}`,Origin:runtime.url};
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:session.token,url:runtime.url}]);
    const read=async(id:string)=>body(await page.request.get(`${runtime.url}/api/campaigns/${id}`,{headers}));
    const noAuthority=async()=>expect(await control('state')).toEqual({jobs:[],recipients:[],approvals:[]});
    const save=async()=>{
      await page.getByRole('button',{name:'Save full draft',exact:true}).click();
      await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
      await noAuthority();
    };
    // Count actual browser click events across the document navigation to Review.
    // Opening Campaigns is the stated starting point, so it precedes the counter.
    await page.addInitScript(()=>document.addEventListener('click',()=>{
      sessionStorage.setItem('synthetic-mango-clicks',String(Number(sessionStorage.getItem('synthetic-mango-clicks')??0)+1));
    },true));
    const editable=async()=>{
      await hydrated(page);
      await expect(page.getByRole('textbox',{name:'Campaign name',exact:true})).toBeEditable();
      await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toBeEditable();
      await expect(page.getByRole('button',{name:'Save full draft',exact:true})).toBeEnabled();
    };
    const proof=async(name:string)=>{
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        await page.screenshot({path:info.outputPath(`${name}-${width}.png`),fullPage:true});
      }
      await page.setViewportSize({width:1440,height:1000});
    };
    const start=async(choice:string,label:string)=>{
      await openPage(page,runtime.url+'/app/campaigns');
      await page.evaluate(()=>sessionStorage.setItem('synthetic-mango-clicks','0'));
      await page.getByRole('button',{name:'New campaign',exact:true}).click();
      await proof(label+'-chooser');
      const created=page.waitForResponse(response=>response.url()===runtime.url+'/api/campaigns'&&response.request().method()==='POST');
      await page.getByRole('button',{name:choice,exact:true}).click();
      const response=await created;
      expect(response.status()).toBe(201);
      await expect(page).toHaveURL(new RegExp(runtime.url+'/app/campaigns/[^/]+/review$'));
      const campaignId=new URL(page.url()).pathname.split('/')[3];
      const result={campaignId,revisionId:(await read(campaignId)).revision.id};
      await editable();
      const clicks=await page.evaluate(()=>Number(sessionStorage.getItem('synthetic-mango-clicks')));
      expect(clicks).toBeGreaterThan(0);expect(clicks).toBeLessThanOrEqual(3);
      await noAuthority();await proof(label+'-review');
      console.log(`PROBE CAMP-021 acceptance-1 ${label}: Campaigns controls -> editable Review in ${clicks} clicks`);
      return result;
    };
    const modules=await body(await page.request.get(runtime.url+'/api/campaigns',{headers}));
    expect(modules).toMatchObject({commerceEnabled:false,aiEnabled:false});
    const blank=await start('Blank newsletter','blank');
    expect((await read(blank.campaignId)).revision).toMatchObject({state:'draft',emailSubject:'',approvedAt:null});
    await expect(page.getByRole('button',{name:'Rich text',exact:true})).toHaveAttribute('aria-pressed','true');
    await page.getByRole('textbox',{name:'Campaign name',exact:true}).fill('synthetic-mango-351');
    await save();
    expect((await read(blank.campaignId)).revision.name).toBe('synthetic-mango-351');
    const scheduledAt=new Date(Date.now()+3600000).toISOString(),sendByAt=new Date(Date.now()+7200000).toISOString();
    await body(await page.request.patch(`${runtime.url}/api/campaign-revisions/${blank.revisionId}`,{headers,data:{steps:[{channel:'email',timezone:'Etc/UTC',scheduledAt,sendByAt,whyThisTime:'Operator selected time'}]}}));
    const refused=await body(await page.request.post(`${runtime.url}/api/campaigns/${blank.campaignId}/approve`,{headers,data:{revisionId:blank.revisionId,idempotencyKey:'synthetic-mango-351'}}),409);
    const missing=refused.blockers.find((row:any)=>row.kind==='message.email-identity');
    expect(missing).toMatchObject({blocking:true,status:'blocked'});
    expect(missing.detail).toContain('subject');expect(missing.detail).toContain('message body');
    await reloadPage(page);
    await noAuthority();
    console.log('PROBE CAMP-021 acceptance-3: save incomplete draft then approve -> saved draft, missing-content refusal, zero approvals, recipients and jobs');
    const unstyled='<p>synthetic-mango-352 <strong>Garden news</strong></p>';
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();
    await page.getByRole('textbox',{name:'Email body',exact:true}).fill(unstyled);
    await save();await reloadPage(page);
    await expect(page.getByRole('button',{name:'Rich text',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveJSProperty('innerHTML',unstyled);
    await save();expect((await read(blank.campaignId)).revision.emailBody).toContain(unstyled);
    const imageHost='https://images.example.test',outbound:string[]=[];
    page.on('request',request=>{if(request.url().startsWith(imageHost))outbound.push(request.url());});
    const styled='<p style="color:#333333">synthetic-mango-353</p><img src="'+imageHost+'/synthetic-mango-353.png" width="200" height="100" alt="Synthetic garden">';
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();
    await page.getByRole('textbox',{name:'Email body',exact:true}).fill(styled);
    await save();await reloadPage(page);
    await expect(page.getByRole('button',{name:'HTML mode',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.getByRole('button',{name:'Rich text',exact:true})).toBeDisabled();
    await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveValue(styled);
    expect((await read(blank.campaignId)).revision.emailBody).toContain(styled);
    expect(outbound).toEqual([]);
    console.log('PROBE CAMP-021 acceptance-4: saved plain markup -> initial rich editor; styled image markup -> preserved HTML editor, zero remote image requests');
    await control('source');
    const starters=await body(await page.request.get(runtime.url+'/api/campaign-starters',{headers}));
    const source=starters.starters.find((item:any)=>item.title==='Product newsletter: Garden linen');
    expect(source).toMatchObject({available:true,sourceType:'product'});
    expect(source.evidence).toContain('gid://shopify/Product/1');
    const sourced=await start('Product newsletter: Garden linen','store');
    const sourceDraft=await read(sourced.campaignId);
    expect(sourceDraft.revision).toMatchObject({name:'Product newsletter: Garden linen',state:'draft',approvedAt:null});
    expect(sourceDraft.revision.emailBody).toContain('<h2>Garden linen</h2>');
    await page.getByRole('textbox',{name:'Campaign name',exact:true}).fill('synthetic-mango-354');await save();
    expect((await read(sourced.campaignId)).revision.name).toBe('synthetic-mango-354');

    // A successful unexpired adoption and linked UI reuse prevent a blanket
    // refusal from satisfying the expired-proposal safety proof below.
    const linked=await control('proposal');
    const adopt=(id:string)=>page.request.post(`${runtime.url}/api/proposals/${id}/adopt`,{headers,data:{}});
    const positive=await body(await adopt(linked.id));
    await openPage(page,runtime.url+'/app');
    await page.locator(`[data-proposal-id="${linked.id}"]`).click();
    await page.getByRole('button',{name:'Use this',exact:true}).click();
    await expect(page).toHaveURL(`${runtime.url}/app/campaigns/${positive.campaignId}/review`);await editable();
    const live=await control('proposal');
    const winners=await Promise.all([adopt(live.id),adopt(live.id)]);
    const results=await Promise.all(winners.map(response=>body(response)));
    expect(results[0]).toMatchObject({kind:'draft',campaignId:expect.any(String)});
    expect(results[1]).toEqual(results[0]);
    const liveState=await control('adoption-state');
    expect(liveState.campaigns.filter((row:any)=>row.proposal_id===live.id)).toHaveLength(1);
    expect(liveState.campaigns.filter((row:any)=>row.proposal_id===linked.id)).toHaveLength(1);
    expect(liveState.campaign_revisions.filter((row:any)=>row.campaign_id===results[0].campaignId)).toHaveLength(1);
    await noAuthority();
    console.log('PROBE CAMP-021 acceptance-2 controls: Decision Desk Use this -> linked draft reused; concurrent live adoption -> one campaign and one revision');
    const unlinked=await control('proposal');
    for(const proposal of [linked,unlinked]) {
      const expired=await body(await page.request.post(runtime.url+'/_authoring/proposal-expiry',{headers:{'X-Test-Token':runtime.token},data:{id:proposal.id}}));
      expect(expired.changed).toBe(1);
      const before=await control('adoption-state');
      for(let replay=0;replay<2;replay++) {
        const unavailable=await body(await adopt(proposal.id),409);
        expect(unavailable).toEqual({kind:'unavailable',detail:'Only an unexpired proposed suggestion can become a draft.'});
        expect(await control('adoption-state')).toEqual(before);
        await noAuthority();
      }
      const detail=await body(await page.request.get(`${runtime.url}/api/proposals/${proposal.id}`,{headers}));
      expect(detail.proposal).toMatchObject({state:'expired',campaignId:proposal.id===linked.id?positive.campaignId:null});
      expect(detail.history.filter((row:any)=>row.toState==='expired')).toEqual([expect.objectContaining({fromState:'proposed',actorId:'system:send-by-deadline'})]);
      console.log(`PROBE CAMP-021 acceptance-2 ${proposal.id===linked.id?'linked':'unlinked'} expiry: native adopt and replay -> 409 unavailable; unchanged campaigns, revisions, steps, links and authority; one ordinary expiry transition`);
    }
  } finally {await runtime.close();}
});

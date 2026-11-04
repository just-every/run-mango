import {expect,type Page,type Response,type TestInfo} from '@playwright/test';
import {authoringRuntime} from './browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';
import {openPage,reloadPage} from '../support/navigation';

/** Native contacts and recorded orders drive the operator's live draft counts. */
export async function audienceExclusionsJourney(page:Page,info:TestInfo) {
  const runtime=await authoringRuntime({suite:'audience-exclusions'});
  try {
    await page.context().setExtraHTTPHeaders({});
    const control=async(path:string)=>{
      const response=await page.request.get(runtime.url+path,{headers:{'X-Test-Token':runtime.token}});
      expect(response.status(),await response.text()).toBe(200);
      return response.json();
    };
    const session=await control('/_authoring/open');
    await control('/_authoring/exclusion-contacts');
    const headers={Cookie:`${localSessionCookieName(runtime.url)}=${session.token}`,Origin:runtime.url};
    const inclusion={version:1,operator:'all',predicates:[{sourceType:'contact',field:'displayName',comparator:'contains',value:'synthetic-mango-20'}]};
    const created=await page.request.post(runtime.url+'/api/campaigns',{headers,data:{}});
    expect(created.status(),await created.text()).toBe(201);
    const {campaignId,revisionId}=await created.json();
    const saved=await page.request.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`,{headers,data:{
      name:'synthetic-mango-206',emailSubject:'Synthetic audience proof',emailBody:'<p>Garden news</p>',
      inclusionRuleJson:JSON.stringify(inclusion),exclusionRulesJson:'[]',
      steps:[0,1].map(n=>({channel:'email',timezone:'UTC',scheduledAt:`2031-11-04T${10+n}:00:00.000Z`,sendByAt:`2031-11-04T${12+n}:00:00.000Z`,whyThisTime:'Operator selected time'})),
    }});
    expect(saved.status(),await saved.text()).toBe(200);
    const read=async()=>{
      const response=await page.request.get(`${runtime.url}/api/campaigns/${campaignId}`,{headers});
      expect(response.status()).toBe(200);return response.json();
    };
    const contacts=await page.request.get(runtime.url+'/api/audience',{headers});
    expect(contacts.status()).toBe(200);
    expect((await contacts.json()).contacts.filter((row:any)=>row.displayName.startsWith('synthetic-mango-20')).map((row:any)=>[row.displayName,row.emailStatus]).sort()).toEqual([
      ['synthetic-mango-201','subscribed'],['synthetic-mango-202','subscribed'],['synthetic-mango-203','subscribed'],['synthetic-mango-204','unsubscribed'],
    ]);
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:session.token,url:runtime.url}]);
    await page.setViewportSize({width:1440,height:1000});
    const estimate=page.getByLabel('Live audience estimate',{exact:true});
    const field=(name:string)=>page.getByLabel(name,{exact:true});
    const audienceResponse=(exclusions:unknown[],include=inclusion)=>page.waitForResponse(response=>{
      if(response.url()!==runtime.url+'/api/campaign-authoring/audience'||response.request().method()!=='POST')return false;
      const body=response.request().postDataJSON();
      return body.inclusionRuleJson===JSON.stringify(include)&&body.exclusionRulesJson===JSON.stringify(exclusions);
    });
    const counts=async(response:Response,eligible:number,excluded:number,candidates=4)=>{
      expect(response.status()).toBe(200);
      const request=response.request().postDataJSON();
      expect(request.channels).toEqual(['email']);expect(request.stepCounts).toEqual({email:2,sms:0});
      const result=await response.json();
      expect(result).toMatchObject({status:'ok',candidateCount:candidates,eligibleCount:eligible,excludedCount:excluded,
        channelCounts:[{channel:'email',stepCount:2,eligibleContactCount:eligible,recipientStepCount:eligible*2}]});
      await expect(estimate).toContainText(`${candidates} candidate${candidates===1?'':'s'} · ${eligible} eligible contact${eligible===1?'':'s'} · ${excluded} excluded contact${excluded===1?'':'s'}`);
      await expect(estimate).toContainText(`Email: ${eligible} eligible contact${eligible===1?'':'s'} · ${eligible*2} message${eligible*2===1?'':'s'} across 2 steps`);
      console.log(`PROBE CAMP-020 counts: candidates=${candidates} eligible=${eligible} excluded=${excluded} emailSteps=${eligible*2}`);
      return result;
    };
    const noAuthority=async()=>{
      expect(await control('/_authoring/state')).toEqual({jobs:[],recipients:[],approvals:[]});
      const detail=await read();expect(detail.campaign.state).toBe('draft');expect(detail.revision.state).toBe('draft');expect(detail.revision.approvedAt).toBeNull();
    };
    const saveAndReopen=async(exclusions:Array<{predicate:{sourceType:string;field:string;comparator:string;value:string}}>,eligible:number,excluded:number)=>{
      await page.getByRole('button',{name:'Save full draft',exact:true}).click();
      await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
      const detail=await read();
      expect(JSON.parse(detail.revision.inclusionRuleJson)).toEqual(inclusion);
      expect(JSON.parse(detail.revision.exclusionRulesJson)).toEqual(exclusions);
      const response=audienceResponse(exclusions);await reloadPage(page);await counts(await response,eligible,excluded);
      for(const [index,{predicate}]of exclusions.entries()) {
        await expect(field(`Exclude ${index+1} field`)).toHaveValue(`${predicate.sourceType}:${predicate.field}`);
        await expect(field(`Exclude ${index+1} comparison`)).toHaveValue(predicate.comparator);
        await expect(field(`Exclude ${index+1} value`)).toHaveValue(predicate.value);
      }
      await noAuthority();
    };
    let response=audienceResponse([]);
    await openPage(page,`${runtime.url}/app/campaigns/${campaignId}/review`);await counts(await response,3,1);
    // Inclusion edits still reach the native selection door with independent totals.
    const narrow={...inclusion,predicates:[{...inclusion.predicates[0],value:'synthetic-mango-201'}]};
    response=audienceResponse([],narrow);await field('Include 1 value').fill('synthetic-mango-201');await counts(await response,1,0,1);
    response=audienceResponse([]);await field('Include 1 value').fill('synthetic-mango-20');await counts(await response,3,1);
    await page.getByRole('button',{name:'Add exclusion',exact:true}).click();
    await field('Exclude 1 field').selectOption('contact:displayName');
    const exclusion={version:1,reason:'operator-exclusion-1',predicate:{sourceType:'contact',field:'displayName',comparator:'contains',value:'synthetic-mango-201'}};
    response=audienceResponse([exclusion]);await field('Exclude 1 value').fill('synthetic-mango-201');
    expect((await counts(await response,2,2)).exclusions).toContainEqual({reason:exclusion.reason,count:1});
    await noAuthority();await saveAndReopen([exclusion],2,2);
    const changed={...exclusion,predicate:{...exclusion.predicate,comparator:'neq'}};
    response=audienceResponse([changed]);await field('Exclude 1 comparison').selectOption('neq');
    expect((await counts(await response,1,3)).exclusions).toContainEqual({reason:exclusion.reason,count:3});
    await noAuthority();await saveAndReopen([changed],1,3);
    // Capture this same changed screen once at each required proof width.
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.getByRole('group',{name:'Who should receive this?',exact:true}).screenshot({path:info.outputPath(`audience-exclusions-${width}.png`)});
    }
    await page.setViewportSize({width:1440,height:1000});
    response=audienceResponse([]);await page.getByRole('button',{name:'Remove exclusion 1',exact:true}).click();await counts(await response,3,1);
    await saveAndReopen([],3,1);await expect(field('Exclude 1 field')).toHaveCount(0);
    // Hold an actual old native response until a newer rule has rendered.
    let held!:()=>void,release!:()=>void,finished!:()=>void;
    const requested=new Promise<void>(resolve=>{held=resolve;}),gate=new Promise<void>(resolve=>{release=resolve;}),delivered=new Promise<void>(resolve=>{finished=resolve;});
    await page.route(runtime.url+'/api/campaign-authoring/audience',async route=>{
      const result=await route.fetch();held();await gate;await route.fulfill({response:result});finished();
    },{times:1});
    await field('Include 1 value').fill('synthetic-mango-201');await requested;
    response=audienceResponse([]);await field('Include 1 value').fill('synthetic-mango-20');await counts(await response,3,1);
    const oldResponse=audienceResponse([],narrow);release();await delivered;expect((await (await oldResponse).json()).eligibleCount).toBe(1);
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    await expect(estimate).toContainText('4 candidates · 3 eligible contacts · 1 excluded contact');
    // A real recorded order changes an exclusion; missing and stale sources cannot show plausible counts.
    await page.getByRole('button',{name:'Add exclusion',exact:true}).click();
    await field('Exclude 1 field').selectOption('order:total');await field('Exclude 1 comparison').selectOption('gt');
    const orderExclusion={version:1,reason:'operator-exclusion-1',predicate:{sourceType:'order',field:'total',comparator:'gt',value:90}};
    response=audienceResponse([orderExclusion]);await field('Exclude 1 value').fill('90');
    const missing=await (await response).json();expect(missing).toMatchObject({status:'unavailable',candidateCount:null,eligibleCount:null,excludedCount:null,channelCounts:null});
    await expect(estimate).toContainText('Counts unavailable.');
    await control('/_authoring/exclusion-source');
    // Editing the threshold requests the now-current evidence without replacing it with a fake response.
    const current={...orderExclusion,predicate:{...orderExclusion.predicate,value:95}};
    response=audienceResponse([current]);await field('Exclude 1 value').fill('95');await counts(await response,2,2);
    await control('/_authoring/exclusion-source-stale');
    response=audienceResponse([orderExclusion]);await field('Exclude 1 value').fill('90');
    expect(await (await response).json()).toMatchObject({status:'stale',candidateCount:null,eligibleCount:null,excludedCount:null,channelCounts:null});
    await expect(estimate).toContainText('Counts unavailable.');await noAuthority();
  } finally {await runtime.close();}
}

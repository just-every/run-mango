import {test,expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {segmentFixture} from './segment-fixture';
import {json,draftCampaign,approve} from '../go-live/harness';
import {openPage} from '../support/navigation';
import {catalogSegmentJourney} from './segment-catalog';

export async function segmentJourney(page:Page,info:TestInfo) {
  page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(30000);
  const f=await segmentFixture(),{site,cookie,people,now}=f;
  try {
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.setViewportSize({width:1440,height:1000});
    await openPage(page,site.runtime.url+'/app/audience');
    await page.getByRole('button',{name:'Create segment',exact:true}).click();
    await page.getByLabel('Segment name',{exact:true}).fill('California repeat gardeners');
    const field=(label:string)=>page.getByLabel(label,{exact:true});
    await field('Include 1 field').selectOption('order:count');
    await field('Include 1 comparison').selectOption('gte');
    await field('Include 1 value').fill('2');
    await field('Include 1 lookback days').fill('90');
    await page.getByRole('button',{name:'Add Include 1 event filter',exact:true}).click();
    await field('Include 1 filter 1 value').fill('50');
    await page.getByRole('button',{name:'Add Include 1 event filter',exact:true}).click();
    await field('Include 1 filter 2 property').selectOption('total.shop.currency');
    await field('Include 1 filter 2 comparison').selectOption('eq');
    await field('Include 1 filter 2 value').fill('USD');
    await page.getByRole('button',{name:'Add inclusion condition',exact:true}).click();
    await field('Include 2 field').selectOption('contact:usState');
    await field('Include 2 value').fill('CA');
    await page.getByRole('button',{name:'Add Include group',exact:true}).click();
    await field('Include group 1 1 field').selectOption('contact:property');
    await field('Include group 1 1 property name').fill('interest');
    await field('Include group 1 1 value').fill('vegetables');
    await page.getByRole('button',{name:'Add Include group 1 condition',exact:true}).click();
    await field('Include group 1 2 field').selectOption('contact:zip');
    await field('Include group 1 2 value').fill('94103');
    const estimate=page.getByLabel('Live audience estimate',{exact:true});
    await expect(estimate).toContainText('2 candidates · 2 eligible contacts · 0 excluded contacts');
    const summary=page.getByLabel('Audience conditions summary',{exact:true});
    for(const part of ['Placed Order','2','90','50','USD','US state','CA','any of','interest','vegetables','94103'])await expect(summary).toContainText(part);
    await page.getByRole('button',{name:'Save segment',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Segment saved'})).toBeVisible();
    const saved=(await json(await site.call('/api/audience/segments',{cookie}),200)).segments.find((s:any)=>s.name==='California repeat gardeners');
    expect(saved).toBeTruthy();
    const conditions=JSON.parse(saved.inclusionRuleJson);
    expect(conditions.groups[0].operator).toBe('any');
    expect(conditions.predicates[0].filters).toEqual([{field:'total.shop.amount',comparator:'gt',value:50},{field:'total.shop.currency',comparator:'eq',value:'USD'}]);
    await page.getByRole('button',{name:'Edit California repeat gardeners',exact:true}).click();
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await expect(estimate).toContainText('2 eligible contacts');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await test.step(`Accessibility at ${width}`,async()=>expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]),{timeout:30000});
      await page.locator('[aria-labelledby="segments-title"]').screenshot({path:info.outputPath(`segment-builder-${width}.png`)});
    }
    const campaign=await draftCampaign(site,cookie,'California repeat gardeners',people.map(p=>p.email),new Date(now+3600000));
    const setRules=async(rule:unknown)=>json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie,body:{inclusionRuleJson:JSON.stringify(rule)}}),200);
    const review=async()=>json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
    await setRules(conditions);
    expect(await review()).toMatchObject({candidateCount:2,eligibleCount:2});
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await test.step(`Open review at ${width}`,()=>openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`));
      for(const part of ['Placed Order','US state','94103'])await expect(page.locator('main')).toContainText(part);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      // Axe cannot enter the intentionally sandboxed authored-email preview.
      await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('The spring beds are in.');
      await test.step(`Review accessibility at ${width}`,async()=>expect((await new AxeBuilder({page}).exclude('iframe[title="Saved email preview"]').analyze()).violations).toEqual([]),{timeout:30000});
      await page.screenshot({path:info.outputPath(`segment-review-${width}.png`),fullPage:true});
    }
    // Intersect the saved segment with each actual contact through review. Equal
    // total counts alone cannot prove that the right people were selected.
    for(const [index,person]of people.entries()) {
      await setRules({...conditions,predicates:[...conditions.predicates,{sourceType:'contact',field:'id',comparator:'eq',value:person.id}]});
      const expected=index===0||index===4?1:0;
      expect(await review(),person.email).toMatchObject({candidateCount:expected,eligibleCount:expected});
    }
    // Recount is current: narrowing either a nested group or the event window
    // changes review, without editing the saved segment or its source records.
    await setRules({...conditions,groups:[{...conditions.groups[0],operator:'all'}]});
    expect(await review()).toMatchObject({candidateCount:0,eligibleCount:0});
    await setRules({...conditions,predicates:conditions.predicates.map((p:any)=>p.field==='count'?{...p,lookbackDays:30}:p)});
    expect(await review()).toMatchObject({candidateCount:1,eligibleCount:1});
    // Every currently recorded condition uses the same public selection door.
    const variants:Array<[Record<string,unknown>,number]>=[
      [{field:'property',property:'interest',value:'vegetables'},1],
      [{field:'tags',comparator:'contains',value:'local'},1],
      [{field:'consent',channel:'email',value:true},8],
      [{field:'consent',channel:'sms',value:true},0],
      [{field:'topic',channel:'email',topicId:'newsletter',value:true},8],
      [{field:'topic',channel:'email',topicId:'other',value:true},0],
      [{field:'zip',value:'94102'},6],
      [{field:'distanceMiles',originZip:'94102',comparator:'lte',value:10},7],
      [{field:'rfmStage',value:'active'},5],
      [{field:'rfmFrequency',comparator:'gte',value:2},5],
      [{sourceType:'order',field:'boughtProductId',value:'gid://shopify/Product/21'},7],
      [{field:'clicked',channel:'email',lookbackDays:7,value:true},0],
      [{field:'clicked',channel:'sms',lookbackDays:7,value:true},0],
    ];
    for(const [condition,count]of variants) {
      await setRules({version:1,operator:'all',predicates:[{sourceType:'contact',comparator:'eq',...condition}]});
      expect(await review(),JSON.stringify(condition)).toMatchObject({candidateCount:count,eligibleCount:count});
    }
    await setRules(conditions);
    expect(await review()).toMatchObject({candidateCount:2,eligibleCount:2});
    await approve(site,cookie,campaign);
    const selected=await site.rows(`SELECT contact_id FROM campaign_revision_candidates WHERE revision_id='${campaign.revisionId}' ORDER BY contact_id`);
    expect(selected.map(r=>r.contact_id)).toEqual([people[0].id,people[4].id].sort());
    expect((await json(await site.call('/api/audience/segments',{cookie}),200)).segments.find((s:any)=>s.id===saved.id)).toEqual(saved);
    await catalogSegmentJourney(page,info,f);
    await openPage(page,site.runtime.url+'/app/audience');
    await page.getByRole('button',{name:'Create segment',exact:true}).click();
    await field('Include 1 field').selectOption('browsing:productId');
    await field('Include 1 value').fill('gid://shopify/Product/21');
    const lookback=field('Include 1 lookback days');
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await expect(page.getByText('Onsite windows stop at 90 days because identified onsite events are deleted after 90 days.',{exact:true})).toBeVisible();
      await lookback.fill('91');
      expect(await lookback.evaluate((input:HTMLInputElement)=>input.validity.rangeOverflow)).toBe(true);
      await lookback.fill('90');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
      expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
      await page.locator('[aria-labelledby="segments-title"]').screenshot({path:info.outputPath(`onsite-window-${width}.png`)});
    }
    const overlong={name:'Too old onsite audience',inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'browsing',field:'productId',comparator:'eq',value:'gid://shopify/Product/21',lookbackDays:91}]}),exclusionRulesJson:'[]'};
    expect((await site.call('/api/audience/segments',{method:'POST',cookie,body:overlong})).status).toBe(400);
    expect(f.edge.unexpected).toEqual([]);
  }finally{await f.close();}
}

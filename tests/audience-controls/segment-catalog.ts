import {test,expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {json,draftCampaign} from '../go-live/harness';
import {syncSource} from '../go-live/source-edge';
import {product} from '../shopify/fixtures';
import {openPage} from '../support/navigation';
import {catalog,type segmentFixture} from './segment-fixture';

/** Collection and category purchases resolve through the synced Shopify catalog
 * and the same builder, estimate and review doors as every other condition. */
export async function catalogSegmentJourney(page:Page,info:TestInfo,f:Awaited<ReturnType<typeof segmentFixture>>) {
  const {site,cookie,people,now}=f;
  const bought=(field:'boughtCollectionId'|'boughtCategory',value:string)=>({sourceType:'order',field,comparator:'eq',value});
  const only=(predicate:unknown)=>({version:1,operator:'all',predicates:[predicate]});
  const estimate=async(rule:unknown)=>json(await site.call('/api/campaign-authoring/audience',{method:'POST',cookie,body:{inclusionRuleJson:JSON.stringify(rule),exclusionRulesJson:'[]',channels:['email']}}),200);
  // Before the catalog is recorded the conditions are unavailable, never an empty match.
  for(const predicate of [bought('boughtCollectionId',catalog.spring),bought('boughtCategory',catalog.seeds)]) {
    const unavailable=await estimate(only(predicate));
    expect(unavailable.status,JSON.stringify(predicate)).not.toBe('ok');
    expect(unavailable.candidateCount).toBeNull();
  }
  await syncSource(site,cookie,'product');

  await page.setViewportSize({width:1440,height:1000});
  await openPage(page,site.runtime.url+'/app/audience');
  await page.getByRole('button',{name:'Create segment',exact:true}).click();
  await page.getByLabel('Segment name',{exact:true}).fill('Spring planting buyers');
  const field=(label:string)=>page.getByLabel(label,{exact:true});
  await field('Include 1 field').selectOption('contact:usState');
  await field('Include 1 value').fill('CA');
  await page.getByRole('button',{name:'Add Include group',exact:true}).click();
  await field('Include group 1 1 field').selectOption('order:boughtCollectionId');
  await field('Include group 1 1 value').fill(catalog.spring);
  await page.getByRole('button',{name:'Add Include group 1 condition',exact:true}).click();
  await field('Include group 1 2 field').selectOption('order:boughtCategory');
  await field('Include group 1 2 value').fill(catalog.seeds);
  const live=page.getByLabel('Live audience estimate',{exact:true});
  await expect(live).toContainText('2 candidates · 2 eligible contacts · 0 excluded contacts');
  const summary=page.getByLabel('Audience conditions summary',{exact:true});
  for(const part of ['US state','CA','any of','Bought collection ID',catalog.spring,'Bought category',catalog.seeds])await expect(summary).toContainText(part);
  await page.getByRole('button',{name:'Save segment',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Segment saved'})).toBeVisible();
  const saved=(await json(await site.call('/api/audience/segments',{cookie}),200)).segments.find((s:any)=>s.name==='Spring planting buyers');
  const conditions=JSON.parse(saved.inclusionRuleJson);
  expect(conditions.groups).toEqual([{operator:'any',predicates:[bought('boughtCollectionId',catalog.spring),bought('boughtCategory',catalog.seeds)]}]);
  await page.getByRole('button',{name:'Edit Spring planting buyers',exact:true}).click();
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await expect(live).toContainText('2 eligible contacts');
    await expect(summary).toContainText('Bought category');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await test.step(`Catalog builder accessibility at ${width}`,async()=>expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]),{timeout:30000});
    await page.locator('[aria-labelledby="segments-title"]').screenshot({path:info.outputPath(`segment-catalog-builder-${width}.png`)});
  }

  const campaign=await draftCampaign(site,cookie,'Spring planting buyers',people.map(p=>p.email),new Date(now+7200000));
  const setRules=async(rule:unknown)=>json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie,body:{inclusionRuleJson:JSON.stringify(rule)}}),200);
  const review=async()=>json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
  // Exact membership: intersect each rule with every contact through review,
  // and the builder's estimate door agrees with review's total.
  async function members(rule:any,expected:number[]) {
    await setRules(rule);
    expect(await review(),JSON.stringify(rule)).toMatchObject({candidateCount:expected.length,eligibleCount:expected.length});
    expect(await estimate(rule)).toMatchObject({status:'ok',candidateCount:expected.length,eligibleCount:expected.length});
    for(const [index,person]of people.entries()) {
      await setRules({version:1,operator:'all',predicates:[{sourceType:'contact',field:'id',comparator:'eq',value:person.id}],groups:[{operator:rule.operator,predicates:rule.predicates,...(rule.groups?{groups:rule.groups}:{})}]});
      const count=expected.includes(index)?1:0;
      expect(await review(),`${person.email} ${JSON.stringify(rule)}`).toMatchObject({candidateCount:count,eligibleCount:count});
    }
  }
  // Person 0 bought Spring planting (second collection page) and Seeds; 1 only
  // Tools; 2 Spring planting; 3 Seeds in NY; 6 Seeds only in a future order;
  // 4, 5 and 7 bought nothing in a collection or category.
  await members(conditions,[0,2]);
  await members(only(bought('boughtCollectionId',catalog.spring)),[0,2]);
  await members(only(bought('boughtCategory',catalog.seeds)),[0,3]);
  await members({version:1,operator:'any',predicates:conditions.groups[0].predicates},[0,2,3]);
  await setRules(conditions);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await test.step(`Open catalog review at ${width}`,()=>openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`));
    for(const part of ['US state','Bought collection ID',catalog.spring,'Bought category'])await expect(page.locator('main')).toContainText(part);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    // Axe cannot enter the intentionally sandboxed authored-email preview.
    await test.step(`Catalog review accessibility at ${width}`,async()=>expect((await new AxeBuilder({page}).exclude('iframe[title="Saved email preview"]').analyze()).violations).toEqual([]),{timeout:30000});
    await page.screenshot({path:info.outputPath(`segment-catalog-review-${width}.png`),fullPage:true});
  }
  // Shopify removes product 25 from Spring planting. Membership follows the
  // recorded catalog, so its earlier buyer leaves the collection condition.
  f.catalog.set(25,{...product(25,[],'Home & Garden > Lawn & Garden > Fertilizers'),updatedAt:new Date(now).toISOString()});
  await syncSource(site,cookie,'product');
  await members(conditions,[0]);
  await members(only(bought('boughtCollectionId',catalog.spring)),[0]);
  expect((await json(await site.call('/api/audience/segments',{cookie}),200)).segments.find((s:any)=>s.id===saved.id)).toEqual(saved);
}

import {expect,type Page} from '@playwright/test';
import type {AudiencePredicate} from '../../src/core/features/lifecycle/rules';
import type {segmentFixture} from './segment-fixture';
import {json} from '../go-live/harness';
import {openPage} from '../support/navigation';

type Case={predicate:AudiencePredicate;label:string;comparison:RegExp;scope?:string[]};
const contact=(field:string,comparator:AudiencePredicate['comparator'],value:AudiencePredicate['value'],extra:Partial<AudiencePredicate>={}):AudiencePredicate=>({sourceType:'contact',field,comparator,value,...extra});
const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

/** Independently chosen values and meanings. No production formatter or label table is an oracle. */
export async function audienceSummaryCases(page:Page,f:Awaited<ReturnType<typeof segmentFixture>>,campaign:{campaignId:string;revisionId:string}) {
  const {site,cookie,people}=f;
  await json(await site.call('/api/settings/properties',{method:'POST',cookie,body:{key:'summary_date',label:'Garden visit date',type:'date'}}),201);
  await json(await site.call(`/api/contacts/${people[0].id}/properties`,{method:'PUT',cookie,body:{fields:{summary_date:'2026-01-15'}}}),200);
  const cases:Case[]=[
    {predicate:contact('id','eq',people[0].id),label:'Contact ID',comparison:/^is$/},
    {predicate:contact('emailStatus','neq','unsubscribed'),label:'Email subscription status',comparison:/^is not$/},
    {predicate:contact('smsStatus','eq','never-subscribed'),label:'SMS subscription status',comparison:/^is$/},
    {predicate:contact('displayName','contains','Garden'),label:'Contact name',comparison:/^contains$/},
    {predicate:contact('email','contains','synthetic-mango-'),label:'Email address',comparison:/^contains$/},
    {predicate:contact('property','eq','vegetables',{property:'interest'}),label:'Contact property',comparison:/^is$/,scope:['interest']},
    {predicate:contact('tags','in',['local','market']),label:'Tags',comparison:/^is one of$/},
    {predicate:contact('consent','eq',true,{channel:'email'}),label:'Confirmed channel consent',comparison:/^is$/,scope:['EMAIL']},
    {predicate:contact('topic','neq',false,{channel:'sms',topicId:'newsletter'}),label:'Confirmed topic consent',comparison:/^is not$/,scope:['SMS','newsletter']},
    {predicate:contact('usState','in',['CA','NY']),label:'US state',comparison:/^is one of$/},
    {predicate:contact('zip','eq','94103'),label:'US ZIP code',comparison:/^is$/},
    {predicate:contact('distanceMiles','lte',25,{originZip:'94102'}),label:'Distance in miles from ZIP (Census area points)',comparison:/^is at most$/,scope:['94102']},
    {predicate:contact('clicked','eq',false,{channel:'email',lookbackDays:7}),label:'Human click',comparison:/^is$/,scope:['EMAIL']},
    {predicate:contact('paidMember','eq',false,{channel:'email'}),label:'Paid topic member',comparison:/^is$/,scope:['EMAIL']},
    {predicate:contact('rfmStage','eq','active'),label:'RFM lifecycle stage',comparison:/^is$/},
    {predicate:contact('rfmRecencyDays','lt',30),label:'RFM days since last order',comparison:/^is less than$/},
    {predicate:contact('rfmRecencyScore','gt',1),label:'RFM recency score',comparison:/^is greater than$/},
    {predicate:contact('rfmFrequency','gte',2),label:'RFM order frequency',comparison:/^is at least$/},
    {predicate:contact('rfmFrequencyScore','neq',0),label:'RFM frequency score',comparison:/^is not$/},
    {predicate:contact('rfmMonetaryScore','lte',5,{currency:'USD'}),label:'RFM monetary score',comparison:/^is at most$/,scope:['USD']},
    {predicate:contact('rfmMonetaryMinor','gte',1000,{currency:'AUD'}),label:'RFM monetary value (minor currency units)',comparison:/^is at least$/,scope:['AUD']},
    ...([
      ['count','Placed Order count',2,'gte',/^is at least$/],
      ['boughtProductId','Bought product ID','gid://shopify/Product/21','eq',/^is$/],
      ['boughtCollectionId','Bought collection ID','gid://shopify/Collection/801','neq',/^is not$/],
      ['boughtCategory','Bought category','Home & Garden > Lawn & Garden > Gardening > Seeds','contains',/^contains$/],
      ['productId','Purchased product ID','gid://shopify/Product/22','eq',/^is$/],
      ['total','Order total',50,'gt',/^is greater than$/],
    ] as const).map(([field,label,value,comparator,comparison])=>({predicate:{sourceType:'order' as const,field,comparator,value,lookbackDays:90,...(field==='count'?{filters:[{field:'total.shop.amount',comparator:'gt' as const,value:50},{field:'total.shop.currency',comparator:'eq' as const,value:'USD'},{field:'financialStatus',comparator:'eq' as const,value:'paid'},{field:'customer.location.provinceCode',comparator:'eq' as const,value:'CA'}]}:{})},label,comparison})),
    {predicate:{sourceType:'cart',field:'productId',comparator:'eq',value:'synthetic-mango-cart-product',lookbackDays:1},label:'Cart product ID',comparison:/^is$/},
    {predicate:{sourceType:'browsing',field:'productId',comparator:'eq',value:'synthetic-mango-viewed-product',lookbackDays:0},label:'Viewed product ID',comparison:/^is$/},
    ...(['on','before','after','within_last','not_within_last'] as const).map((comparator,index)=>({predicate:contact('property',comparator,index<3?'2026-01-15':30,{property:'summary_date'}),label:'Contact property',comparison:[/^is on$/,/^is before$/,/^is after$/,/^is within the last days$/,/^is not within the last days$/][index],scope:['summary_date']})),
  ];
  // Two bounded saved drafts cover the editor vocabulary and every comparison,
  // including zero and one day, arrays, numeric, boolean and date values.
  for(let offset=0;offset<cases.length;offset+=17) {
    const batch=cases.slice(offset,offset+17),operator=offset===0?'all':'any';
    const inclusion={version:1,operator,predicates:batch.map(item=>item.predicate)};
    const exclusion={version:1,reason:'synthetic-mango-matrix-exclusion',predicate:contact('displayName','neq','Garden customer 1')};
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{inclusionRuleJson:JSON.stringify(inclusion),exclusionRulesJson:JSON.stringify([exclusion])}}),200);
    const detail=await json(await site.call(`/api/campaigns/${campaign.campaignId}/review`,{cookie}),200);
    expect(JSON.parse(detail.revision.inclusionRuleJson)).toEqual(inclusion);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    const summary=await page.getByLabel('Audience conditions summary',{exact:true}).innerText();
    expect(summary).toMatch(new RegExp(`matching ${operator}\\b`));
    const fragments=summary.split(/conditions:\s*/i)[1].split('; ');
    for(const [index,item]of batch.entries()) {
      const label=`Include ${index+1}`;
      await expect(page.getByLabel(`${label} field`,{exact:true}).locator('option:checked')).toHaveText(item.label);
      await expect(page.getByLabel(`${label} comparison`,{exact:true})).toHaveValue(item.predicate.comparator);
      const comparison=await page.getByLabel(`${label} comparison`,{exact:true}).locator('option:checked').innerText();
      expect(comparison).toMatch(item.comparison);
      const fragment=fragments[index];
      expect(fragment).toMatch(new RegExp('^'+escape(item.label)+'(?: \\([^)]*\\))? '+escape(comparison)+' '));
      const value=Array.isArray(item.predicate.value)?JSON.stringify(item.predicate.value).replaceAll(',',', '):typeof item.predicate.value==='string'?`"${item.predicate.value}"`:String(item.predicate.value);
      expect(fragment).toContain(`${comparison} ${value}`);
      for(const scope of item.scope??[])expect(fragment).toContain(scope);
      if(item.predicate.lookbackDays!==undefined)expect(fragment).toMatch(new RegExp(`in the last ${item.predicate.lookbackDays} days?\\b`));
      for(const [filterIndex,filter]of (item.predicate.filters??[]).entries()) {
        const filterLabel=await page.getByLabel(`${label} filter ${filterIndex+1} property`,{exact:true}).locator('option:checked').innerText();
        const filterComparison=await page.getByLabel(`${label} filter ${filterIndex+1} comparison`,{exact:true}).locator('option:checked').innerText();
        expect(fragment).toContain(`${filterLabel} ${filterComparison} ${JSON.stringify(filter.value)}`);
      }
      if(item.predicate.filters?.length)expect(fragment).toMatch(/on the same event/);
    }
    expect(summary.split(/exclude contacts/i)[1]).toMatch(/Contact name\s+is not\s+"Garden customer 1"/);
    expect(detail.campaign.state).toBe('draft');
  }
  console.log(`PROBE AUD-010 condition-matrix: native draft saves and editor -> ${cases.length} condition cases preserve every chosen field, comparison, typed value, scope and lookback`);
}

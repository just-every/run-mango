import {expect,type Page,type TestInfo} from '@playwright/test';
import {segmentFixture} from './segment-fixture';
import {draftCampaign,json} from '../go-live/harness';
import {openPage,reloadPage} from '../support/navigation';
import type {ExclusionRule,InclusionRule} from '../../src/core/features/lifecycle/rules';

/** The expected meaning comes from the recorded garden customers, not a formatter. */
export async function audienceSummaryJourney(page:Page,info:TestInfo) {
  const f=await segmentFixture(),{site,cookie,people,now}=f;
  try {
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.setViewportSize({width:1440,height:1000});
    const name='synthetic-mango-107';
    const campaign=await draftCampaign(site,cookie,name,people.map(person=>person.email),new Date(now+3600000));
    const inclusion:InclusionRule={version:1,operator:'all',predicates:[{sourceType:'order',field:'count',comparator:'gte',value:2,lookbackDays:90}],
      groups:[{operator:'any',predicates:[{sourceType:'contact',field:'property',property:'interest',comparator:'eq',value:'vegetables'},
        {sourceType:'contact',field:'zip',comparator:'eq',value:'94103'}]}]};
    const exclusions:ExclusionRule[]=[{version:1,reason:'synthetic-mango-local-exclusion',predicate:{sourceType:'contact',field:'zip',comparator:'eq',value:'94102'}}];
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{
      inclusionRuleJson:JSON.stringify(inclusion),exclusionRulesJson:JSON.stringify(exclusions),audienceRule:'synthetic-mango-ignored-summary',
    }}),200);
    const read=async()=>json(await site.call(`/api/campaigns/${campaign.campaignId}/review`,{cookie}),200);
    const field=(label:string)=>page.getByLabel(label,{exact:true});
    const builder=page.getByLabel('Audience conditions summary',{exact:true});
    const row=page.locator('a.campaign-row').filter({has:page.getByText(name,{exact:true})});
    const rowSummary=row.locator('.campaign-row__audience');
    // Match the operators and each predicate's semantic components in its own
    // scope. Mere token presence would accept a value assigned to the wrong field.
    const meaning=(summary:string,minimum:number,excludedZip:string)=>{
      expect(summary).not.toContain('synthetic-mango-ignored-summary');
      expect(summary).not.toContain('Named contacts');
      const sections=summary.split(/\bexclude contacts\b/i);
      expect(sections).toHaveLength(2);
      const [included,excluded]=sections;
      expect(included).toMatch(/\bmatching all\b/i);
      expect(included).toMatch(new RegExp(`Placed Order count\\s+is at least\\s+${minimum}\\b\\s+in the last\\s+90\\s+days\\b`,'i'));
      expect(included).toMatch(/\(any of:\s*Contact property\s*\(property "interest"\)\s+is\s+"vegetables";\s*US ZIP code\s+is\s+"94103"\)/i);
      expect(excluded).toMatch(new RegExp(`\\bmatching any\\b[^:]*:\\s*US ZIP code\\s+is\\s+"${excludedZip}"`,'i'));
    };
    const saved=async(expectedInclusion:InclusionRule,expectedExclusions:ExclusionRule[])=>{
      const detail=await read();
      expect(JSON.parse(detail.revision.inclusionRuleJson)).toEqual(expectedInclusion);
      expect(JSON.parse(detail.revision.exclusionRulesJson)).toEqual(expectedExclusions);
      expect(detail.campaign.state).toBe('draft');expect(detail.revision.state).toBe('draft');expect(detail.revision.approvedAt).toBeNull();
      return detail;
    };
    const selection=async(rules:InclusionRule,custom:ExclusionRule[],eligibleIndex:number)=>{
      // The two candidates are independently known: customer 1 has vegetables
      // and customer 5 has ZIP 94103. Both have two recent orders. Changing the
      // exclusion swaps the sole eligible identity while preserving the total.
      for(const [index,person]of people.entries()) {
        const result=await json(await site.call('/api/campaign-authoring/audience',{method:'POST',cookie,body:{
          inclusionRuleJson:JSON.stringify({...rules,predicates:[...rules.predicates,{sourceType:'contact',field:'id',comparator:'eq',value:person.id}]}),
          exclusionRulesJson:JSON.stringify(custom),channels:['email'],stepCounts:{email:1,sms:0},
        }}),200);
        expect(result,`Customer ${index+1}`).toMatchObject({status:'ok',candidateCount:index===0||index===4?1:0,eligibleCount:index===eligibleIndex?1:0});
      }
    };
    const editor=async(minimum:number,excludedZip:string)=>{
      await expect(field('Match conditions')).toHaveValue('all');
      await expect(field('Include group 1 match conditions')).toHaveValue('any');
      for(const [label,value,title]of [
        ['Include 1 field','order:count','Placed Order count'],['Include 1 comparison','gte','is at least'],
        ['Include group 1 1 field','contact:property','Contact property'],['Include group 1 1 comparison','eq','is'],
        ['Include group 1 2 field','contact:zip','US ZIP code'],['Include group 1 2 comparison','eq','is'],
        ['Exclude 1 field','contact:zip','US ZIP code'],['Exclude 1 comparison','eq','is'],
      ]) {
        await expect(field(label)).toHaveValue(value);await expect(field(label).locator('option:checked')).toHaveText(title);
      }
      for(const [label,value]of [['Include 1 value',String(minimum)],['Include 1 lookback days','90'],
        ['Include group 1 1 property name','interest'],['Include group 1 1 value','vegetables'],['Include group 1 2 value','94103'],['Exclude 1 value',excludedZip]])await expect(field(label)).toHaveValue(value);
      meaning(await builder.innerText(),minimum,excludedZip);
      await expect(page.getByLabel('Live audience estimate',{exact:true})).toContainText('2 candidates · 1 eligible contact · 1 excluded contact');
    };
    const collection=async(minimum:number,excludedZip:string)=>{
      const list=await json(await site.call('/api/campaigns',{cookie}),200);
      const entry=list.campaigns.find((item:any)=>item.id===campaign.campaignId);
      expect(entry).toBeTruthy();meaning(entry.audienceSummary,minimum,excludedZip);
      await openPage(page,site.runtime.url+'/app/campaigns');
      await expect(row).toHaveCount(1);await expect(rowSummary).toHaveText(entry.audienceSummary);
      meaning(await rowSummary.innerText(),minimum,excludedZip);
    };
    const noAuthority=async()=>{
      for(const table of ['campaign_approval_requests','campaign_revision_candidates','recipient_steps'])expect(await site.count(table),table).toBe(0);
      expect((await site.control('/_golive/emissions')).filter((item:any)=>item.command.kind==='campaign.dispatch')).toEqual([]);
      expect(f.edge.sends.filter(send=>send.body.subject===`${name}: what is growing this month`)).toEqual([]);
    };
    await saved(inclusion,exclusions);await selection(inclusion,exclusions,4);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);await editor(2,'94102');
    await collection(2,'94102');await noAuthority();
    console.log('PROBE AUD-010 acceptance-1: saved nested rules -> authenticated collection and campaign row retain all conditions; one eligible customer 5, no delivery authority');
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    await field('Include 1 value').fill('1');await field('Exclude 1 value').fill('94103');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    const changed:InclusionRule={...inclusion,predicates:[{...inclusion.predicates[0],value:1}]};
    const changedExclusions:ExclusionRule[]=[{...exclusions[0],predicate:{...exclusions[0].predicate,value:'94103'}}];
    await saved(changed,changedExclusions);await reloadPage(page);await editor(1,'94103');
    await selection(changed,changedExclusions,0);await noAuthority();
    console.log('PROBE AUD-010 acceptance-2: edited numeric predicate and custom exclusion -> saved reload retains all and any, editor labels, values, comparison and 90-day window; sole eligible identity changes to customer 1');
    // Behaviour assertions above run at one width. These are the candidate's
    // editor and campaign-list browser proofs, once at each required width.
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();window.scrollTo(0,0);});
      await page.screenshot({path:info.outputPath(`audience-summary-editor-${width}.png`),fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1000});await collection(1,'94103');
    await reloadPage(page);meaning(await rowSummary.innerText(),1,'94103');
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await row.screenshot({path:info.outputPath(`audience-summary-list-${width}.png`)});
    }
    await saved(changed,changedExclusions);await noAuthority();expect(f.edge.unexpected).toEqual([]);
  }finally{await f.close();}
}

import {expect,type Page,type TestInfo} from '@playwright/test';
import {segmentFixture} from './segment-fixture';
import {audienceSummaryCases} from './audience-summary-cases';
import {draftCampaign,json,approve,dispatch} from '../go-live/harness';
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
    await saved(changed,changedExclusions);await noAuthority();
    await audienceSummaryCases(page,f,campaign);
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{inclusionRuleJson:JSON.stringify(changed),exclusionRulesJson:JSON.stringify(changedExclusions)}}),200);
    const checked=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
    expect(checked).toMatchObject({candidateCount:2,eligibleCount:1,exclusions:[{reason:'synthetic-mango-local-exclusion',count:1}]});
    const audienceCheck=checked.checks.find((check:any)=>check.kind==='audience.structured-rule');
    expect(audienceCheck).toMatchObject({status:'passed',blocking:false});meaning(audienceCheck.detail,1,'94103');
    const reviewed=await read();meaning(reviewed.revision.audienceRule,1,'94103');
    expect(reviewed.audience).toMatchObject({candidateCount:2,eligibleCount:1,excludedCount:1});
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    meaning(await page.locator('.saved-audience-summary').innerText(),1,'94103');
    meaning(await page.getByLabel('Saved audience rule',{exact:true}).innerText(),1,'94103');
    await page.getByText(/checks passed/,{exact:false}).first().click();
    meaning(await page.locator('.approval-checks .check-list__item').filter({has:page.getByText('Audience conditions',{exact:true})}).innerText(),1,'94103');
    await noAuthority();
    const approval=await approve(site,cookie,campaign);
    expect(approval.status).toBe('scheduled');expect(approval.revisionDigest).toEqual(expect.any(String));
    const immutable=await site.rows(`SELECT * FROM campaign_approval_requests WHERE revision_id='${campaign.revisionId}'`);
    expect(immutable).toHaveLength(1);
    const recipients=await site.rows(`SELECT * FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`);
    expect(recipients).toHaveLength(1);expect(recipients[0].contact_id).toBe(people[0].id);
    for(const path of [`/api/campaigns/${campaign.campaignId}`,`/api/campaigns/${campaign.campaignId}/review`]) {
      const detail=await json(await site.call(path,{cookie}),200);
      expect(detail.campaign.state).toBe('scheduled');meaning(detail.revision.audienceRule,1,'94103');
      expect(JSON.parse(detail.revision.inclusionRuleJson)).toEqual(changed);expect(JSON.parse(detail.revision.exclusionRulesJson)).toEqual(changedExclusions);
      meaning(detail.checks.find((check:any)=>check.kind==='audience.structured-rule').detail,1,'94103');
    }
    const maskedCookie=await site.open(people[7].email,'synthetic-mango-summary-analyst');
    await json(await site.call('/api/operators/synthetic-mango-summary-analyst/role',{method:'PUT',cookie,body:{role:'analyst'}}),200);
    const masked=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie:maskedCookie}),200);
    expect(masked.revision.audienceMasked).toBe(true);
    expect(masked.checks.find((check:any)=>check.kind==='audience.structured-rule').detail).not.toContain('vegetables');
    expect(JSON.stringify(masked)).not.toContain('interest');
    expect((await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:maskedCookie,body:{revisionId:campaign.revisionId}})).status).toBe(403);
    expect((await site.call('/api/auth/signout',{method:'POST',cookie:maskedCookie,headers:{Origin:site.runtime.url},body:{}})).status).toBe(204);
    expect((await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie:maskedCookie})).status).toBe(401);
    for(const suffix of ['', '/review','/scheduled']) {
      await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}${suffix}`);
      meaning(await page.getByLabel('Saved audience rule',{exact:true}).innerText(),1,'94103');
      if(suffix==='/review')meaning(await page.locator('.saved-audience-summary').innerText(),1,'94103');
      await reloadPage(page);meaning(await page.getByLabel('Saved audience rule',{exact:true}).innerText(),1,'94103');
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        await page.screenshot({path:info.outputPath(`audience-summary-${suffix===''?'detail':suffix.slice(1)}-${width}.png`),fullPage:true});
      }
      await page.setViewportSize({width:1440,height:1000});
    }
    await collection(1,'94103');
    expect(await site.rows(`SELECT * FROM campaign_approval_requests WHERE revision_id='${campaign.revisionId}'`)).toEqual(immutable);
    expect(await site.rows(`SELECT * FROM recipient_steps WHERE revision_id='${campaign.revisionId}'`)).toEqual(recipients);
    expect(f.edge.sends.filter(send=>send.body.subject===`${name}: what is growing this month`)).toEqual([]);
    console.log('PROBE AUD-010 display-doors: checks, review, detail, scheduled page, campaign list and saved audience snapshots -> independently reconciled saved meaning, unchanged approval and exact recipient identity after repeated reads');
    // A native follow-up is another supported condition: its saved cohort value
    // must not disappear behind the same generic sentence for every source.
    await site.control('/_golive/clock',{advanceMs:3600001,hold:true});
    expect((await dispatch(site,campaign.campaignId,new Date(now+3600000)))[0].transport_disposition).toBe('accepted');
    await site.control('/_golive/clock',{advanceMs:2*86400000,hold:true});
    const followup=await json(await site.call(`/api/campaigns/${campaign.campaignId}/followup`,{method:'POST',cookie,body:{subject:'synthetic-mango-followup',delayHours:48,metric:'click'}}),201);
    const followupDetail=await json(await site.call(`/api/campaigns/${followup.campaignId}/review`,{cookie}),200);
    const cohort=JSON.parse(followupDetail.revision.inclusionRuleJson).predicates[0].value;
    expect(await site.rows(`SELECT source_campaign_id,delay_hours,metric FROM campaign_followups WHERE id='${cohort}'`)).toEqual([{source_campaign_id:campaign.campaignId,delay_hours:48,metric:'click'}]);
    await openPage(page,`${site.runtime.url}/app/campaigns/${followup.campaignId}/review`);
    await expect(page.getByLabel('Audience conditions summary',{exact:true})).toContainText(`Saved non-engagement audience is "${cohort}"`);
    await expect(page.getByLabel('Follow-up source')).toContainText(name);
    await expect(page.getByLabel('Follow-up source')).toContainText('48 hours');
    expect(await site.rows(`SELECT revision_id FROM campaign_approval_requests WHERE revision_id='${followup.revisionId}'`)).toEqual([]);
    console.log('PROBE AUD-010 followup-condition: completed native source and 48-hour follow-up -> summary retains saved cohort value alongside original source and cutoff; follow-up remains unapproved');
    expect(f.edge.unexpected).toEqual([]);
  }finally{await f.close();}
}

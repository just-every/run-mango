import {test,expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {segmentFixture} from './segment-fixture';
import {json,draftCampaign,approve} from '../go-live/harness';
import {openPage,reloadPage} from '../support/navigation';
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
    for(const width of [1440]) {
      await page.setViewportSize({width,height:1000});
      await expect(estimate).toContainText('2 eligible contacts');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await test.step(`Accessibility at ${width}`,async()=>expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]),{timeout:30000});
      await page.locator('[aria-labelledby="segments-title"]').screenshot({path:info.outputPath(`segment-builder-${width}.png`)});
    }
    const campaign=await draftCampaign(site,cookie,'California repeat gardeners',people.map(p=>p.email),new Date(now+3600000));
    const setRules=async(rule:unknown)=>json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie,body:{inclusionRuleJson:JSON.stringify(rule)}}),200);
    const review=async()=>json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
    // Two saved email steps distinguish the two selected people from four messages.
    const steps=[1,2].map(hour=>({channel:'email',timezone:'UTC',
      scheduledAt:new Date(now+hour*3600000).toISOString(),
      sendByAt:new Date(now+(hour+2)*3600000).toISOString(),whyThisTime:'Owner chose this time'}));
    await json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie,body:{steps}}),200);
    await setRules(conditions);
    await test.step('Review snapshot — saved as-of time and email recipient-step counts',async()=>{
      const read=async()=>json(await site.call('/api/campaigns/'+campaign.campaignId+'/review',{cookie}),200);
      const persisted=async()=>({
        audiences:await site.rows("SELECT * FROM campaign_audiences WHERE revision_id='"+campaign.revisionId+"'"),
        channels:await site.rows("SELECT c.* FROM campaign_audience_channel_counts c JOIN campaign_audiences a ON a.id=c.audience_id WHERE a.revision_id='"+campaign.revisionId+"'"),
      });
      const authority=async()=>({
        campaign:await site.rows("SELECT * FROM campaigns WHERE id='"+campaign.campaignId+"'"),
        revision:await site.rows("SELECT * FROM campaign_revisions WHERE id='"+campaign.revisionId+"'"),
        approvals:await site.rows("SELECT * FROM campaign_approval_requests WHERE campaign_id='"+campaign.campaignId+"'"),
        candidates:await site.rows("SELECT * FROM campaign_revision_candidates WHERE revision_id='"+campaign.revisionId+"'"),
        recipients:await site.rows("SELECT * FROM recipient_steps WHERE campaign_id='"+campaign.campaignId+"'"),
        dispatches:(await site.control('/_golive/emissions')).filter((item:any)=>item.command.kind==='campaign.dispatch'),
        handoffs:structuredClone(f.edge.sends),
      });
      const before=await authority();
      expect(before.campaign).toMatchObject([{state:'draft'}]);
      expect(before.revision).toMatchObject([{state:'draft',approved_at:null}]);
      for(const key of ['approvals','candidates','recipients','dispatches'] as const)expect(before[key]).toEqual([]);
      expect((await read()).audienceState).toBe('needs_recomputation');
      expect(await persisted()).toEqual({audiences:[],channels:[]});
      // Bracket creation of the snapshot with an independent installation clock read.
      const started=await site.control('/_golive/clock',{hold:true});
      const checked=await review();
      const finished=await site.control('/_golive/clock',{hold:true});
      const asOf=Date.parse(checked.asOf);
      expect(asOf).toBeGreaterThanOrEqual(started.now);
      expect(asOf).toBeLessThanOrEqual(finished.now);
      expect(checked).toMatchObject({candidateCount:2,eligibleCount:2,
        channelCounts:[{channel:'email',recipientStepCount:4,eligibleContactCount:2}]});
      expect(checked.channelCounts).toHaveLength(1);
      const stored=await persisted();
      expect(stored.audiences).toHaveLength(1);
      expect(stored.audiences[0]).toMatchObject({revision_id:campaign.revisionId,as_of_at:asOf,
        candidate_count:2,eligible_count:2,excluded_count:0});
      expect(stored.channels).toHaveLength(1);
      expect(stored.channels[0]).toMatchObject({audience_id:stored.audiences[0].id,
        channel:'email',recipient_step_count:4,eligible_contact_count:2});
      const saved=await read();
      expect(saved).toMatchObject({audienceState:'saved',revision:{state:'draft',inclusionRuleJson:JSON.stringify(conditions),exclusionRulesJson:'[]'},
        audience:{asOfAt:checked.asOf,candidateCount:2,eligibleCount:2,excludedCount:0},
        audienceChannelCounts:[{channel:'email',recipientStepCount:4,eligibleContactCount:2}]});
      expect(saved.steps).toHaveLength(2);
      expect(saved.steps.map(({channel,scheduledAt,sendByAt}:any)=>({channel,scheduledAt,sendByAt})))
        .toEqual(steps.map(({channel,scheduledAt,sendByAt})=>({channel,scheduledAt,sendByAt})));
      // A later browser clock must not replace the saved audience instant.
      // Keep the native fixture's millisecond segment-window boundaries intact.
      await page.clock.setFixedTime(new Date(asOf+120000));
      const reviewUrl=site.runtime.url+'/app/campaigns/'+campaign.campaignId+'/review';
      await openPage(page,reviewUrl);
      await page.getByRole('combobox',{name:'Times shown in',exact:true}).selectOption('UTC');
      const timestamp='Saved '+new Intl.DateTimeFormat('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(asOf));
      const snapshot=page.getByRole('region',{name:timestamp,exact:true});
      const assertSaved=async()=>{
        await expect(snapshot).toBeVisible();
        for(const part of ['Placed Order','US state','94103'])await expect(snapshot.getByLabel('Saved audience rule',{exact:true})).toContainText(part);
        await expect(snapshot.locator('dl > div').filter({has:page.getByText('Eligible contacts',{exact:true})}).locator('dd')).toHaveText('2');
        const email=snapshot.getByLabel('Saved channel step counts',{exact:true}).locator('p').filter({has:page.getByText('Email',{exact:true})});
        await expect(email.locator('strong')).toHaveText('4');
        expect((await read()).audience).toEqual(saved.audience);
        expect((await read()).audienceChannelCounts).toEqual(saved.audienceChannelCounts);
        expect(await persisted()).toEqual(stored);
        expect(await authority()).toEqual(before);
      };
      await assertSaved();
      await reloadPage(page);
      await assertSaved();
      await openPage(page,site.runtime.url+'/app/audience');
      await openPage(page,reviewUrl);
      await assertSaved();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
      // Axe cannot enter the intentionally sandboxed authored-email preview.
      await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('The spring beds are in.');
      await test.step('Review accessibility at 1440',async()=>expect((await new AxeBuilder({page}).exclude('iframe[title="Saved email preview"]').analyze()).violations).toEqual([]),{timeout:30000});
      await page.screenshot({path:info.outputPath('segment-review-1440.png'),fullPage:true});
      // The journey asserts at desktop width; the reopened phone screen is browser proof.
      await page.setViewportSize({width:390,height:844});
      await openPage(page,reviewUrl);
      await snapshot.waitFor({state:'visible'});
      await page.screenshot({path:info.outputPath('segment-review-390.png'),fullPage:true});
      expect(await authority()).toEqual(before);
      await page.setViewportSize({width:1440,height:1000});
      await page.clock.setFixedTime(new Date());
      console.log('PROBE AUD-001 acceptance-1: native checks bracket '+started.now+'..'+finished.now+' -> saved as-of '+checked.asOf+' matches native and persisted readback after reload and reopen');
      console.log('PROBE AUD-001 acceptance-3-email: two native saved email steps and two known eligible contacts -> four labeled email recipient steps, unchanged draft authority and no handoff');
    });
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
    expect(f.edge.unexpected).toEqual([]);
  }finally{await f.close();}
}

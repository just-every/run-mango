import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {consent,confirmedContact,draftCampaign,installation,json,rule,sender} from '../go-live/harness';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {confirmSmsReply} from '../go-live/sms-confirm-reply';
import {smsDisclosure,smsProgramme,smsSender} from '../go-live/sms-bindings';
import {openPage,reloadPage} from '../support/navigation';

/** Real saved review over independently known email and SMS permissions. */
export async function channelSnapshotJourney(page:Page,info:TestInfo) {
  const edge=await providerEdge();
  const site=await installation(edge,eventSigner(),{sms:true,providerKey:'synthetic-mango-2'});
  try {
  const cookie=await site.open();
  await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
  await site.control('/_golive/sender-evidence');
  const selected:Array<{id:string;email:string}>=[];
  for(let index=0;index<3;index++) {
    const email=['synthetic-mango-channel-'+(index+1),'example.test'].join('@');
    await confirmedContact(site,edge,cookie,email,'Market reader '+(index+1));
    const lookup=await json(await site.call('/api/contacts/search?address='+encodeURIComponent(email),{cookie}),200);
    expect(lookup.contacts).toHaveLength(1);selected.push(lookup.contacts[0]);
  }
  const policy=smsProgramme(),disclosure=JSON.parse(smsDisclosure());
  // Pin Brisbane noon: service confirmation must respect the real quiet window.
  const clock=await site.control('/_golive/clock');
  const {now}=await site.control('/_golive/clock',{hold:true,
    advanceMs:(43200000-((clock.now+36000000)%86400000)+86400000)%86400000});
  for(const [index,person]of selected.slice(0,2).entries()) {
    const sent=edge.sms.sends.length;
    const capture=await json(await site.call('/api/contacts/consent',{method:'POST',cookie,body:{
      ...consent,channel:'sms',permissionMethod:'in-person',affirmed:true,expressWrittenConsent:true,
      smsProgram:policy.programme,brandOrLegalSender:policy.brand,messageCategory:policy.category,
      frequencyDisclosure:policy.frequency,destinationJurisdiction:policy.jurisdiction,
      consentText:disclosure.text,consentVersion:disclosure.version,captureSource:'Market text signup',
      timeZone:'Australia/Brisbane',locationSource:'operator-entry',locationRecordedAt:new Date(now).toISOString(),
      contact:{email:person.email,phone:index===0?'+61411111111':'+61422222222'},occurredAt:new Date(now).toISOString(),
    }}),201);
    expect(capture.contact).toMatchObject({id:person.id,emailStatus:'subscribed',smsStatus:'pending'});
    if(index===0) {
      await site.control('/_golive/cron');
      await expect.poll(async()=>edge.sms.sends.length||JSON.stringify(await site.rows('SELECT purpose,state,reason,next_at FROM sms_service_messages')),
        {timeout:60000,intervals:[500]}).toBe(sent+1);
      await confirmSmsReply(site,edge,sent);
    }
  }
  for(const [index,person]of selected.entries()) {
    const detail=await json(await site.call('/api/contacts/'+person.id,{cookie}),200);
    expect(detail.contact).toMatchObject({id:person.id,emailStatus:'subscribed',smsStatus:['subscribed','pending','non-subscribed'][index]});
  }
  const campaign=await draftCampaign(site,cookie,'Market channel review',selected.map(person=>person.email),new Date(now+3600000));
  const inclusionRuleJson=rule(selected.map(person=>person.email));
  const exclusionRulesJson=JSON.stringify([{version:1,reason:'not-in-market',predicate:{sourceType:'contact',field:'email',comparator:'eq',value:selected[2].email}}]);
  const steps=['email','sms','sms','email','sms'].map((channel,index)=>({channel,timezone:'UTC',
    scheduledAt:new Date(now+(index+1)*3600000).toISOString(),sendByAt:new Date(now+(index+3)*3600000).toISOString(),whyThisTime:'Owner chose this time'}));
  await json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie,body:{
    smsBody:'Seedlings are ready at the market.',smsSender,inclusionRuleJson,exclusionRulesJson,steps,
  }}),200);
  const read=()=>site.call('/api/campaigns/'+campaign.campaignId+'/review',{cookie}).then(response=>json(response,200));
  const stored=async()=>({
    audience:await site.rows("SELECT * FROM campaign_audiences WHERE revision_id='"+campaign.revisionId+"'"),
    channels:await site.rows("SELECT c.* FROM campaign_audience_channel_counts c JOIN campaign_audiences a ON a.id=c.audience_id WHERE a.revision_id='"+campaign.revisionId+"' ORDER BY c.channel"),
  });
  const authority=async()=>({
    campaigns:await site.rows("SELECT * FROM campaigns WHERE id='"+campaign.campaignId+"'"),
    revisions:await site.rows("SELECT * FROM campaign_revisions WHERE id='"+campaign.revisionId+"'"),
    approvals:await site.rows("SELECT * FROM campaign_approval_requests WHERE campaign_id='"+campaign.campaignId+"'"),
    candidates:await site.rows("SELECT * FROM campaign_revision_candidates WHERE revision_id='"+campaign.revisionId+"'"),
    recipients:await site.rows("SELECT * FROM recipient_steps WHERE campaign_id='"+campaign.campaignId+"'"),
    dispatches:(await site.control('/_golive/emissions')).filter((item:any)=>item.command.kind==='campaign.dispatch'),
    emailHandoffs:structuredClone(edge.sends),smsHandoffs:structuredClone(edge.sms.sends),
  });
  const before=await authority();
  expect(before.campaigns).toMatchObject([{state:'draft',active_revision_id:campaign.revisionId}]);
  expect(before.revisions).toMatchObject([{state:'draft',approved_at:null}]);
  for(const key of ['approvals','candidates','recipients'] as const)expect(before[key]).toEqual([]);
  const started=await site.control('/_golive/clock',{hold:true});
  const checked=await json(await site.call('/api/campaigns/'+campaign.campaignId+'/checks',{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
  const finished=await site.control('/_golive/clock',{hold:true});
  const asOf=Date.parse(checked.asOf);
  expect(asOf).toBeGreaterThanOrEqual(started.now);expect(asOf).toBeLessThanOrEqual(finished.now);
  const counts=[{channel:'email',eligibleContactCount:2,recipientStepCount:4},{channel:'sms',eligibleContactCount:1,recipientStepCount:3}];
  const exclusions=[{reason:'not-in-market',count:1},{reason:'sms-non-subscribed',count:1},{reason:'sms-pending',count:1}];
  expect(checked).toMatchObject({candidateCount:3,eligibleCount:2});
  expect(checked.channelCounts).toHaveLength(2);
  expect(checked.channelCounts).toEqual(expect.arrayContaining(counts.map(count=>expect.objectContaining(count))));
  expect([...checked.exclusions].sort((a,b)=>a.reason.localeCompare(b.reason))).toEqual(exclusions);
  const saved=await read(),persisted=await stored();
  expect(saved).toMatchObject({audienceState:'saved',revision:{inclusionRuleJson,exclusionRulesJson},
    audience:{asOfAt:checked.asOf,candidateCount:3,eligibleCount:2,excludedCount:1}});
  expect(saved.audienceChannelCounts).toHaveLength(2);
  expect(saved.audienceChannelCounts).toEqual(expect.arrayContaining(counts.map(count=>expect.objectContaining(count))));
  expect(persisted.audience).toHaveLength(1);
  expect(persisted.audience[0]).toMatchObject({as_of_at:asOf,candidate_count:3,eligible_count:2,excluded_count:1});
  expect(persisted.channels.map(row=>({channel:row.channel,eligibleContactCount:row.eligible_contact_count,recipientStepCount:row.recipient_step_count}))).toEqual(counts);
  expect(JSON.parse(persisted.audience[0].exclusions).sort((a:{reason:string},b:{reason:string})=>a.reason.localeCompare(b.reason))).toEqual(exclusions);
  await page.clock.setFixedTime(new Date(asOf+120000));
  await page.context().clearCookies();
  await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  await page.setViewportSize({width:1440,height:1000});
  const url=site.runtime.url+'/app/campaigns/'+campaign.campaignId+'/review';
  await openPage(page,url);
  await page.getByRole('combobox',{name:'Times shown in',exact:true}).selectOption('UTC');
  const timestamp='Saved '+new Intl.DateTimeFormat('en-AU',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(asOf));
  const snapshot=page.getByRole('region',{name:timestamp,exact:true});
  const assertSaved=async()=>{
    await expect(snapshot).toBeVisible();
    for(const person of selected)await expect(snapshot.getByLabel('Saved audience rule',{exact:true})).toContainText(person.email);
    for(const [label,count]of [['Candidates',3],['Excluded',1],['Eligible contacts',2]] as const)
      await expect(snapshot.locator('dl > div').filter({has:page.getByText(label,{exact:true})}).locator('dd')).toHaveText(String(count));
    for(const [label,count]of [['Email',4],['SMS',3]] as const)
      await expect(snapshot.getByLabel('Saved channel step counts',{exact:true}).locator('p').filter({has:page.getByText(label,{exact:true})}).locator('strong')).toHaveText(String(count));
    const reasons=snapshot.getByLabel('Saved audience exclusions',{exact:true}).locator('p').filter({has:page.locator('strong')});
    await expect(reasons).toHaveCount(3);
    for(const label of ['Not In Market','Sms Non Subscribed','Sms Pending'])
      await expect(reasons.filter({has:page.getByText(label,{exact:true})}).locator('strong')).toHaveText('1');
    const current=await read();
    expect(current.audience).toEqual(saved.audience);expect(current.audienceChannelCounts).toEqual(saved.audienceChannelCounts);
    expect(await stored()).toEqual(persisted);expect(await authority()).toEqual(before);
  };
  await assertSaved();await reloadPage(page);await assertSaved();
  await openPage(page,site.runtime.url+'/app/audience');await openPage(page,url);await assertSaved();
  expect((await new AxeBuilder({page}).exclude('iframe[title="Saved email preview"]').analyze()).violations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({path:info.outputPath('channel-review-1440.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await openPage(page,url);
  await snapshot.waitFor({state:'visible'});
  await page.screenshot({path:info.outputPath('channel-review-390.png'),fullPage:true});
  expect(await authority()).toEqual(before);
  await page.setViewportSize({width:1440,height:1000});await page.clock.setFixedTime(new Date());
  console.log('PROBE AUD-001 acceptance-2: native checks with three known contacts -> three candidates, one excluded, two eligible and all three saved exclusion reasons rendered after reopening');
  console.log('PROBE AUD-001 acceptance-3: two email steps and three SMS steps with independent confirmed permissions -> email 4, SMS 3; pending SMS excluded; saved rows and rendered counts agree with no new authority');
  expect(edge.unexpected).toEqual([]);
  }finally{try{await site.runtime.close();}finally{await edge.close();}}
}

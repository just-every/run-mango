import {expect,test} from '@playwright/test';
import {decisionRuntime,generated} from './runtime';
import {history} from './history';
import {proposalRenderer} from '../audience-summary/proposal-render';

test('[PROP-006] generation accepts grounded observations and rejects fabricated prose even with valid citations, without losing billed attempts',async()=>{
  const runtime=await decisionRuntime();
  try {
    const accepted=await generated(runtime);
    const before=await runtime.call(`/api/proposals/${accepted.proposalId}`);
    expect(before.body.proposal.state).toBe('proposed');
    for(const slot of ['summary','explanation','timing','exclusion','forecast','schedule','timezone','citation-value','unknown-claim-field'] as const) {
      runtime.controls.alter=output=>{
        if(slot==='summary')output.summary.text='This store has a 90% recovery rate.';
        if(slot==='explanation')output.audience.explanation.text='These customers always buy on Tuesdays.';
        if(slot==='timing')output.steps[0].whyThisTime.text='Tuesday morning doubles sales.';
        if(slot==='exclusion')output.audience.exclusions=[{version:1,reason:'These customers cannot afford this offer.' as never,predicate:{sourceType:'contact',field:'email',comparator:'contains',value:'nobody',lookbackDays:null}}];
        if(slot==='timezone')output.steps[0].timezone='+10:00';
        if(slot==='citation-value')output.summary.citations[0].observedValueJson='"invented"';
        if(slot==='schedule')output.steps[0].sendByAt=output.steps[0].scheduledAt;
        if(slot==='unknown-claim-field')(output.summary as any).marketingClaim='Everyone buys this';
        if(slot==='forecast')output.forecast={valueMinor:990000,method:'Another store benchmark'} as never;
      };
      const failure=await runtime.call('/api/proposals/generate',{});
      expect(failure).toMatchObject({status:409,body:{kind:'failed',error:'invalid_ai_output'}});
      const detail=await runtime.call(`/api/proposals/${failure.body.proposalId}`);
      expect(detail.body.proposal).toMatchObject({state:'failed',campaignId:null});
      expect(detail.body.history).toEqual([expect.objectContaining({fromState:'generating',toState:'failed',actorId:'proposal-operator',occurredAt:expect.any(String)})]);
      expect(detail.body.composition).toBeUndefined();
      expect(await runtime.db.prepare('SELECT billable_units,reported_cost_micros FROM external_cost_facts WHERE proposal_id=?').bind(failure.body.proposalId).first()).toEqual({billable_units:100,reported_cost_micros:25});
    }
    expect((await runtime.call('/api/decision-desk')).body.proposals.map((entry:any)=>entry.proposal.id)).toEqual([accepted.proposalId]);
    expect((await runtime.call(`/api/proposals/${accepted.proposalId}`)).body).toEqual(before.body);
    expect(runtime.jobs).toEqual([]);
  } finally {await runtime.close();}
});

test('[PROP-002] proposal route and detail show observed values, event IDs, lookback, rules, as-of, timing and methods',async()=>{
  const runtime=await decisionRuntime();
  try {
    const proposal=await generated(runtime),detail=(await runtime.call(`/api/proposals/${proposal.proposalId}`)).body;
    expect(detail.evidenceItems).toEqual([expect.objectContaining({sourceType:'product',observedValue:expect.objectContaining({title:'Garden linen'})})]);
    const evidence=detail.evidenceItems[0];
    expect(JSON.parse(detail.proposal.triggerEventsJson)).toContain(evidence.sourceRecordId);
    expect(Date.parse(detail.proposal.lookbackStartAt)).toBeLessThanOrEqual(Date.parse(detail.proposal.sourceDataAsOf));
    expect(JSON.parse(detail.proposal.inclusionRuleJson).predicates).toHaveLength(1);
    expect(JSON.parse(detail.proposal.exclusionRulesJson)).toEqual([]);
    expect(Date.parse(detail.steps[0].scheduledAt)).toBeLessThanOrEqual(Date.parse(detail.proposal.sendByAt));
    expect(detail.steps[0].whyThisTime).toContain(evidence.key);
    expect(detail.forecast.method).toBeTruthy();
    const html=await (await proposalRenderer())(detail);
    for(const value of [evidence.sourceRecordId,'Garden linen',detail.forecast.method,'Etc/UTC']) expect(html).toContain(value);
  } finally {await runtime.close();}
});

test('[PROP-003] generated audience counts apply real consent exclusions and count each eligible channel step',async()=>{
  const runtime=await decisionRuntime();
  try {
    runtime.controls.alter=output=>{output.steps.push({...structuredClone(output.steps[0]),scheduledAt:new Date(Date.parse(output.steps[0].scheduledAt)+60000).toISOString()});};
    const proposal=await generated(runtime),detail=(await runtime.call(`/api/proposals/${proposal.proposalId}`)).body;
    expect(detail.audience).toMatchObject({candidateCount:3,excludedCount:1,eligibleCount:2});
    expect(detail.audienceChannelCounts).toEqual([expect.objectContaining({channel:'email',recipientStepCount:4})]);
    expect(detail.exclusions.reduce((sum:number,row:any)=>sum+row.count,0)).toBeGreaterThanOrEqual(1);
    expect(await runtime.db.prepare('SELECT count(*) AS count FROM recipient_steps').first()).toEqual({count:0});
  }finally{await runtime.close();}
});

test('[PROP-004] accepted generated content and sender are previewable and editable as a saved draft',async()=>{
  const runtime=await decisionRuntime();
  try {
    runtime.controls.alter=output=>{output.links=[{label:'Garden collection',destinationUrl:'https://store.example.test/garden'}];};
    const proposal=await generated(runtime),detail=(await runtime.call(`/api/proposals/${proposal.proposalId}`)).body;
    expect(detail.composition.revision).toMatchObject({name:'Garden update',emailSubject:'From the garden',emailBody:expect.stringContaining('Garden news'),senderName:runtime.platform.config.mailSender.displayName,fromEmail:runtime.platform.config.mailSender.fromEmail,state:'draft'});
    expect(detail.composition.links).toEqual([expect.objectContaining({destinationUrl:'https://store.example.test/garden'})]);
    const render=await proposalRenderer(),html=await render(detail);
    for(const value of ['Saved email preview','From the garden','Garden collection','https://store.example.test/garden',runtime.platform.config.mailSender.fromEmail])expect(html).toContain(value);
    expect(detail.steps.map((step:any)=>step.channel)).toEqual(['email']);
    expect(detail.composition.revision).toMatchObject({smsBody:'',smsSender:'MANGO'});
    expect(html).not.toContain('message-preview--sms');
    expect(await runtime.call(`/api/proposals/${proposal.proposalId}/adopt`,{})).toMatchObject({status:200,body:{campaignId:proposal.campaignId}});
    expect((await runtime.call(`/api/campaigns/${proposal.campaignId}`)).body.revision.state).toBe('draft');
    const edited=await runtime.call(`/api/campaign-revisions/${proposal.revisionId}`,{name:'Reviewed garden update',emailSubject:'Our revised garden message'},true,'PATCH');
    expect(edited.status).toBe(200);
    expect(edited.body.revision).toMatchObject({state:'draft',name:'Reviewed garden update',emailSubject:'Our revised garden message'});

    const smsBody='MANGO garden news. Reply STOP to opt out.';
    for(const emailSelected of [false,true]) {
      runtime.controls.alter=output=>{
        output.sms={body:smsBody};
        const smsStep={...structuredClone(output.steps[0]),channel:'sms' as const};
        output.steps=emailSelected?[...output.steps,smsStep]:[smsStep];
        if(!emailSelected)output.email=null;
      };
      const selected=await generated(runtime),selectedDetail=(await runtime.call(`/api/proposals/${selected.proposalId}`)).body;
      expect(selectedDetail.proposal.state).toBe('proposed');
      expect(selectedDetail.steps.map((step:any)=>step.channel)).toEqual(emailSelected?['email','sms']:['sms']);
      expect(selectedDetail.composition.revision.smsBody).toBe(smsBody);
      const selectedHtml=await render(selectedDetail);
      expect(selectedHtml).toContain('message-preview--sms');
      expect(selectedHtml).toContain(smsBody);
      for(const emailPreview of ['message-preview--email','message-preview--plain']) {
        if(emailSelected)expect(selectedHtml).toContain(emailPreview);
        else expect(selectedHtml).not.toContain(emailPreview);
      }
    }
    expect(runtime.jobs).toEqual([]);
  }finally{await runtime.close();}
});

test('[PROP-008] forecasts use owned mature history including failed and zero-revenue recipients, and refuse thin or mixed-currency history',async()=>{
  const runtime=await decisionRuntime();
  try {
    const thin=await generated(runtime);
    expect((await runtime.call(`/api/proposals/${thin.proposalId}`)).body.forecast).toMatchObject({status:'insufficient',valueMinor:null,campaignCount:0,eventCount:0,sampleSize:0});
    await history(runtime);
    const own=await generated(runtime),forecast=(await runtime.call(`/api/proposals/${own.proposalId}`)).body.forecast;
    expect(forecast).toMatchObject({status:'available',currency:'USD',valueMinor:200,historicalNetRevenueMinor:2400,proposedRecipientSteps:2,campaignCount:3,eventCount:3,sampleSize:24,campaignIds:['history-0','history-1','history-2'],sourceEventIds:['historic-order-0','historic-order-1','historic-order-2']});
    expect(forecast.recipientStepIds).toHaveLength(24);
    await runtime.db.prepare("UPDATE attribution_facts SET currency='AUD' WHERE id='attribution-0'").run();
    const mixed=await generated(runtime);
    expect((await runtime.call(`/api/proposals/${mixed.proposalId}`)).body.forecast).toMatchObject({status:'insufficient',valueMinor:null,currency:null,historicalNetRevenueMinor:null});
  }finally{await runtime.close();}
});

test('[PROP-001] Decision Desk returns only proposed suggestions in revenue then deadline order',async()=>{
  const runtime=await decisionRuntime();
  try {
    const thin=await generated(runtime);
    await history(runtime);
    runtime.controls.alter=output=>{output.audience.inclusion.predicates[0]={sourceType:'contact',field:'email',comparator:'eq',value:'first@example.test',lookbackDays:null};};
    const lower=await generated(runtime);
    runtime.controls.alter=output=>{output.steps[0].sendByAt=new Date(Date.now()+4*3600000).toISOString();};
    const higherLater=await generated(runtime);
    runtime.controls.alter=undefined;
    const higherEarlier=await generated(runtime);
    const dismissed=await generated(runtime);
    expect((await runtime.call(`/api/proposals/${dismissed.proposalId}/dismiss`,{reason:'Already planned'})).status).toBe(200);
    const desk=(await runtime.call('/api/decision-desk')).body;
    expect(desk.proposals.map((entry:any)=>entry.proposal.id)).toEqual([higherEarlier.proposalId,higherLater.proposalId,lower.proposalId,thin.proposalId]);
    expect(desk.proposals.every((entry:any)=>entry.proposal.state==='proposed')).toBe(true);
  }finally{await runtime.close();}
});

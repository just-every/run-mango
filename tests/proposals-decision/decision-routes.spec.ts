import {authoringRuntime} from '../campaign-authoring/browser-runtime.mjs';
import {blockBuilderJourney} from '../campaign-authoring/block-builder-journey';
import {expect,test} from '@playwright/test';
import {decisionRuntime,generated} from './runtime';
import {proposalCustomer,synchronizeProposalSource} from './shopify-edge';
import {history} from './history';
import {proposalRenderer} from '../audience-summary/proposal-render';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {toDraftComposition} from '../../src/core/features/campaigns/ui/draft-composition';

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

    // A legitimate pre-0045 row has no decision_context_json. The old generator
    // accepted arbitrary prose alongside real evidence; reproduce its stored shape.
    const legacySummary='This store has a 90% recovery rate.';
    const legacyTiming='Tuesday morning doubles sales.';
    const legacyExclusion='These customers cannot afford this offer.';
    const exclusionPredicate={sourceType:'contact',field:'email',comparator:'eq',value:'first@example.test'};
    const legacyExclusions=JSON.stringify([{version:1,reason:legacyExclusion,predicate:exclusionPredicate}]);
    const cloneRow=async(table:string,where:string,overrides:Record<string,unknown>,omit:string[]=[])=>{
      const row=await runtime.db.prepare(`SELECT * FROM ${table} WHERE ${where}`).first<Record<string,unknown>>();
      if(!row)throw new Error(`Missing fixture row for ${table}`);
      const values={...row,...overrides};
      const keys=Object.keys(values).filter(key=>!omit.includes(key));
      await runtime.db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).bind(...keys.map(key=>values[key])).run();
    };
    const legacy={proposalId:'legacy-proposal',campaignId:'legacy-campaign',revisionId:'legacy-revision'};
    await cloneRow('proposals',`id='${accepted.proposalId}'`,{id:legacy.proposalId,campaign_id:legacy.campaignId,summary:legacySummary,exclusion_rules_json:legacyExclusions},['decision_context_json']);
    await cloneRow('campaigns',`id='${accepted.campaignId}'`,{id:legacy.campaignId,proposal_id:legacy.proposalId,active_revision_id:legacy.revisionId});
    await cloneRow('campaign_revisions',`id='${accepted.revisionId}'`,{id:legacy.revisionId,campaign_id:legacy.campaignId,exclusion_rules_json:legacyExclusions});
    await cloneRow('proposal_steps',`proposal_id='${accepted.proposalId}'`,{id:'legacy-proposal-step',proposal_id:legacy.proposalId});
    await cloneRow('campaign_steps',`revision_id='${accepted.revisionId}'`,{id:'legacy-campaign-step',revision_id:legacy.revisionId,why_this_time:legacyTiming});
    await cloneRow('proposal_evidence_items',`proposal_id='${accepted.proposalId}'`,{id:'legacy-evidence',proposal_id:legacy.proposalId});
    await cloneRow('proposal_transitions',`proposal_id='${accepted.proposalId}'`,{id:'legacy-transition',proposal_id:legacy.proposalId});
    const storedLegacy=await runtime.db.prepare('SELECT * FROM proposals WHERE id=?').bind(legacy.proposalId).first();
    expect(storedLegacy).toMatchObject({decision_context_json:'{}',summary:legacySummary});
    const legacyDetail=(await runtime.call(`/api/proposals/${legacy.proposalId}`)).body;
    const legacyDesk=(await runtime.call('/api/decision-desk')).body.proposals.find((entry:any)=>entry.proposal.id===legacy.proposalId);
    const render=await proposalRenderer();
    for(const entry of [legacyDetail,legacyDesk]) {
      expect(entry.proposal.state).toBe('proposed');
      expect(entry.claimsUnavailable).toBeTruthy();
      expect(JSON.stringify(entry)).not.toContain(legacySummary);
      expect(JSON.stringify(entry)).not.toContain(legacyExclusion);
      expect(JSON.parse(entry.proposal.exclusionRulesJson)[0].predicate).toEqual(exclusionPredicate);
      const html=await render(entry);
      expect(html).not.toContain(legacySummary);
      expect(html).toContain(entry.claimsUnavailable);
      expect(html).toMatch(/<button[^>]*disabled[^>]*>Use this/);
      expect(entry.history).toEqual(before.body.history);
      expect(entry.evidenceItems).toEqual(before.body.evidenceItems);
    }
    expect((await runtime.call(`/api/proposals/${legacy.proposalId}/adopt`,{})).status).toBe(409);
    const require=createRequire(import.meta.url);
    const {build}=createRequire(require.resolve('wrangler'))('esbuild');
    const deliveryBundle=await build({stdin:{contents:`
      import {renderToStaticMarkup} from 'react-dom/server';
      import {DeliveryPlan} from './src/core/features/campaigns/ui/delivery-plan';
      export const render=steps=>renderToStaticMarkup(<DeliveryPlan steps={steps}/>);`,
      resolveDir:process.cwd(),sourcefile:'delivery-render.tsx',loader:'tsx'},
      bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',alias:{'@':resolve('src')}});
    const deliveryModule={exports:{} as {render:(steps:any[])=>string}};
    new Function('require','module','exports',deliveryBundle.outputFiles[0].text)(require,deliveryModule,deliveryModule.exports);
    const renderDelivery=deliveryModule.exports.render;
    const assertLegacyReview=async()=>{for(const path of [`/api/campaigns/${legacy.campaignId}`,`/api/campaigns/${legacy.campaignId}/review`]) {
      const review=(await runtime.call(path)).body;
      expect(review.steps[0].claimsUnavailable).toBeTruthy();
      expect(JSON.stringify(review)).not.toContain(legacyTiming);
      expect(JSON.stringify(review)).not.toContain(legacyExclusion);
      expect(JSON.parse(review.revision.exclusionRulesJson)[0].predicate).toEqual(exclusionPredicate);
      const html=renderDelivery(review.steps);
      expect(html).not.toContain(legacyTiming);
      expect(html).toContain(review.steps[0].claimsUnavailable);
      const audience=await runtime.call('/api/campaign-authoring/audience',{inclusionRuleJson:review.revision.inclusionRuleJson,exclusionRulesJson:review.revision.exclusionRulesJson,channels:['email']});
      expect(audience.status).toBe(200);
      expect(audience.body.eligibleCount).toBe(1);
      expect(JSON.stringify(audience.body)).not.toContain(legacyExclusion);
    }};
    await assertLegacyReview();
    const checks=await runtime.call(`/api/campaigns/${legacy.campaignId}/checks`,{revisionId:legacy.revisionId});
    expect(checks.status).toBe(200);
    expect(JSON.stringify(checks.body)).not.toContain(legacyExclusion);
    await assertLegacyReview();
    expect(await runtime.db.prepare('SELECT * FROM proposals WHERE id=?').bind(legacy.proposalId).first()).toEqual(storedLegacy);
    expect(await runtime.db.prepare('SELECT why_this_time FROM campaign_steps WHERE revision_id=?').bind(legacy.revisionId).first()).toEqual({why_this_time:legacyTiming});

    // Historical full saves reinserted every step, even for copy-only edits. Later
    // timestamps and revision numbers cannot establish operator authorship.
    await runtime.db.prepare('UPDATE campaign_steps SET created_at=created_at+1000,updated_at=updated_at+1000 WHERE revision_id=?').bind(legacy.revisionId).run();
    await runtime.db.prepare('UPDATE campaign_revisions SET updated_at=updated_at+1000 WHERE id=?').bind(legacy.revisionId).run();
    await assertLegacyReview();
    await cloneRow('campaign_revisions',`id='${legacy.revisionId}'`,{id:'legacy-copy',version:2});
    await cloneRow('campaign_steps',`revision_id='${legacy.revisionId}'`,{id:'legacy-copy-step',revision_id:'legacy-copy'});
    await runtime.db.prepare('UPDATE campaigns SET active_revision_id=? WHERE id=?').bind('legacy-copy',legacy.campaignId).run();
    await assertLegacyReview();
    await runtime.db.prepare('UPDATE campaigns SET active_revision_id=? WHERE id=?').bind(legacy.revisionId,legacy.campaignId).run();

    const fullDraft=toDraftComposition(legacyDetail.composition.revision,legacyDetail.composition.links,[{...legacyDetail.steps[0],whyThisTime:legacyTiming}]);
    const fullSave=await runtime.call(`/api/campaign-revisions/${legacy.revisionId}`,{...fullDraft,emailSubject:'Copy edit in a full draft save'},true,'PATCH');
    expect(fullSave.status).toBe(200);
    expect(fullSave.body.composition.steps[0].claimsUnavailable).toBeTruthy();
    expect(fullSave.body.revision.emailSubject).toBe('Copy edit in a full draft save');
    expect(await runtime.db.prepare('SELECT exclusion_rules_json FROM campaign_revisions WHERE id=?').bind(legacy.revisionId).first()).toEqual({exclusion_rules_json:legacyExclusions});
    expect(await runtime.db.prepare('SELECT timing_origin FROM campaign_steps WHERE revision_id=?').bind(legacy.revisionId).first()).toEqual({timing_origin:null});
    await assertLegacyReview();

    // Editing copy does not relabel untouched generated timing as operator-authored.
    const copyEdit=await runtime.call(`/api/campaign-revisions/${legacy.revisionId}`,{emailSubject:'My edited subject'},true,'PATCH');
    expect(copyEdit.status).toBe(200);
    expect(copyEdit.body.composition.steps[0].claimsUnavailable).toBeTruthy();
    const manualReason='I chose this time for our shop announcement.';
    const manualStep={channel:'email',timezone:'Etc/UTC',scheduledAt:before.body.steps[0].scheduledAt,sendByAt:before.body.steps[0].sendByAt,whyThisTime:manualReason};
    // The same linked draft remains authorable, and an unrelated manual draft also
    // keeps its explicit timing reason without needing machine-derived observations.
    const manual=await runtime.call('/api/campaigns',{mode:'blank'});
    expect(manual.status).toBe(201);
    for(const draft of [legacy,manual.body]) {
      const manualExclusion='Operator selected this exclusion for our announcement.';
      const edit=await runtime.call(`/api/campaign-revisions/${draft.revisionId}`,{steps:[manualStep],exclusionRulesJson:JSON.stringify([{version:1,reason:manualExclusion,predicate:exclusionPredicate}])},true,'PATCH');
      expect(edit.status).toBe(200);
      const review=(await runtime.call(`/api/campaigns/${draft.campaignId}/review`)).body;
      expect(review.steps[0].whyThisTime).toBe(manualReason);
      expect(review.steps[0].claimsUnavailable).toBeUndefined();
      expect(JSON.parse(review.revision.exclusionRulesJson)[0]).toEqual({version:1,reason:manualExclusion,predicate:exclusionPredicate});
      expect(await runtime.db.prepare('SELECT timing_origin FROM campaign_steps WHERE revision_id=?').bind(draft.revisionId).first()).toEqual({timing_origin:'operator'});
      expect(renderDelivery(review.steps)).toContain(manualReason);
    }
    expect(runtime.jobs).toEqual([]);
  } finally {await runtime.close();}
});

test('[PROP-002] proposal route and detail show observed values, event IDs, lookback, rules, as-of, timing and methods',async()=>{
  const runtime=await decisionRuntime();
  try {
    const injectedTitle='Expected USD 9,900 revenue: Tuesday 9am doubles sales for lapsed buyers';
    runtime.controls.alter=output=>{(output as any).title=injectedTitle;};
    const injectedResult=await runtime.call('/api/proposals/generate',{});
    const injectedDetail=(await runtime.call(`/api/proposals/${injectedResult.body.proposalId}`)).body;
    runtime.controls.alter=undefined;
    const generatedResult=await runtime.call('/api/proposals/generate',{});
    const proposal=generatedResult.body as {proposalId:string;campaignId:string;revisionId:string};
    const detail=(await runtime.call(`/api/proposals/${proposal.proposalId}`)).body;
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
    const desk=(await runtime.call('/api/decision-desk')).body;
    const queueEntry=desk.proposals.find((entry:any)=>entry.proposal.id===proposal.proposalId);
    const campaign=(await runtime.call(`/api/campaigns/${proposal.campaignId}`)).body;
    await runtime.call(`/api/proposals/${proposal.proposalId}/dismiss`,{reason:'Title grounding repro'});
    const recent=(await runtime.call('/api/decision-desk')).body.recentDecisions.find((entry:any)=>entry.proposalId===proposal.proposalId);
    const titles=[detail.proposal.title,queueEntry.proposal.title,campaign.revision.name,recent.title];
    expect({injectedStatus:injectedResult.status,injectedError:injectedResult.body.error,injectedTitleVisible:injectedDetail.proposal.title.includes(injectedTitle),injectedCampaignId:injectedDetail.proposal.campaignId,generatedStatus:generatedResult.status,titleEvidenceRelations:titles.map((title:string)=>({sourceType:title.includes(evidence.sourceType),sourceRecordId:title.includes(evidence.sourceRecordId)})),renderContainsInjectedTitle:html.includes(injectedTitle),renderContainsCitedRecord:html.includes(evidence.sourceRecordId)})
      .toEqual({injectedStatus:409,injectedError:'invalid_ai_output',injectedTitleVisible:false,injectedCampaignId:null,generatedStatus:201,titleEvidenceRelations:titles.map(()=>({sourceType:true,sourceRecordId:true})),renderContainsInjectedTitle:false,renderContainsCitedRecord:true});
    // A role without unmasked contact access reads the decision without the customer records it cites or address-bearing rules.
    await synchronizeProposalSource(runtime.services,'customer');
    runtime.controls.alter=output=>{
      const items=(runtime.controls.lastRequest!.evidence as {items:Array<{key:string;observedValueJson:string;allowedClaim:string}>}).items;
      const item=items.find(candidate=>candidate.observedValueJson.includes(proposalCustomer.email))!;
      const claim={text:item.allowedClaim,citations:[{key:item.key,observedValueJson:item.observedValueJson}]};
      output.summary=structuredClone(claim);output.audience.explanation=structuredClone(claim);output.steps[0].whyThisTime=structuredClone(claim);
      output.audience.inclusion={...output.audience.inclusion,operator:'any',predicates:[...output.audience.inclusion.predicates,{sourceType:'contact',field:'email',comparator:'eq',value:proposalCustomer.email,lookbackDays:null}]};
    };
    const cited=await generated(runtime);
    runtime.controls.alter=undefined;
    const ownerView=JSON.stringify((await runtime.call(`/api/proposals/${cited.proposalId}`)).body);
    for(const value of Object.values(proposalCustomer))expect(ownerView).toContain(value);
    for(const path of [`/api/proposals/${cited.proposalId}`,`/api/campaigns/${cited.campaignId}`,`/api/campaigns/${cited.campaignId}/review`]) {
      const restricted=await runtime.analyst(path);
      expect(restricted.status,path).toBe(200);
      for(const value of Object.values(proposalCustomer))expect(JSON.stringify(restricted.body),`${path}: ${value}`).not.toContain(value);
    }
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

test.describe('Saved content',()=>{
  let blockRuntime:Awaited<ReturnType<typeof authoringRuntime>>,renderSavedProposal:Awaited<ReturnType<typeof proposalRenderer>>;
  test.beforeAll(async()=>{[blockRuntime,renderSavedProposal]=await Promise.all([authoringRuntime({suite:'block-builder',vars:{AUTHORING_LINK_HOST:'example.test'}}),proposalRenderer()]);});
  test.afterAll(async()=>{await blockRuntime?.close();});
test('[PROP-004][BUILD-001] accepted content and sender are previewable and editable as a saved draft',async({page},info)=>{
  const runtime=await decisionRuntime();
  try {
    runtime.controls.alter=output=>{output.links=[{label:'Garden collection',destinationUrl:'https://store.example.test/garden'}];};
    const proposal=await generated(runtime),detail=(await runtime.call(`/api/proposals/${proposal.proposalId}`)).body;
    expect(detail.composition.revision).toMatchObject({name:detail.proposal.title,emailSubject:'From the garden',emailBody:expect.stringContaining('Garden news'),senderName:runtime.platform.config.mailSender.displayName,fromEmail:runtime.platform.config.mailSender.fromEmail,state:'draft'});
    expect(detail.composition.links).toEqual([expect.objectContaining({destinationUrl:'https://store.example.test/garden'})]);
    const render=renderSavedProposal,html=await render(detail);
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
  await blockBuilderJourney(page,info,blockRuntime);
});

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

const width = 1440;
import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import { localSessionCookieName } from '../support/local-session';
import { expect, test } from '@playwright/test';
import { authoringRuntime } from '../campaign-authoring/browser-runtime.mjs';
import { proveCampaignCostFailure } from './cost-campaign-proof';
import { proveOperationalMailCosts } from './cost-mail-proof';
import { rememberCost, assertCostIdentities, type ExpectedCost } from './cost-identity-proof';
import { createOpenAiAdapter } from '../../src/core/platform/adapters/openai';

// One RESULT-004 journey covers parser/provider boundaries, real routes, persisted facts and reloadable totals.


export const walk0 = async ({page,request}) => {
  const originalFetch=globalThis.fetch;
  try {
    const adapter=createOpenAiAdapter({apiKey:'test-only',model:'requested-model'});
    for(const response of [
      {output_text:'not JSON',usage:{input_tokens:11,output_tokens:6}},
      {output:[],usage:{input_tokens:11,output_tokens:6}},
      {output:[{content:[{type:'output_text',text:'not JSON'}]}],usage:{input_tokens:11,output_tokens:6}},
    ]) {
      globalThis.fetch=async()=>Response.json(response);
      expect(await adapter.generateGroundedJson({instructions:'Test',evidence:{},schema:{}})).toMatchObject({output:null,billableUnits:17,unitKind:'tokens'});
    }
    globalThis.fetch=async()=>Response.json({output_text:'{}'});
    expect((await adapter.generateGroundedJson({instructions:'Test',evidence:{},schema:{}})).billableUnits).toBeNull();
  } finally {globalThis.fetch=originalFetch;}

  await proveCampaignCostFailure();
  await proveOperationalMailCosts();
  const runtime=await authoringRuntime({suite:'external-costs',fixtureWorker:'tests/campaign-results/cost-worker.ts'});
  try {
    const control={ 'X-Test-Token':runtime.token };
    const opened=await request.post(`${runtime.url}/_costs/open`,{headers:control});expect(opened.status()).toBe(200);
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:(await opened.json()).token,url:runtime.url}]);
    const api=page.request, headers={Origin:runtime.url};
    // Local v2 sign-in accepts without a provider handoff or paid mail.
    // Successful hosted sign-in handoffs and their costs are exercised above.
    const localSignin=await api.post(`${runtime.url}/auth/magic-link`,{headers,data:{email:'costs@example.test'}});
    expect(localSignin.status()).toBe(202);
    expect(await localSignin.json()).toMatchObject({status:'accepted'});
    expect(await (await request.post(`${runtime.url}/_costs/records`,{headers:control})).json()).toMatchObject({costs:[],sends:[]});
    const identities:ExpectedCost[]=[];
    const records=async()=>{const response=await request.post(`${runtime.url}/_costs/records`,{headers:control});expect(response.status()).toBe(200);return response.json();};
    const cases=[{mode:'invalid',model:'cost-invalid',units:17,error:'invalid_ai_output'},
      {mode:'unknown',model:'cost-unknown',units:null,error:'invalid_ai_output'},
      {mode:'failed',model:'cost-requested',units:null,error:'ai_provider_failed'}];
    for(const {mode,model,units,error} of cases) {
      expect((await request.post(`${runtime.url}/_costs/mode`,{headers:control,data:{mode}})).ok()).toBe(true);
      const generated=await api.post(`${runtime.url}/api/proposals/generate`,{headers});
      expect(generated.status()).toBe(409);
      const result=await generated.json();
      expect(result).toMatchObject({kind:'failed',error});
      const observed=await records();
      expect(observed.aiCalls).toEqual(cases.slice(0,identities.length+1).map(item=>({mode:item.mode,provider:'openai',model:item.model})));
      const facts=observed.costs.filter((row:any)=>row.proposal_id===result.proposalId);
      expect(facts).toHaveLength(1);
      expect(facts[0].id).toBe(`ai:${result.proposalId}`);
      identities.push(rememberCost(facts[0],{campaignId:null,provider:'openai',operation:'ai-proposal-generation',modelOrChannel:model,
        billableUnits:units,unitKind:'tokens',reportedCostMicros:null,currency:null,outcome:mode==='failed'?'unknown':'reported'}));
    }
    const created=await api.post(`${runtime.url}/api/campaigns`,{headers,data:{}});expect(created.status()).toBe(201);
    const {campaignId,revisionId}=await created.json();
    expect((await api.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`,{headers,data:{name:'Cost evidence',emailSubject:'Garden news',emailBody:'<p>Garden news</p>'}})).status()).toBe(200);
    for(let attempt=0;attempt<2;attempt++) {
      const before=await records();
      const sent=await api.post(`${runtime.url}/api/campaigns/${campaignId}/test-send`,{headers,data:{revisionId,channel:'email',to:'costs@example.test'}});
      expect(sent.status(),await sent.text()).toBe(200);
      const result=await sent.json(),observed=await records();
      const sends=observed.sends.slice(before.sends.length);
      expect(sends).toHaveLength(1);
      expect(sends[0]).toMatchObject({provider:'cost-mail',channel:'email',receipt:result.providerMessageId});
      const facts=observed.costs.filter((row:any)=>!before.costs.some((prior:any)=>prior.id===row.id));
      expect(facts).toHaveLength(1);
      expect(facts[0].id.startsWith(`test-handoff:${sends[0].key}:attempt:`)).toBe(true);
      identities.push(rememberCost(facts[0],{campaignId,provider:'cost-mail',operation:'test-handoff',modelOrChannel:'email',
        billableUnits:1,unitKind:'messages',reportedCostMicros:1250,currency:'USD',outcome:'accepted'}));
    }
    const beforeConfirmation=await records();
    expect((await request.post(`${runtime.url}/_costs/confirmation`,{headers:control})).ok()).toBe(true);
    const confirmed=await records(),confirmationSends=confirmed.sends.slice(beforeConfirmation.sends.length);
    expect(confirmationSends).toHaveLength(1);
    expect(confirmationSends[0]).toMatchObject({provider:'cost-mail',channel:'email'});
    const confirmationFacts=confirmed.costs.filter((row:any)=>!beforeConfirmation.costs.some((prior:any)=>prior.id===row.id));
    expect(confirmationFacts).toHaveLength(1);
    expect(confirmationFacts[0].id.startsWith(`handoff:cost-mail:${confirmationSends[0].key}:attempt:`)).toBe(true);
    identities.push(rememberCost(confirmationFacts[0],{campaignId:null,provider:'cost-mail',operation:'confirmation-handoff',modelOrChannel:'email',
      billableUnits:1,unitKind:'messages',reportedCostMicros:1250,currency:'USD',outcome:'accepted'}));
    expect((await request.post(`${runtime.url}/_costs/confirmation`,{headers:control})).ok()).toBe(true);
    expect(await records()).toEqual(confirmed);
    expect((await request.post(`${runtime.url}/_costs/reports`,{headers:control,data:{campaignId}})).ok()).toBe(true);
    const raw=await (await request.post(`${runtime.url}/_costs/records`,{headers:control})).json();
    expect(raw.sends).toHaveLength(3);
    expect(raw.costs.filter((row:any)=>row.operation==='confirmation-handoff')).toHaveLength(1);
    expect(raw.costs.filter((row:any)=>row.operation==='test-handoff'&&row.outcome==='accepted')).toHaveLength(2);
    expect(raw.costs.filter((row:any)=>row.operation==='ai-proposal-generation')).toHaveLength(3);
    expect(raw.costs.filter((row:any)=>row.operation==='ai-proposal-generation'&&row.units_known===1).map((row:any)=>row.billable_units)).toEqual([17]);
    expect(raw.costs.filter((row:any)=>row.operation==='design-draft')).toHaveLength(1);
    const response=await api.get(`${runtime.url}/api/insights`);expect(response.status()).toBe(200);
    const {costs}=await response.json();
    assertCostIdentities(raw.costs,identities,costs);
    expect(costs.dayBoundary).toBe('UTC');
    expect(costs.byCampaign.filter((row:any)=>row.campaignId===null).reduce((sum:number,row:any)=>sum+row.facts,0)).toBe(4);
    expect(costs.byDay).toEqual(expect.arrayContaining([
      expect.objectContaining({day:'2031-10-04',provider:'reported-mail',currency:'USD',unitKind:'messages',billableUnits:6,reportedCostMicros:3000,unpricedFacts:1,facts:2}),
      expect.objectContaining({day:'2031-10-04',provider:'reported-mail',currency:'USD',unitKind:'segments',billableUnits:5,reportedCostMicros:7000,facts:1}),
      expect.objectContaining({day:'2031-10-05',provider:'reported-mail',currency:'EUR',unitKind:'messages',billableUnits:3,reportedCostMicros:6000,facts:1}),
    ]));
    const campaign=await (await api.get(`${runtime.url}/api/campaigns/${campaignId}/results`)).json();
    assertCostIdentities(raw.costs,identities.filter(row=>row.campaignId===campaignId),{byCampaign:campaign.costs,byDay:costs.byDay});
    expect(campaign.costs.reduce((sum:number,row:any)=>sum+row.facts,0)).toBe(7);
    expect(campaign.costs.filter((row:any)=>row.operation==='test-handoff').reduce((sum:number,row:any)=>sum+row.facts,0)).toBe(2);
    await page.goto(`${runtime.url}/app/insights`);
    await expect(page.getByRole('heading',{name:'Reported spend and usage'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'No campaign assigned'})).toBeVisible();
    const daily=page.getByRole('region',{name:'Costs on 2031-10-04 UTC'});
    await expect(daily).toContainText('6 messages');await expect(daily).toContainText('5 segments');await expect(daily).toContainText('priced subtotal');
    for(const proofWidth of [1440,390]) {
      await page.setViewportSize({width:proofWidth,height:1000});
      await page.screenshot({path:test.info().outputPath(`cost-identities-${proofWidth}.png`),fullPage:true});
    }
    await page.setViewportSize({width,height:1000});
    await page.reload();await expect(daily).toContainText('6 messages');
    await expect(page.getByRole('region',{name:'Costs on 2031-10-05 UTC'})).toContainText('EUR');
    for(let read=0;read<2;read++) {
      const reportResponse=await api.get(`${runtime.url}/api/insights`);expect(reportResponse.status()).toBe(200);
      const reloaded=(await reportResponse.json()).costs;
      expect(reloaded).toEqual(costs);
      const persisted=await records();
      expect(persisted).toEqual(raw);
      assertCostIdentities(persisted.costs,identities,reloaded);
      const campaignResponse=await api.get(`${runtime.url}/api/campaigns/${campaignId}/results`);expect(campaignResponse.status()).toBe(200);
      const campaignReloaded=await campaignResponse.json();
      expect(campaignReloaded.costs).toEqual(campaign.costs);
      assertCostIdentities(persisted.costs,identities.filter(row=>row.campaignId===campaignId),{byCampaign:campaignReloaded.costs,byDay:reloaded.byDay});
    }
    const fixture=await (await request.post(`${runtime.url}/_costs/usage`,{headers:control})).json();
    const report=await (await api.get(`${runtime.url}/api/insights`)).json(),usage=report.usage;
    expect(usage.totalContacts).toBe(fixture.contacts.length);
    for(const channel of ['email','sms']) {
      const counts=new Map<string,number>();
      for(const contact of fixture.contacts)counts.set(contact[`${channel}_status`],(counts.get(contact[`${channel}_status`])??0)+1);
      expect(usage.consent.filter((row:any)=>row.channel===channel)).toEqual([...counts].sort(([a],[b])=>a.localeCompare(b)).map(([state,contacts])=>({channel,state,contacts})));
    }
    for(const marker of ['usage-reader@example.test','+15555550123','Usage reader'])expect(JSON.stringify(usage)).not.toContain(marker);
    const recorded=(await (await request.post(`${runtime.url}/_costs/records`,{headers:control})).json()).costs;
    const eligible=recorded.filter((row:any)=>row.outcome!=='not-sent'&&row.occurred_at>=Date.parse(usage.monthStart)&&row.occurred_at<Date.parse(usage.asOf));
    for(const currency of ['USD','EUR']) {
      const facts=eligible.filter((row:any)=>row.currency===currency),priced=facts.filter((row:any)=>row.reported_cost_micros!==null);
      const total=priced.reduce((sum:number,row:any)=>sum+row.reported_cost_micros,0),row=usage.projection.find((row:any)=>row.currency===currency);
      expect(row.reportedCostMicros).toBe(total);
      expect(row.unpricedFacts).toBe(facts.filter((row:any)=>row.reported_cost_micros===null).length);
      expect(row.projectedCostMicros).toBe((BigInt(total)*BigInt(usage.monthMs)/BigInt(usage.elapsedMs)).toString());
    }
    expect(usage.projection.find((row:any)=>row.currency==='USD').unpricedFacts).toBe(1);
    const errors:string[]=[];
    page.on('console',message=>{if(message.type()==='error'&&/hydration|hydrated.*match/i.test(message.text()))errors.push(message.text());});
    page.on('pageerror',error=>errors.push(error.message));
     {
      await page.setViewportSize({width,height:1000});await openPage(page,`${runtime.url}/app/settings`);
      const panel=page.getByRole('region',{name:'Usage and provider costs'});
      await expect(panel.getByRole('region',{name:'Contacts by channel consent state'})).toContainText('subscribed');
      await expect(panel.getByRole('region',{name:'Projected month'})).toContainText('Projection, not a provider bill');
      await expect(panel.locator('[data-projection-currency="USD"]')).toContainText('1 unpriced facts');
      await expect(panel.locator('[data-projection-currency="EUR"]')).toBeVisible();
      await expect(panel).toContainText('No flows yet');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
      await page.screenshot({path:test.info().outputPath(`settings-usage-${width}.png`),fullPage:true});
    }
    expect(errors).toEqual([]);
  } finally {await runtime.close();}
};

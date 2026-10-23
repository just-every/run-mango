import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import { localSessionCookieName } from '../support/local-session';
import { expect, test } from '@playwright/test';
import { authoringRuntime } from '../campaign-authoring/browser-runtime.mjs';
import { proveCampaignCostFailure } from './cost-campaign-proof';
import { proveOperationalMailCosts } from './cost-mail-proof';
import { createOpenAiAdapter } from '../../src/core/platform/adapters/openai';

// One RESULT-004 journey covers parser/provider boundaries, real routes, persisted facts and reloadable totals.
test('[RESULT-004][REPORT-007] Settings consent counts, currency-separated projection and rejected AI spend, distinct handoffs and replayed purchases retain truthful campaign and UTC-day totals', async ({page,request}) => {
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
    for(const mode of ['invalid','unknown','failed']) {
      expect((await request.post(`${runtime.url}/_costs/mode`,{headers:control,data:{mode}})).ok()).toBe(true);
      const generated=await api.post(`${runtime.url}/api/proposals/generate`,{headers});
      expect(generated.status()).toBe(409);
      expect((await generated.json()).kind).toBe('failed');
    }
    const created=await api.post(`${runtime.url}/api/campaigns`,{headers,data:{}});expect(created.status()).toBe(201);
    const {campaignId,revisionId}=await created.json();
    expect((await api.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`,{headers,data:{name:'Cost evidence',emailSubject:'Garden news',emailBody:'<p>Garden news</p>'}})).status()).toBe(200);
    for(let attempt=0;attempt<2;attempt++) {
      const sent=await api.post(`${runtime.url}/api/campaigns/${campaignId}/test-send`,{headers,data:{revisionId,channel:'email',to:'costs@example.test'}});
      expect(sent.status(),await sent.text()).toBe(200);
    }
    for(let replay=0;replay<2;replay++) expect((await request.post(`${runtime.url}/_costs/confirmation`,{headers:control})).ok()).toBe(true);
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
    expect(costs.dayBoundary).toBe('UTC');
    expect(costs.byCampaign.filter((row:any)=>row.campaignId===null).reduce((sum:number,row:any)=>sum+row.facts,0)).toBe(4);
    expect(costs.byDay).toEqual(expect.arrayContaining([
      expect.objectContaining({day:'2031-10-04',provider:'reported-mail',currency:'USD',unitKind:'messages',billableUnits:6,reportedCostMicros:3000,unpricedFacts:1,facts:2}),
      expect.objectContaining({day:'2031-10-04',provider:'reported-mail',currency:'USD',unitKind:'segments',billableUnits:5,reportedCostMicros:7000,facts:1}),
      expect.objectContaining({day:'2031-10-05',provider:'reported-mail',currency:'EUR',unitKind:'messages',billableUnits:3,reportedCostMicros:6000,facts:1}),
    ]));
    const campaign=await (await api.get(`${runtime.url}/api/campaigns/${campaignId}/results`)).json();
    expect(campaign.costs.reduce((sum:number,row:any)=>sum+row.facts,0)).toBe(7);
    expect(campaign.costs.filter((row:any)=>row.operation==='test-handoff').reduce((sum:number,row:any)=>sum+row.facts,0)).toBe(2);
    await page.goto(`${runtime.url}/app/insights`);
    await expect(page.getByRole('heading',{name:'Reported spend and usage'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'No campaign assigned'})).toBeVisible();
    const daily=page.getByRole('region',{name:'Costs on 2031-10-04 UTC'});
    await expect(daily).toContainText('6 messages');await expect(daily).toContainText('5 segments');await expect(daily).toContainText('priced subtotal');
    await page.reload();await expect(daily).toContainText('6 messages');
    await expect(page.getByRole('region',{name:'Costs on 2031-10-05 UTC'})).toContainText('EUR');
    expect((await (await api.get(`${runtime.url}/api/insights`)).json()).costs).toEqual(costs);
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
    for(const width of [1440,390]) {
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
});

import { authoringRuntime } from './browser-runtime.mjs';
import { scratchDirectory } from '../support/artifacts.mjs';
import {test, expect, type Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const scratch=scratchDirectory('authoring-corrections');
const startRuntime = () => authoringRuntime({suite:'authoring-corrections'});
type Runtime=Awaited<ReturnType<typeof startRuntime>>;
let runtime:Runtime;
let session:string;
const requestLogs=new WeakMap<Page,unknown[]>();
test.describe.configure({mode:'serial',timeout:120000});
test.beforeAll(async()=>{
  test.setTimeout(120000);
  runtime=await startRuntime();
  const response=await fetch(runtime.url+'/_authoring/open',{method:'POST',headers:{'X-Test-Token':runtime.token}});
  expect(response.status).toBe(200);session=(await response.json()).token;
});
test.afterAll(async()=>{await runtime?.close();});
test.beforeEach(async({page})=>{
  await page.context().addCookies([{name:'operator_session_local',value:session,url:runtime.url}]);
  const requests:unknown[]=[];
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/'))requests.push({url:request.url(),method:request.method(),data:request.postData()});});
  requestLogs.set(page,requests);
});
test.afterEach(async({page},info)=>{if(info.status!==info.expectedStatus){await writeFile(join(scratch,'failure-ui.txt'),await page.locator('body').innerText());await writeFile(join(scratch,'failure-api.json'),JSON.stringify(requestLogs.get(page),null,2));}});
async function api(path:string,method='GET',body?:unknown) {
  const response=await fetch(runtime.url+path,{method,headers:{Cookie:`operator_session_local=${session}`,Origin:runtime.url,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
}
async function blank(page:Page) {
  await page.goto(runtime.url+'/app/campaigns');
  await page.getByRole('button',{name:'New campaign',exact:true}).click();
  await page.getByRole('button',{name:'Blank newsletter',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Untitled campaign',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Add email step',exact:true}).click();
  await expect(page.getByRole('button',{name:'Remove step 1',exact:true})).toBeVisible();
  await page.getByLabel('Local send date and time',{exact:true}).fill('2031-04-07T10:00');
  return new URL(page.url()).pathname.split('/')[3];
}
async function noDeliveryEffects() {
  const response=await fetch(runtime.url+'/_authoring/state',{headers:{'X-Test-Token':runtime.token}});
  expect(await response.json()).toEqual({jobs:[],recipients:[],approvals:[]});
}

test('[CAMP-002][CAMP-003][AUD-001] delayed duplicate Review reads preserve unsaved audience and channel edits',async({page})=>{
  for(let attempt=0;attempt<2;attempt++) {
    let reads=0,release!:()=>void,observed!:()=>void,returned!:()=>void;
    const held=new Promise<void>(resolve=>release=resolve),seen=new Promise<void>(resolve=>observed=resolve),finished=new Promise<void>(resolve=>returned=resolve);
    await page.route('**/api/campaigns/*/review',async route=>{
      const ordinal=++reads,response=await route.fetch();
      if(ordinal===2){observed();await held;}
      await route.fulfill({response});
      if(ordinal===2)returned();
    });
    try {
    const id=await blank(page);
    await page.getByLabel('Include 1 field',{exact:true}).selectOption('contact:email');
    await page.getByLabel('Include 1 comparison',{exact:true}).selectOption('contains');
    await page.getByLabel('Include 1 value',{exact:true}).fill('@example.test');
    await seen;release();await finished;await page.unroute('**/api/campaigns/*/review');
    await expect(page.getByLabel('Live audience estimate')).toContainText('2 candidates · 1 eligible contacts · 1 excluded contacts');
    await expect(page.getByRole('button',{name:'Remove step 1',exact:true})).toBeVisible();
    await expect(page.getByLabel('Local send date and time',{exact:true})).toHaveValue('2031-04-07T10:00');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    expect((await api(`/api/campaigns/${id}`)).body.steps).toHaveLength(1);
    } finally {release();await page.unroute('**/api/campaigns/*/review');}
  }
  await noDeliveryEffects();
});

for(const target of ['Include 1','Exclude 1']) test(`[CAMP-002][CAMP-003][AUD-001][STORE-006] ${target} commerce lookback switches to a saved editable contact condition`,async({page})=>{
  const id=await blank(page);
  await page.getByLabel('Include 1 field',{exact:true}).selectOption('contact:email');
  await expect(page.getByRole('button',{name:'Remove step 1',exact:true})).toBeVisible();
  await page.getByLabel('Include 1 comparison',{exact:true}).selectOption('contains');
  await expect(page.getByRole('button',{name:'Remove step 1',exact:true})).toBeVisible();
  await page.getByLabel('Include 1 value',{exact:true}).fill('@example.test');
  await expect(page.getByRole('button',{name:'Remove step 1',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Add inclusion condition',exact:true}).click();
  await expect(page.getByRole('button',{name:'Remove step 1',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Add exclusion',exact:true}).click();
  await expect(page.getByRole('button',{name:'Remove step 1',exact:true})).toBeVisible();
  await page.getByLabel('Exclude 1 value',{exact:true}).fill('never@example.test');
  await expect(page.getByRole('button',{name:'Remove step 1',exact:true})).toBeVisible();
  const live=page.getByLabel('Live audience estimate');
  await expect(live).toContainText('1 candidates · 1 eligible contacts · 0 excluded contacts');
  await page.getByLabel(`${target} field`,{exact:true}).selectOption('order:productId');
  await page.getByLabel(`${target} lookback days`,{exact:true}).fill('30');
  await expect(live).toContainText('Counts unavailable.');
  await page.getByLabel(`${target} field`,{exact:true}).selectOption('cart:productId');
  await expect(page.getByLabel(`${target} lookback days`,{exact:true})).toHaveValue('30');
  await page.getByLabel(`${target} field`,{exact:true}).selectOption('contact:email');
  await expect(page.getByLabel(`${target} field`,{exact:true})).toHaveValue('contact:email');
  await expect(page.getByText('This draft has invalid audience rules.',{exact:false})).toHaveCount(0);
  await expect(page.getByLabel(`${target} lookback days`,{exact:true})).toHaveCount(0);
  await expect(page.getByLabel(`${target} comparison`,{exact:true})).toHaveValue('contains');
  await expect(page.getByLabel(`${target} value`,{exact:true})).toHaveValue(target==='Include 1'?'@example.test':'never@example.test');
  await expect(live).toContainText('1 candidates · 1 eligible contacts · 0 excluded contacts');
  await page.getByRole('button',{name:'Save full draft',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
  const detail=(await api(`/api/campaigns/${id}`)).body;
  expect(JSON.parse(detail.revision.inclusionRuleJson)).toEqual({version:1,operator:'all',predicates:[
    {sourceType:'contact',field:'email',comparator:'contains',value:'@example.test'},
    {sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'},
  ]});
  expect(JSON.parse(detail.revision.exclusionRulesJson)).toEqual([{version:1,reason:'operator-exclusion-1',predicate:{sourceType:'contact',field:'email',comparator:'contains',value:'never@example.test'}}]);
  expect(detail.steps).toHaveLength(1);expect(detail.campaign.state).toBe('draft');
  await page.reload();
  await expect(page.getByLabel(`${target} value`,{exact:true})).toBeEditable();
  await page.getByLabel(`${target} value`,{exact:true}).fill(target==='Include 1'?'missing@':'subscribed@');
  await expect(live).toContainText('0 eligible contacts');
  await noDeliveryEffects();
});

test('[STORE-003][STORE-004][STORE-005][PROP-007][CAMP-004] Decision Desk and saved Review expose safe source guidance while D1 retains diagnostics',async({page})=>{
  const source=await fetch(runtime.url+'/_authoring/source',{method:'POST',headers:{'X-Test-Token':runtime.token}});expect(source.status).toBe(200);
  const raw='RAW_PROVIDER_DIAGNOSTIC_SENTINEL provider 401 invalid credential';
  await runtime.sql(`UPDATE source_syncs SET last_error='${raw}' WHERE source_type='product'`);
  await runtime.sql(`UPDATE commerce_source_capabilities SET detail='${raw}' WHERE source_type='product'`);
  await runtime.sql(`INSERT INTO source_sync_runs (id,provider,source_type,state,pages,records,last_error,created_at,updated_at) VALUES ('failed-sync','shopify','product','failed',2,10,'${raw}',${Date.now()},${Date.now()})`);
  const before=(await runtime.sql("SELECT * FROM source_syncs WHERE source_type='product'"))[0];
  const runBefore=(await runtime.sql("SELECT * FROM source_sync_runs WHERE id='failed-sync'"))[0];
  const guidance='Product source sync failed. Check commerce settings, then sync it successfully before continuing.';
  const desk=await api('/api/decision-desk');expect(desk.status).toBe(200);
  expect(JSON.stringify(desk.body)).not.toContain(raw);
  expect(desk.body.sourceStatus.sourceSyncs).toContainEqual(expect.objectContaining({sourceType:'product',lastError:guidance,lastSuccessfulAt:new Date(before.last_successful_at).toISOString()}));
  expect(desk.body.sourceStatus.syncRuns).toContainEqual(expect.objectContaining({id:'failed-sync',state:'failed',pages:2,records:10,lastError:guidance}));
  await page.goto(runtime.url+'/app');
  await expect(page.getByRole('heading',{name:'Decision Desk',exact:true})).toBeVisible();
  await expect(page.getByText(guidance,{exact:true})).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain(raw);
  expect((await runtime.sql("SELECT * FROM source_syncs WHERE source_type='product'"))[0]).toEqual(before);
  expect((await runtime.sql("SELECT * FROM source_sync_runs WHERE id='failed-sync'"))[0]).toEqual(runBefore);
  const id=await blank(page),detail=(await api(`/api/campaigns/${id}`)).body;
  const inclusionRuleJson=JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'product',field:'title',comparator:'eq',value:'Garden linen'}]});
  expect((await api(`/api/campaign-revisions/${detail.revision.id}`,'PATCH',{inclusionRuleJson})).status).toBe(200);
  const checked=await api(`/api/campaigns/${id}/checks`,'POST',{revisionId:detail.revision.id});expect(checked.status).toBe(200);
  expect(JSON.stringify(checked.body)).not.toContain(raw);
  expect(checked.body.checks).toContainEqual(expect.objectContaining({kind:'audience.resolution',status:'blocked',blocking:true,detail:expect.stringMatching(/Product source.*sync/i)}));
  const blocked=await api(`/api/campaigns/${id}/approve`,'POST',{revisionId:detail.revision.id,idempotencyKey:crypto.randomUUID()});
  expect(blocked.status).toBe(409);expect(blocked.body.status).toBe('blocked');expect(JSON.stringify(blocked.body)).not.toContain(raw);
  // Historical saved checks are projected safely without rewriting their diagnostic evidence.
  await runtime.sql(`UPDATE campaign_checks SET detail='${raw}' WHERE revision_id='${detail.revision.id}' AND kind='audience.resolution'`);
  for(const path of [`/api/campaigns/${id}`,`/api/campaigns/${id}/review`]) expect(JSON.stringify((await api(path)).body)).not.toContain(raw);
  await page.reload();
  await expect(page.getByRole('heading',{name:'Untitled campaign',exact:true})).toBeVisible();
  await expect(page.getByText(/Product source.*sync/i).first()).toBeVisible();
  expect(await page.locator('body').innerText()).not.toContain(raw);
  expect((await runtime.sql("SELECT * FROM source_syncs WHERE source_type='product'"))[0]).toEqual(before);
  expect(await runtime.sql(`SELECT detail FROM campaign_checks WHERE revision_id='${detail.revision.id}' AND kind='audience.resolution'`)).toEqual([{detail:raw}]);
  await noDeliveryEffects();
  // A genuine successful ingest clears only the current source failure and restores its status.
  expect((await fetch(runtime.url+'/_authoring/source',{method:'POST',headers:{'X-Test-Token':runtime.token}})).status).toBe(200);
  expect((await api('/api/decision-desk')).body.sourceStatus.sourceSyncs).toContainEqual(expect.objectContaining({sourceType:'product',lastError:null}));
});

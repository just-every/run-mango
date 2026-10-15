import { authoringRuntime } from './browser-runtime.mjs';
import { scratchDirectory } from '../support/artifacts.mjs';
import {test, expect, type Page} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {CampaignDetail} from '../../src/core/app/client/lib/types';

const scratch=scratchDirectory('authoring-review-save');
const startRuntime = () => authoringRuntime({suite:'authoring-review-save'});
let runtime:Awaited<ReturnType<typeof startRuntime>>,session:string;
test.describe.configure({mode:'serial',timeout:120000});
test.use({viewport:{width:390,height:1000},timezoneId:'Asia/Kathmandu'});
test.beforeAll(async()=>{
  test.setTimeout(120000);
  runtime=await startRuntime();
  const response=await fetch(runtime.url+'/_authoring/open',{method:'POST',headers:{'X-Test-Token':runtime.token,Connection:'close'}});
  expect(response.status).toBe(200);session=(await response.json()).token;
});
test.afterAll(async()=>{test.setTimeout(120000);await runtime?.close();});
test.beforeEach(async({page})=>{test.setTimeout(120000);await page.context().addCookies([{name:'operator_session_local',value:session,url:runtime.url}]);});
test.afterEach(async({page},info)=>{test.setTimeout(120000);if(info.status!==info.expectedStatus){await writeFile(join(scratch,`failure-${info.testId}.txt`),await page.locator('body').innerText());}});
async function api(path:string,method='GET',body?:unknown) {
  const response=await fetch(runtime.url+path,{method,headers:{Cookie:`operator_session_local=${session}`,Origin:runtime.url,'Content-Type':'application/json',Connection:'close'},body:body===undefined?undefined:JSON.stringify(body)});
  expect(response.ok,`${method} ${path}: ${response.status}`).toBe(true);return response.json();
}
async function effects() {
  const response=await fetch(runtime.url+'/_authoring/state',{headers:{'X-Test-Token':runtime.token,Connection:'close'}});
  return response.json();
}
function composition(detail:CampaignDetail) {
  const {id,campaignId,version,state,createdAt,updatedAt,...fields}=detail.revision!;
  return {fields,links:detail.links.map(({label,destinationUrl})=>({label,destinationUrl})),steps:detail.steps.map(({channel,timezone,scheduledAt,sendByAt,whyThisTime})=>({channel,timezone,scheduledAt,sendByAt,whyThisTime}))};
}
async function draft() {
  const {campaignId,revisionId}=await api('/api/campaigns','POST',{});
  await api(`/api/campaign-revisions/${revisionId}`,'PATCH',{name:'Saved newsletter',emailSubject:'October letter',preheader:'News from our desk',emailBody:'Original saved body.',steps:[{channel:'email',timezone:'Australia/Brisbane',localScheduledAt:'2030-09-05T11:10',whyThisTime:'Chosen by the operator.'}]});
  return {campaignId,revisionId};
}
async function assertCleanPreview(page:Page,name:string,body:string) {
  await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveText(body);
  await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText(body);
  await expect(page.locator('.preview-plain-text')).toContainText(body);
  await expect(page.getByText('Unsaved changes. Save before approving.',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Approve & schedule',exact:true})).toBeEnabled();
}
async function save(page:Page,campaignId:string) {
  const refreshed=page.waitForResponse(response=>response.url().endsWith(`/api/campaigns/${campaignId}/review`));
  await page.getByRole('button',{name:'Save full draft',exact:true}).click();
  await (await refreshed).finished();
  await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
}
async function approve(page:Page,campaignId:string,revisionId:string) {
  const before=await api(`/api/campaigns/${campaignId}`),stateBefore=await effects();
  const response=page.waitForResponse(response=>response.url().endsWith(`/api/campaigns/${campaignId}/approve`)&&response.request().method()==='POST');
  await page.getByRole('button',{name:'Approve & schedule',exact:true}).click();
  const approved=await response;expect(approved.status()).toBe(200);
  expect(approved.request().postDataJSON()).toMatchObject({revisionId});
  const authority=await approved.json();expect(authority.status).toBe('scheduled');
  await expect(page.getByRole('status').filter({hasText:'exact saved revision is approved and scheduled'})).toBeVisible();
  const after=await api(`/api/campaigns/${campaignId}`),stateAfter=await effects();
  expect(after.revision.id).toBe(revisionId);expect(after.revision.state).toBe('approved');
  for(const key of ['name','emailBody','emailText','emailSubject','preheader','inclusionRuleJson','exclusionRulesJson']) expect(after.revision[key]).toBe(before.revision[key]);
  expect(after.steps).toEqual(before.steps);expect(after.links).toEqual(before.links);
  expect(stateAfter.approvals.filter((row:{campaign_id:string})=>row.campaign_id===campaignId)).toEqual([expect.objectContaining({revision_id:revisionId,revision_digest:authority.revisionDigest})]);
  // These 2030 schedules retain their approval and recipients without an early dispatch command.
  expect(stateAfter.jobs).toEqual(stateBefore.jobs);expect(stateAfter.recipients).toHaveLength(stateBefore.recipients.length+1);
  expect(stateAfter.recipients.at(-1).transport_disposition).toBe('queued');
}

for(const kind of ['rich body','local schedule']) test(`[CAMP-002][CAMP-003][CAMP-004][CAMP-006] acknowledged normalized ${kind} no-op save reconciles and approves the exact saved revision`,async({page})=>{
  const {campaignId,revisionId}=await draft(),before=await api(`/api/campaigns/${campaignId}`),stateBefore=await effects();
  await page.goto(`${runtime.url}/app/campaigns/${campaignId}/review`);
  await assertCleanPreview(page,'Saved newsletter','Original saved body.');
  if(kind==='rich body') {
    await page.getByRole('textbox',{name:'Email body',exact:true}).fill('Temporary unsaved body.');
    await page.getByRole('textbox',{name:'Email body',exact:true}).fill('Original saved body.');
  } else {
    await page.getByLabel('Local send date and time',{exact:true}).fill('2030-09-05T11:20');
    await page.getByLabel('Local send date and time',{exact:true}).fill('2030-09-05T11:10');
  }
  await expect(page.getByText('Unsaved changes. Save before approving.',{exact:true})).toBeVisible();
  await save(page,campaignId);
  expect(composition(await api(`/api/campaigns/${campaignId}`))).toEqual(composition(before));
  await assertCleanPreview(page,'Saved newsletter','Original saved body.');
  await expect(page.getByLabel('Local send date and time',{exact:true})).toHaveValue('2030-09-05T11:10');
  await expect(page.getByLabel('Resolved UTC send instant',{exact:true})).toHaveValue('2030-09-05T01:10:00.000Z');
  expect(await effects()).toEqual(stateBefore);
  await approve(page,campaignId,revisionId);
});

test('[CAMP-002][CAMP-003][CAMP-004] late pre-save Review read cannot replace acknowledged content or approval authority',async({page})=>{
  let reads=0,release!:()=>void,observed!:()=>void,returned!:()=>void;
  const held=new Promise<void>(resolve=>release=resolve),seen=new Promise<void>(resolve=>observed=resolve),finished=new Promise<void>(resolve=>returned=resolve);
  const responses:{ordinal:number;name:string;body:string}[]=[];
  await page.route('**/api/campaigns/*/review',async route=>{
    const ordinal=++reads,response=await route.fetch(),data=await response.json();
    responses.push({ordinal,name:data.revision.name,body:data.revision.emailBody});
    if(ordinal===2){observed();await held;}
    // The departed page may already have abandoned this request; that cannot redirect it.
    await route.fulfill({response}).catch(error=>{if(!/already handled/i.test(String(error?.message)))throw error;});if(ordinal===2)returned();
  });
  try {
    await page.goto(runtime.url+'/app/campaigns');
    await page.getByRole('button',{name:'New campaign',exact:true}).click();
    await page.getByRole('button',{name:'Blank newsletter',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Untitled campaign',exact:true})).toBeVisible();await seen;
    const campaignId=new URL(page.url()).pathname.split('/')[3],initial=await api(`/api/campaigns/${campaignId}`),stateBefore=await effects();
    await page.getByLabel('Campaign name',{exact:true}).fill('Acknowledged newsletter');
    await page.getByLabel('Email subject',{exact:true}).fill('Saved subject');
    await page.getByLabel('Email preheader',{exact:true}).fill('Saved preheader');
    await page.getByRole('textbox',{name:'Email body',exact:true}).fill('The acknowledged body.');
    await page.getByRole('button',{name:'Add email step',exact:true}).click();
    await page.getByLabel('Local send date and time',{exact:true}).fill('2030-09-05T11:10');
    await save(page,campaignId);
    await assertCleanPreview(page,'Acknowledged newsletter','The acknowledged body.');
    const saved=await api(`/api/campaigns/${campaignId}`);
    release();await finished;await page.unroute('**/api/campaigns/*/review');
    // Flush the response and React render before checking both saved surfaces and authority.
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    await assertCleanPreview(page,'Acknowledged newsletter','The acknowledged body.');
    await expect(page.getByLabel('Local send date and time',{exact:true})).toHaveValue('2030-09-05T11:10');
    expect(responses.find(response=>response.ordinal===2)?.name).toBe('Untitled campaign');
    expect(responses.find(response=>response.ordinal===3)?.name).toBe('Acknowledged newsletter');
    expect(composition(await api(`/api/campaigns/${campaignId}`))).toEqual(composition(saved));
    expect(await effects()).toEqual(stateBefore);
    await approve(page,campaignId,initial.revision.id);
  } finally {release();await page.unroute('**/api/campaigns/*/review');await writeFile(join(scratch,'response-order.json'),JSON.stringify(responses,null,2));}
});

test('[CAMP-002][CAMP-003][CAMP-004] a failed canonical reload retains edits and does not claim the preview refreshed',async({page})=>{
  const {campaignId}=await draft(),stateBefore=await effects();
  await page.goto(`${runtime.url}/app/campaigns/${campaignId}/review`);
  await assertCleanPreview(page,'Saved newsletter','Original saved body.');
  await page.getByRole('textbox',{name:'Email body',exact:true}).fill('Persisted despite read failure.');
  await page.route(`**/api/campaigns/${campaignId}/review`,route=>route.abort('failed'));
  await page.getByRole('button',{name:'Save full draft',exact:true}).click();
  await expect(page.getByText('Draft saved, but the saved revision could not be reloaded. Reload this campaign before approving.',{exact:true})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveText('Persisted despite read failure.');
  await expect(page.getByText('Unsaved changes. Save before approving.',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Approve & schedule',exact:true})).toHaveCount(0);
  expect((await api(`/api/campaigns/${campaignId}`)).revision.emailBody).toContain('Persisted despite read failure.');
  expect(await effects()).toEqual(stateBefore);
  await page.unroute(`**/api/campaigns/${campaignId}/review`);
  await page.reload();await assertCleanPreview(page,'Saved newsletter','Persisted despite read failure.');
});

test('[CAMP-002][BASE-ACCESS-002] a departed Review request cannot redirect the current authenticated page',async({page})=>{
  const target=await draft();
  await api(`/api/campaign-revisions/${target.revisionId}`,'PATCH',{name:'Current review'});
  const stateBefore=await effects();
  let reads=0,release!:()=>void,observed!:()=>void,returned!:()=>void;
  const held=new Promise<void>(resolve=>release=resolve),seen=new Promise<void>(resolve=>observed=resolve),finished=new Promise<void>(resolve=>returned=resolve);
  await page.route('**/api/campaigns/*/review',async route=>{
    const ordinal=++reads;
    // The server produces this auth failure itself; forward its actual response after navigation.
    const response=await route.fetch(ordinal===2?{headers:{...route.request().headers(),cookie:''}}:{});
    if(ordinal===2){expect(response.status()).toBe(401);observed();await held;}
    // The departed page may already have abandoned this request; that cannot redirect it.
    await route.fulfill({response}).catch(error=>{if(!/already handled/i.test(String(error?.message)))throw error;});if(ordinal===2)returned();
  });
  try {
    await page.goto(runtime.url+'/app/campaigns');
    await page.getByRole('button',{name:'New campaign',exact:true}).click();
    await page.getByRole('button',{name:'Blank newsletter',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Untitled campaign',exact:true})).toBeVisible();await seen;
    await page.getByRole('link',{name:'Back to campaigns',exact:false}).click();
    await page.getByRole('link').filter({hasText:'Current review'}).click();
    await assertCleanPreview(page,'Current review','Original saved body.');
    release();await finished;await page.unroute('**/api/campaigns/*/review');
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    await expect(page).toHaveURL(`${runtime.url}/app/campaigns/${target.campaignId}/review`);
    await assertCleanPreview(page,'Current review','Original saved body.');
    expect(await effects()).toEqual(stateBefore);
  } finally {release();await page.unroute('**/api/campaigns/*/review');}
});

for(const kind of ['changed then discarded','clean no-op']) test(`[CAMP-002][CAMP-003][CAMP-004][CAMP-006] ${kind} save with failed canonical read keeps approval and test authority fenced until recovery`,async({page})=>{
  const {campaignId,revisionId}=await draft(),stateBefore=await effects();
  const body=kind==='changed then discarded'?'Persisted body requiring a new review.':'Original saved body.';
  await page.goto(`${runtime.url}/app/campaigns/${campaignId}/review`);
  await assertCleanPreview(page,'Saved newsletter','Original saved body.');
  const actions:string[]=[];
  page.on('request',request=>{if(request.method()==='POST'&&/\/(approve|test-send)$/.test(request.url())) actions.push(request.url());});
  if(kind==='changed then discarded') await page.getByRole('textbox',{name:'Email body',exact:true}).fill(body);
  const reviewPath=`**/api/campaigns/${campaignId}/review`;
  await page.route(reviewPath,route=>route.abort('failed'));
  await page.getByRole('button',{name:'Save full draft',exact:true}).click();
  await expect(page.getByText('Draft saved, but the saved revision could not be reloaded. Reload this campaign before approving.',{exact:true})).toBeVisible();
  expect((await api(`/api/campaigns/${campaignId}`)).revision.emailBody).toContain(body);
  if(kind==='changed then discarded') {
    await expect(page.getByRole('textbox',{name:'Email body',exact:true})).toHaveText(body);
    await expect(page.getByRole('button',{name:'Reload saved revision',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Discard changes',exact:true}).click();
  }
  const guidance=page.getByText('The displayed saved preview and checks are out of date. Approval and test sends are unavailable until the saved revision is reloaded.',{exact:true});
  await expect(guidance).toBeVisible();
  await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('Original saved body.');
  const approveButton=page.getByRole('button',{name:'Approve & schedule',exact:true});
  await expect(approveButton).toBeDisabled();
  const testDisclosure=page.getByRole('button',{name:'Send a test',exact:true});
  await testDisclosure.click();
  await expect(testDisclosure).toHaveAttribute('aria-expanded','true');
  await page.getByLabel('Test destination',{exact:true}).fill('not-allowlisted@example.test');
  const testButton=page.getByRole('button',{name:'Send test',exact:true});
  await expect(testButton).toBeDisabled();
  // Invoke the approval handler to verify its authority check even while the control is disabled.
  await approveButton.evaluate(element=>{
    const props=Object.entries(element).find(([key])=>key.startsWith('__reactProps$'))?.[1] as {onClick:()=>void}|undefined;
    if(!props?.onClick) throw new Error('The mounted approval handler is missing.');
    props.onClick();
  });
  await expect(page.getByText('Reload the saved revision before approving or sending a test.',{exact:true})).toBeVisible();
  // The real form submit path still rejects the test action while the saved preview is stale.
  await page.getByRole('form',{name:'Send a test',exact:true}).evaluate(form=>(form as HTMLFormElement).requestSubmit());
  await expect(page.getByText('Reload the saved revision before approving or sending a test.',{exact:true})).toBeVisible();
  expect(actions).toEqual([]);expect(await effects()).toEqual(stateBefore);
  // A failed recovery and further local edit/discard must leave the authority invalid.
  await page.getByRole('button',{name:'Reload saved revision',exact:true}).click();
  await expect(page.getByRole('button',{name:'Reload saved revision',exact:true})).toBeEnabled();
  await expect(guidance).toBeVisible();await expect(approveButton).toBeDisabled();
  await page.getByLabel('Campaign name',{exact:true}).fill('Edits remain protected');
  await expect(page.getByRole('button',{name:'Reload saved revision',exact:true})).toBeDisabled();
  await page.getByRole('link',{name:'Back to campaigns',exact:false}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button',{name:'Keep editing',exact:true}).click();
  await expect(page.getByLabel('Campaign name',{exact:true})).toHaveValue('Edits remain protected');
  await page.getByRole('button',{name:'Discard changes',exact:true}).click();
  await expect(guidance).toBeVisible();await expect(approveButton).toBeDisabled();
  await testDisclosure.click();
  await expect(testDisclosure).toHaveAttribute('aria-expanded','false');
  await testDisclosure.click();
  await expect(testDisclosure).toHaveAttribute('aria-expanded','true');
  await expect(testButton).toBeDisabled();expect(actions).toEqual([]);
  await page.unroute(reviewPath);
  const recovered=page.waitForResponse(response=>response.url().endsWith(`/api/campaigns/${campaignId}/review`));
  await page.getByRole('button',{name:'Reload saved revision',exact:true}).click();
  expect((await recovered).status()).toBe(200);
  await assertCleanPreview(page,'Saved newsletter',body);
  await expect(guidance).toHaveCount(0);
  // Recovery permits the actual server to apply its test destination fence, without any provider call.
  if(await testDisclosure.getAttribute('aria-expanded')==='false') await testDisclosure.click();
  await expect(testDisclosure).toHaveAttribute('aria-expanded','true');
  const tested=page.waitForResponse(response=>response.url().endsWith(`/api/campaigns/${campaignId}/test-send`));
  await page.getByRole('button',{name:'Send test',exact:true}).click();
  const response=await tested;expect(response.status()).toBe(409);
  expect(response.request().postDataJSON()).toEqual({revisionId,channel:'email',to:'not-allowlisted@example.test'});
  expect(await response.json()).toMatchObject({status:'blocked',blockers:[{detail:'Destination is not on the operator test-send allowlist.'}]});
  expect(await effects()).toEqual(stateBefore);
  await approve(page,campaignId,revisionId);
  expect(actions).toHaveLength(2);
});

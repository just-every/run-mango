import {proveOverview} from './overview-journey';
import { exerciseRetention } from './retention-journey';
import { exerciseCampaignReports } from './reporting-journey';
import { localSessionCookieName } from '../support/local-session';
import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { test, contract, runtime } from './runtime-fixture';
import { fixedNow,states } from './fixtures';
import { openPage, reloadPage } from '../support/navigation';
async function seed(request:any,action:string) {const response=await request.post(`${runtime.url}/_results/${action}`,{headers:{'X-Test-Token':runtime.token}});expect(response.status()).toBe(200);return response.json();}
async function login(page:any,request:any) {const {token}=await seed(request,'open');await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:token,domain:'127.0.0.1',path:'/'}]);await page.clock.install({time:fixedNow});}
// WCAG 2.x contrast of an element's text on its own background, from computed styles.
async function textContrast(element:any) {
  const [fg,bg]=await element.evaluate((el:Element)=>{const s=getComputedStyle(el);return [s.color,s.backgroundColor];});
  const luminance=(value:string)=>{const [r,g,b]=value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(c=>{c/=255;return c<=0.03928?c/12.92:((c+0.055)/1.055)**2.4;});return 0.2126*r+0.7152*g+0.0722*b;};
  const [a,b]=[luminance(fg),luminance(bg)].sort((x,y)=>y-x);return (a+0.05)/(b+0.05);
}
// Check the settled page: a fresh-data reload briefly replaces the document between rendered states.
async function accessible(page:any,width:number) {await page.waitForLoadState('networkidle');await expect(page.locator('main').first()).toBeVisible();await expect(page.getByRole('heading',{level:1}).first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);}
function expectedLocalClockAndZone(value:string,timeZone:string) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit',timeZone,timeZoneName:'short'}).formatToParts(new Date(value)).map(({type,value})=>[type,value]));
  return `${parts.hour}:${parts.minute} ${parts.dayPeriod} ${parts.timeZoneName}`;
}
for(const width of [1440]) {
  contract('RESULT-001',`[REPORT-001][REPORT-006] campaign names come from the collection when detail requests fail and overview matches period records at ${width}`,async({page,request})=>{
    await seed(request,'filters');await login(page,request);await page.setViewportSize({width,height:900});
    const response=await page.request.get(`${runtime.url}/api/campaigns`);expect(response.ok()).toBe(true);const collection=await response.json();
    const names=collection.campaigns.map((campaign:any)=>campaign.name);
    expect(collection.campaigns).toHaveLength(21);expect(names.every((name:string|null)=>typeof name==='string'&&name.length>0)).toBe(true);
    expect(collection.campaigns.every((campaign:any)=>campaign.name!==campaign.id)).toBe(true);
    await page.route('**/api/campaigns/*',route=>route.abort('failed'));
    await openPage(page,`${runtime.url}/app/campaigns`);
    await expect(page.locator('.campaign-row')).toHaveCount(collection.campaigns.length);
    await expect(page.locator('.campaign-row strong')).toHaveText(names);
    const cancelled=page.locator('.status-pill--cancelled').first();
    await expect(cancelled).toBeVisible();await expect(cancelled).toContainText(/cancelled/i);
    expect(await textContrast(cancelled)).toBeGreaterThanOrEqual(4.5);
    await accessible(page,width);
    await page.screenshot({path:test.info().outputPath(`campaign-names-${width}.png`),fullPage:true});
    await proveOverview(page,request,runtime,width,test.info());
  });
  contract('CAMP-001',`[CAMP-009][CAMP-010][SEND-006][SEND-007][RESULT-001][RESULT-007][RESULT-008][SEG-003][REPORT-004] stored step results and deadline/DST truth at ${width}`,async({page,request})=>{
    await seed(request,'outcomes');await login(page,request);await page.setViewportSize({width,height:900});
    const raw=await seed(request,'counts');
    for(const [id,state] of [['scheduled','Scheduled'],['sending','Sending'],['mixed','Sent'],['missed','Missed'],['partial','Sent'],['cancelled','Cancelled'],['failed','Failed'],['failed-before','Failed'],['closed-partial','Sent'],['closed-fence','Sending'],['dst','Scheduled']]) {
      await openPage(page,`${runtime.url}/app/campaigns/${id}/scheduled`);
      await expect(page.getByRole('heading',{name:`Campaign ${id}`,exact:true})).toBeVisible();
      const response=await page.request.get(`${runtime.url}/api/campaigns/${id}`);expect(response.ok()).toBe(true);const detail=await response.json();
      expect(detail.results.asOf).toBe(fixedNow.toISOString());
      await expect(page.locator('.step-results > li')).toHaveCount(detail.steps.length);
      expect(await page.locator('.step-results > li').evaluateAll((rows:HTMLElement[])=>rows.map(row=>row.dataset.stepId))).toEqual(detail.steps.map((step:any)=>step.id));
      await expect(page.locator('.step-result-state').first()).toHaveText(state);
      expect(detail.revision.audienceRule).not.toBe('Old misleading note');
      for(const step of detail.steps) {
        const row=page.locator(`[data-step-id="${step.id}"]`);
        const channelName=({email:'Email',sms:'SMS'} as Record<string,string>)[step.channel];
        await expect(row.locator('h3')).toHaveText(`Step ${step.sequence} · ${channelName}`);
        await expect(row.locator('time').first()).toContainText(expectedLocalClockAndZone(step.scheduledAt,'Australia/Brisbane'));
        await expect(row).toContainText('Australia/Brisbane');await expect(row).toContainText('Resolved UTC:');await expect(row).toContainText('Resolved UTC deadline:');
        const expected=raw.filter((entry:any)=>entry.campaign_id===id&&entry.revision_id===`${id}-revision`&&entry.step_id===step.id);
        await expect(row.locator('.disposition-counts > div')).toHaveCount(expected.length);
        for(const bucket of expected) {
          const bucketRow=row.locator(`[data-disposition="${bucket.disposition}"]${bucket.reason?`[data-skip-reason="${bucket.reason}"]`:':not([data-skip-reason])'}`);
          await expect(bucketRow.locator('dd')).toHaveText(String(bucket.count));
        }
      }
      await expect(page.getByRole('button',{name:'Cancel campaign',exact:true})).toHaveCount(['scheduled','sending','dst'].includes(id)?1:0);
      if(id==='scheduled') await expect(page.locator('.step-results').getByText(/Dispatches in/)).toHaveCount(3);
      if(id==='mixed') {await expect(page.getByText('Handed off',{exact:true})).toBeVisible();await expect(page.getByText('Accepted',{exact:true})).toBeVisible();await expect(page.getByText('Delivered',{exact:true})).toBeVisible();}
      if(id==='missed') {await expect(page.locator('.overall-result')).toContainText('1 recipient-steps were not sent');await expect(page.locator('.step-results')).toContainText('Send window closed at');await expect(page.locator('.step-results')).toContainText('Queued records remain unsent');}
      if(id==='failed-before') {await expect(page.locator('.step-result-state')).toHaveText(['Failed','Sent','Sending']);await expect(page.locator('[data-step-id="failed-before-step-1"]')).toContainText('The email adapter is unavailable.');}
      if(id==='closed-partial') {await expect(page.locator('.overall-result')).toContainText('5 recipient-steps unsent');expect(detail.results.steps[0].expiredQueuedCount).toBe(4);expect(detail.results.steps[0].inFlightCount).toBe(0);}
      if(id==='closed-fence') {await expect(page.locator('.step-results')).toContainText('1 queued recipient-steps have begun provider handoff');await expect(page.locator('.step-results')).not.toContainText('Queued records remain unsent');expect(detail.results.steps[0].inFlightCount).toBe(1);expect(detail.results.steps[0].expiredQueuedCount).toBe(0);await expect(page.locator('.overall-result')).not.toContainText('unsent');}
      if(id==='scheduled') {await expect(page.locator('.action-notice[role="status"]')).toHaveText('Campaign approved and scheduled.');await expect(page.locator('#audience-snapshot-title')).toContainText('AEST');await expect(page.locator('#audience-snapshot-title')).toContainText('Australia/Brisbane');}
      await expect(page.getByLabel('Saved audience rule',{exact:true})).toHaveText(detail.revision.audienceRule);
      if(id==='partial') await expect(page.getByText('Skipped — send window closed',{exact:true})).toBeVisible();
      if(id==='cancelled') await expect(page.getByText('Waiting for confirmation',{exact:true})).toBeVisible();
      if(id==='failed') await expect(page.locator('.step-results')).toContainText('The email adapter is unavailable.');
      if(id==='dst') {await expect(page.locator('.step-results')).toContainText('10:00 am AEST');await expect(page.locator('.step-results')).toContainText('Australia/Brisbane');}
      await accessible(page,width);
    }
    expect(await seed(request,'counts')).toEqual(raw);
    await openPage(page,`${runtime.url}/app/campaigns/unapproved/scheduled`);
    await expect(page.getByText('This revision has not been approved. Its draft steps are not scheduled to send.')).toBeVisible();
    await expect(page.locator('.step-results')).toHaveCount(0);await expect(page.getByRole('link',{name:'Review and approve this draft'})).toHaveAttribute('href','/app/campaigns/unapproved/review');
    const draft=await (await page.request.get(`${runtime.url}/api/campaigns/unapproved`)).json();expect(draft.results).toBeUndefined();
    await expect(page.getByLabel('Saved audience rule',{exact:true})).toHaveText(draft.revision.audienceRule);await accessible(page,width);
    for(const id of ['mixed','cancelled','failed']) for(const suffix of ['', '/review']) {await openPage(page,`${runtime.url}/app/campaigns/${id}${suffix}`);await expect(page.getByRole('link',{name:'View schedule and results'})).toHaveAttribute('href',`/app/campaigns/${id}/scheduled`);}
    await exerciseCampaignReports(page,request,runtime,width,test.info());
    await exerciseRetention(page,request,runtime,width,test.info());
  });
  contract('RESULT-001',`every combined campaign state/channel filter, counts, history and empty state at ${width}`,async({page,request})=>{
    await seed(request,'filters');await login(page,request);await page.setViewportSize({width,height:900});
    for(const state of ['',...states]) for(const channel of ['','email','sms']) {
      const query=new URLSearchParams();if(state)query.set('state',state);if(channel)query.set('channel',channel);
      const expected=states.filter(value=>!state||state===value).flatMap(value=>[['email'],['sms'],['email','sms']].filter(channels=>!channel||channels.includes(channel)).map(channels=>`${value}-${channels.join('-')}`)).sort();
      const response=await page.request.get(`${runtime.url}/api/campaigns?${query}`);expect(response.ok()).toBe(true);const data=await response.json();
      expect(data.campaigns.map((campaign:any)=>campaign.id).sort()).toEqual(expected);expect(data.total).toBe(21);
      for(const value of states)expect(data.counts.states[value]).toBe(channel?2:3);
      expect(data.counts.channels.email).toBe(state?2:14);expect(data.counts.channels.sms).toBe(state?2:14);
      await openPage(page,`${runtime.url}/app/campaigns?${query}`);
      await expect(page.locator('.campaign-row')).toHaveCount(expected.length);
      expect(await page.locator('.campaign-row').evaluateAll((links:HTMLAnchorElement[])=>links.map(link=>decodeURIComponent(new URL(link.href).pathname.split('/')[3])).sort())).toEqual(expected);
      await expect(page.getByLabel('State',{exact:true})).toHaveValue(state);await expect(page.getByLabel('Channel',{exact:true})).toHaveValue(channel);
      for(const value of states)await expect(page.getByLabel('State',{exact:true}).locator(`option[value="${value}"]`)).toContainText(`(${data.counts.states[value]})`);
      for(const value of ['email','sms'])await expect(page.getByLabel('Channel',{exact:true}).locator(`option[value="${value}"]`)).toContainText(`(${data.counts.channels[value]})`);
      for(const row of await page.locator('.campaign-row').all()) {await expect(row).toHaveAttribute('href', /^\/app\/campaigns\/[^/]+(?:\/review)?$/);await expect(row.locator('strong')).toHaveText(/^Campaign /);await expect(row.locator('small')).toContainText('Australia/Brisbane');await expect(row.locator('small')).toContainText('AEST');await expect(row.locator('.campaign-row__audience')).not.toBeEmpty();}
      await accessible(page,width);
    }
    await openPage(page,`${runtime.url}/app/campaigns`);await page.getByLabel('State',{exact:true}).selectOption('scheduled');await page.getByLabel('Channel',{exact:true}).selectOption('email');
    await expect(page).toHaveURL(/state=scheduled.*channel=email/);await reloadPage(page);await expect(page.getByLabel('Channel',{exact:true})).toHaveValue('email');
    await page.screenshot({path:test.info().outputPath(`campaign-filters-${width}.png`),fullPage:true});
    await page.goBack();await expect(page.getByLabel('State',{exact:true})).toHaveValue('scheduled');await expect(page.getByLabel('Channel',{exact:true})).toHaveValue('');
    await seed(request,'single');await openPage(page,`${runtime.url}/app/campaigns?state=completed`);await expect(page.getByText('No campaigns match these filters',{exact:true})).toBeVisible();await page.getByRole('link',{name:'Clear filters'}).click();await expect(page.locator('.campaign-row')).toHaveCount(1);
    await seed(request,'empty');await reloadPage(page);await expect(page.getByText('No campaigns yet. Start with New campaign.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'New campaign',exact:true})).toBeVisible();await expect(page.getByRole('link',{name:'Clear filters'})).toHaveCount(0);await accessible(page,width);
  });
}
contract('RESULT-001','disabled SMS is excluded from filter choices and rejected by the API',async({page,request})=>{
  await seed(request,'filters');await login(page,request);
  await page.context().setExtraHTTPHeaders({'X-Test-Token':runtime.token,'X-Test-Sms-Disabled':'true'});
  await openPage(page,`${runtime.url}/app/campaigns`);await expect(page.getByLabel('Channel',{exact:true}).locator('option[value="sms"]')).toHaveCount(0);
  for(const width of [1440,390]) {await page.setViewportSize({width,height:900});await page.screenshot({path:test.info().outputPath(`sms-disabled-${width}.png`),fullPage:true});}
  expect((await page.request.get(`${runtime.url}/api/campaigns?channel=sms&smsDisabled`)).status()).toBe(400);
  expect((await page.request.get(`${runtime.url}/api/campaigns?state=made-up`)).status()).toBe(400);
});
contract('CAMP-009','cancel dialog contains focus, Escape cancels and returns focus; confirmed cancel retains uncertain handoffs',async({page,request})=>{
  await seed(request,'outcomes');await login(page,request);await openPage(page,`${runtime.url}/app/campaigns/sending/scheduled`);
  const trigger=page.getByRole('button',{name:'Cancel campaign',exact:true});await trigger.focus();await page.keyboard.press('Enter');const dialog=page.getByRole('alertdialog');await expect(dialog).toBeVisible();
  for(const width of [1440,390]) {await page.setViewportSize({width,height:900});await page.screenshot({path:test.info().outputPath(`cancel-dialog-${width}.png`),fullPage:true});}
  for(let i=0;i<5;i++){await page.keyboard.press('Tab');expect(await dialog.evaluate(element=>element.contains(document.activeElement))).toBe(true);}
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused();
  await trigger.click();await page.getByRole('button',{name:'Confirm cancellation',exact:true}).click();await expect(page.locator('.action-notice[role="status"]')).toContainText('Campaign cancelled');await expect(trigger).toHaveCount(0);
  const detail=await (await page.request.get(`${runtime.url}/api/campaigns/sending`)).json();expect(detail.campaign.state).toBe('cancelled');expect(detail.results.steps[0].counts).toContainEqual({disposition:'skipped',reason:'campaign-cancelled',count:1});expect(detail.results.steps[0].counts).toContainEqual({disposition:'accepted',reason:null,count:1});expect(detail.results.steps[0].counts).toContainEqual({disposition:'handoff-unknown',reason:null,count:1});
});
contract('RESULT-001','[CAMP-002] successful queued sync and failed refresh use distinct consistent feedback',async({page,request})=>{
  await seed(request,'presentation');await login(page,request);await page.setViewportSize({width:1440,height:900});await openPage(page,`${runtime.url}/app/store`);
  const sync=page.waitForResponse(response=>response.url().endsWith('/api/store/sync')&&response.request().method()==='POST');
  await page.getByRole('article',{name:'Customer sync'}).getByRole('button',{name:'Sync now',exact:true}).click();expect((await sync).status()).toBe(202);
  const success=page.locator('.action-notice[role="status"]');await expect(success).toBeVisible();await expect(success).not.toBeEmpty();
  const successFeedback=await success.textContent();
  const jobs=await seed(request,'jobs');expect(jobs.map((job:any)=>JSON.parse(job.payload))).toContainEqual(expect.objectContaining({kind:'source.sync'}));
  const successColor=await success.evaluate(element=>getComputedStyle(element).color);
  expect(await textContrast(success)).toBeGreaterThanOrEqual(4.5);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:900});await accessible(page,width);
    await expect(page.locator('.source-status__grid .status-pill').first()).toBeVisible();
    await page.screenshot({path:test.info().outputPath(`store-success-${width}.png`),fullPage:true});
  }
  const sourceStatus=await page.locator('.source-status__grid').textContent();
  await page.route('**/api/store',route=>route.abort('failed'));
  const failedStore=page.waitForEvent('requestfailed',{predicate:request=>new URL(request.url()).pathname==='/api/store'});
  await page.getByRole('button',{name:'Refresh sync status'}).click();expect((await failedStore).failure()?.errorText).toBeTruthy();
  const error=page.locator('.inline-error[role="alert"]');
  await expect(error).toBeVisible();await expect(error).not.toBeEmpty();
  expect(await error.textContent()).not.toBe(successFeedback);
  await expect(page.locator('.source-status__grid')).toHaveText(sourceStatus!);
  expect(await error.evaluate(element=>getComputedStyle(element).color)).not.toBe(successColor);
  expect(await textContrast(error)).toBeGreaterThanOrEqual(4.5);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:900});await accessible(page,width);
    await page.screenshot({path:test.info().outputPath(`store-error-${width}.png`),fullPage:true});
  }
  await page.unroute('**/api/store');
  const restoredStore=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/store');
  await page.getByRole('button',{name:'Refresh sync status'}).click();expect((await restoredStore).ok()).toBe(true);
  await expect(error).toHaveCount(0);await expect(page.locator('.source-status__grid')).toHaveText(sourceStatus!);
  expect(await seed(request,'jobs')).toEqual(jobs);
  await seed(request,'outcomes');await openPage(page,`${runtime.url}/app/campaigns/scheduled/scheduled`);
  await expect(page.locator('.step-results > li')).toHaveCount(3);
  const savedCounts=await seed(request,'counts');
  const resultCounts=await page.locator('.step-results .disposition-counts').allTextContents();
  await page.route('**/api/campaigns/scheduled',route=>route.abort('failed'));
  const failedResults=page.waitForEvent('requestfailed',{predicate:request=>new URL(request.url()).pathname==='/api/campaigns/scheduled'});
  await page.clock.runFor(20_001);expect((await failedResults).failure()?.errorText).toBeTruthy();
  const resultsError=page.locator('.inline-error[role="alert"]');await expect(resultsError).toBeVisible();await expect(resultsError).not.toBeEmpty();
  await expect(page.locator('.step-results > li')).toHaveCount(3);await expect(page.locator('.step-results .disposition-counts')).toHaveText(resultCounts);
  expect(await seed(request,'counts')).toEqual(savedCounts);
  await page.unroute('**/api/campaigns/scheduled');
  const restoredResults=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/campaigns/scheduled');
  await page.clock.runFor(20_001);expect((await restoredResults).ok()).toBe(true);await expect(resultsError).toHaveCount(0);
  await expect(page.locator('.step-results .disposition-counts')).toHaveText(resultCounts);expect(await seed(request,'counts')).toEqual(savedCounts);
  const collectionResponse=await page.request.get(`${runtime.url}/api/campaigns`);expect(collectionResponse.ok()).toBe(true);const collection=await collectionResponse.json();
  await page.route('**/api/campaigns/scheduled',route=>route.abort('failed'));await openPage(page,`${runtime.url}/app/campaigns`);
  await expect(page.locator('.campaign-row strong')).toHaveText(collection.campaigns.map((campaign:any)=>campaign.name ?? 'Untitled campaign'));await expect(page.getByRole('alert')).toHaveCount(0);await page.unroute('**/api/campaigns/scheduled');
  await page.context().setExtraHTTPHeaders({'X-Test-Token':runtime.token,'X-Test-Unavailable-Resource':'/api/operators'});
  await openPage(page,`${runtime.url}/app/settings`);
  expect((await page.request.get(`${runtime.url}/api/operators`)).status()).toBe(503);
  const operatorsError=page.locator('.settings-operators .inline-error[role="alert"]');await expect(operatorsError).toBeVisible();await expect(operatorsError).not.toBeEmpty();
  await expect(page.getByRole('button',{name:'Add operator',exact:true})).toBeDisabled();
  for(const width of [1440,390]) {await page.setViewportSize({width,height:900});await page.screenshot({path:test.info().outputPath(`operators-unavailable-${width}.png`),fullPage:true});}
  await page.context().setExtraHTTPHeaders({});
  const restoredOperators=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/operators');
  await page.getByRole('button',{name:'Refresh operators',exact:true}).click();const operatorsResponse=await restoredOperators;expect(operatorsResponse.ok()).toBe(true);
  const {operators}=await operatorsResponse.json();await expect(operatorsError).toHaveCount(0);
  await expect(page.locator('.settings-operator-list > li')).toHaveCount(operators.length);
  for(const operator of operators)await expect(page.locator('.settings-operator-list')).toContainText(operator.email);
  await expect(page.getByRole('button',{name:'Add operator',exact:true})).toBeEnabled();await accessible(page,390);
});

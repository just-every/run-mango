import {trackingJourney} from './tracking-journey';
import { invitationRuntime, confirmedOwner, confirmedInvite } from '../../operations/fixtures/invitation-runtime.mjs';
import {test,contract,runtime} from './runtime-fixture';
import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {localSessionCookieName} from '../support/local-session';
import {openPage} from '../support/navigation';
import {csvRows,parseCsv} from '../../src/core/features/audience/csv';
for(const width of [1440,390])contract('REPORT-002',`[RESULT-005] campaign filters, exact CSV rows and optional open estimates at ${width}`,async({page,request})=>{
  test.setTimeout(600000);
  const seed=await request.post(`${runtime.url}/_results/reporting`,{headers:{'X-Test-Token':runtime.token}});expect(seed.ok()).toBe(true);const fixture=await seed.json();
  const login=await request.post(`${runtime.url}/_results/open`,{headers:{'X-Test-Token':runtime.token}});const {token}=await login.json();await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:token,domain:'127.0.0.1',path:'/'}]);await page.setViewportSize({width,height:1000});
  for(const [index,scanner] of [false,false,true].entries()) {
    const response=await page.request.get(`${runtime.url}/l/${encodeURIComponent(index===1?fixture.links[0].chris:fixture.links[0].ada)}`,{maxRedirects:0,headers:{'User-Agent':scanner?'Barracuda LinkProtect':'Mozilla/5.0 Studio reader','CF-Ray':`performance-${index}`}});expect(response.status()).toBe(302);
  }
  const purchases=await request.post(`${runtime.url}/_results/performance-orders`,{headers:{'X-Test-Token':runtime.token}});expect(purchases.ok()).toBe(true);
  const api='/api/insights/campaign-performance?channel=email&topic=newsletter&sort=totalClicks&direction=desc';
  const report=await (await page.request.get(runtime.url+api)).json();expect(report.rows).toHaveLength(1);expect(report.rows[0]).toMatchObject({recipients:5,delivered:3,totalClicks:2,uniqueClicks:2,clickRate:0.4,unsubscribes:1,complaints:1,conversions:3,revenueByCurrency:[{currency:'JPY',conversions:1,netAmountMinor:'1000'},{currency:'USD',conversions:2,netAmountMinor:'8000'}]});expect(report.rows[0]).not.toHaveProperty('openRateEstimate');
  await openPage(page,`${runtime.url}/app/insights`);await page.getByLabel('Performance channel',{exact:true}).selectOption('email');await page.getByLabel('Performance topic',{exact:true}).selectOption('newsletter');
  const table=page.getByRole('table',{name:'Campaign performance',exact:true});await expect(table.locator('tbody tr')).toHaveCount(1);
  const row=table.locator('tbody tr').first();await expect(row.locator('[data-label="Recipients"]')).toHaveText('5');await expect(row.locator('[data-label="Delivered"]')).toHaveText('3');await expect(row.locator('[data-label="Human clicks"]')).toHaveText('2');await expect(row.locator('[data-label="Unique clicks"]')).toHaveText('2');await expect(row.locator('[data-label="Click rate"]')).toHaveText('40.00%');
  await expect(row.locator('[data-label="Net revenue"]')).toHaveText('JPY 1000; USD 80.00');
  await expect(row.locator('[data-label="Revenue / recipient"]')).toHaveText('JPY 200.0000; USD 16.0000');
  const compareCsv=async()=>{
    const href=await page.getByRole('link',{name:'Export campaign performance CSV'}).getAttribute('href');const csv=await page.request.get(runtime.url+href);expect(csv.ok()).toBe(true);const rows=parseCsv(await csv.text());expect(rows).toHaveLength(await table.locator('tbody tr').count());
    for(const [index,csvRow]of rows.entries()) {
      const ui=table.locator('tbody tr').nth(index);for(const [heading,label]of [['recipient-steps','Recipients'],['delivered','Delivered'],['human clicks','Human clicks'],['unique clicked recipient-steps','Unique clicks'],['unsubscribes','Unsubscribes'],['complaints','Complaints'],['attributed conversions','Conversions']])expect(csvRow[heading]).toBe(await ui.locator(`[data-label="${label}"]`).innerText());
    }return rows;
  };
  expect(Object.keys((await compareCsv())[0]).some(key=>key.includes('open-rate estimate'))).toBe(false);
  await page.getByLabel('Performance channel',{exact:true}).selectOption('');await expect(table.locator('tbody tr')).toHaveCount(2);await page.getByLabel('Sort campaign performance',{exact:true}).selectOption('totalClicks');await page.getByLabel('Sort direction',{exact:true}).selectOption('asc');await expect(table.locator('tbody tr').first().locator('[data-label="Channel"]')).toHaveText('sms');await compareCsv();await page.getByLabel('Performance channel',{exact:true}).selectOption('email');await expect(table.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button',{name:'View links · revision 1',exact:true}).click();await expect(page.getByRole('table',{name:'Clicks by link'})).toContainText('New work');
  await page.getByLabel('Enable privacy-sensitive open estimates',{exact:true}).check();await expect(table.getByRole('columnheader',{name:'Open-rate estimate',exact:true})).toHaveCount(1);expect(Object.keys((await compareCsv())[0]).some(key=>key.includes('open-rate estimate'))).toBe(true);
  await row.locator('[data-label="Net revenue"]').scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`performance-money-${width}.png`)});
  await page.locator('#campaign-performance-title').scrollIntoViewIfNeeded();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);await page.screenshot({path:test.info().outputPath(`performance-${width}.png`),fullPage:true});
  await page.getByLabel('Enable privacy-sensitive open estimates',{exact:true}).uncheck();await expect(table.getByRole('columnheader',{name:'Open-rate estimate',exact:true})).toHaveCount(0);await compareCsv();
  await page.getByLabel('Scheduled from (UTC)',{exact:true}).fill('2099-01-01');await expect(page.getByText('No campaign steps match these filters.',{exact:true})).toBeVisible();const empty=await page.request.get(runtime.url+(await page.getByRole('link',{name:'Export campaign performance CSV'}).getAttribute('href')));expect(csvRows(await empty.text())).toHaveLength(1);
  expect((await page.request.get(`${runtime.url}/api/insights/campaign-performance?from=2026-02-30`)).status()).toBe(400);
  await trackingJourney(page, test.info(), width);
});

test('campaign revisions export safely with Owner/Admin authority and visible limits',async({page,request})=>{
  test.setTimeout(180000);
  const control=(action:string)=>request.post(runtime.url+'/_results/'+action,{headers:{'X-Test-Token':runtime.token}});
  expect((await control('empty')).ok()).toBe(true);
  const {token}=await(await control('open')).json();
  await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:token,domain:'127.0.0.1',path:'/'}]);
  const download=()=>page.request.get(runtime.url+'/api/campaigns/export');
  const empty=await download();expect(empty.status()).toBe(200);
  expect(csvRows(await empty.text())).toEqual([['campaign_id','name','revision','state','subject','updated']]);
  const created=await page.request.post(runtime.url+'/api/campaigns',{data:{mode:'blank'}});
  expect(created.status()).toBe(201);const draft=await created.json();
  const name='=SUM(1,2), "Autumn"',subject='@Autumn, "news"';
  const save=await page.request.patch(runtime.url+'/api/campaign-revisions/'+draft.revisionId,{data:{name,emailSubject:subject}});
  expect(save.status()).toBe(200);
  expect(parseCsv(await(await download()).text())).toEqual([expect.objectContaining({campaign_id:draft.campaignId,name:"'"+name,revision:'1',state:'draft',subject:"'"+subject})]);
  // A prior approved/scheduled revision is fixture state; the replacement is
  // created and saved through the public authoring doors.
  await runtime.sql(`UPDATE campaigns SET state='scheduled' WHERE id='${draft.campaignId}'; UPDATE campaign_revisions SET state='approved' WHERE id='${draft.revisionId}'`);
  const replacement=await page.request.post(runtime.url+'/api/campaigns/'+draft.campaignId+'/edit-schedule',{data:{}});
  expect(replacement.status()).toBe(201);const second=await replacement.json();expect(second.campaignId).toBe(draft.campaignId);
  const saved=await page.request.patch(runtime.url+'/api/campaign-revisions/'+second.revisionId,{data:{name,emailSubject:subject+' 2'}});
  expect(saved.status()).toBe(200);
  // Partial saves keep the campaign name in Activity and never include body text.
  expect((await page.request.patch(runtime.url+'/api/campaign-revisions/'+second.revisionId,{data:{emailText:'private body marker'}})).status()).toBe(200);
  const csv=await download();expect(csv.headers()['content-type']).toContain('text/csv');
  const rows=parseCsv(await csv.text()).sort((a,b)=>Number(a.revision)-Number(b.revision));
  expect(rows).toHaveLength(2);
  expect(rows.map(row=>[row.campaign_id,row.name,row.revision,row.state,row.subject])).toEqual([
    [draft.campaignId,"'"+name,'1','approved',"'"+subject],
    [draft.campaignId,"'"+name,'2','draft',"'"+subject+' 2'],
  ]);
  expect(rows.every(row=>Number.isFinite(Date.parse(row.updated)))).toBe(true);
  const activity=await page.request.get(runtime.url+'/api/activity?action=draft.saved');
  expect(activity.status()).toBe(200);const log=await activity.json();
  expect(log.entries.filter((entry:any)=>entry.objectId===second.revisionId).map((entry:any)=>entry.detail))
    .toEqual([{campaignId:draft.campaignId,name},{campaignId:draft.campaignId,name}]);
  expect(JSON.stringify(log)).not.toContain('private body marker');
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});await openPage(page,runtime.url+'/app/campaigns');
    await expect(page.getByRole('button',{name:'Export campaigns CSV'})).toBeVisible();
    const [file]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export campaigns CSV'}).click()]);
    expect(file.suggestedFilename()).toBe('campaigns.csv');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.screenshot({path:test.info().outputPath('campaign-export-'+width+'.png'),fullPage:true});
    await openPage(page,runtime.url+'/app/settings/activity');
    await expect(page.getByRole('heading',{name:'Activity',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.screenshot({path:test.info().outputPath('draft-activity-'+width+'.png'),fullPage:true});
  }
  const authority=await invitationRuntime();
  try {
    const owner=await confirmedOwner(authority), colleague=await confirmedInvite(authority,owner,'exporter@example.test');
    expect((await authority.call('/api/campaigns/export')).status).toBe(401);
    expect((await authority.call('/api/campaigns/export',{cookie:owner})).status).toBe(200);
    for(const role of ['admin','manager','author','analyst','support']) {
      expect((await authority.call('/api/operators/'+colleague.operator.id+'/role',{cookie:owner,method:'PUT',body:{role}})).status).toBe(200);
      expect((await authority.call('/api/campaigns/export',{cookie:colleague.cookie})).status).toBe(role==='admin'?200:403);
    }
  } finally {await authority.close();}
  for(const prefix of ['=','+','-','@','\t','\r']) {
    const cell=prefix+'Comma, "quote"\r\nNext line';
    expect((await page.request.patch(runtime.url+'/api/campaign-revisions/'+second.revisionId,{data:{name:cell,emailSubject:cell}})).status()).toBe(200);
    const record=parseCsv(await(await download()).text()).find(row=>row.revision==='2');
    expect(record).toMatchObject({name:"'"+cell,subject:"'"+cell});
  }
  const exportsBefore=await(await page.request.get(runtime.url+'/api/activity?action=campaigns.exported')).json();
  expect(exportsBefore.entries[0]).toMatchObject({actorType:'operator',detail:{revisions:2}});
  // Boundary data uses a compact SQL fixture, not 50,001 authoring requests.
  const columns=(await runtime.sql('PRAGMA table_info(campaign_revisions)')).map((row:any)=>row.name);
  const projections=columns.map((column:string)=>column==='id'?"'export-limit-'||n":column==='version'?'n+10':'r.'+column).join(',');
  await runtime.sql(`INSERT INTO campaign_revisions (${columns.join(',')}) WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM numbers WHERE n<50001) SELECT ${projections} FROM numbers,campaign_revisions r WHERE r.id='${second.revisionId}'`);
  expect((await download()).status()).toBe(422);
  await openPage(page,runtime.url+'/app/campaigns');
  await page.getByRole('button',{name:'Export campaigns CSV'}).click();
  await expect(page.getByRole('alert')).toContainText('No file was downloaded');
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await page.screenshot({path:test.info().outputPath('campaign-export-refusal-'+width+'.png'),fullPage:true});
  }
  // A Unicode export below the row ceiling still refuses the independent byte ceiling.
  await runtime.sql(`DELETE FROM campaign_revisions WHERE version>12010; UPDATE campaign_revisions SET name='${'界'.repeat(160)}',email_subject='${'界'.repeat(250)}' WHERE version>10`);
  expect((await download()).status()).toBe(422);
  const exportsAfter=await(await page.request.get(runtime.url+'/api/activity?action=campaigns.exported')).json();
  expect(exportsAfter.entries).toEqual(exportsBefore.entries);
});

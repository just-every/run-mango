import { expect, type Page, type APIRequestContext, type TestInfo } from '@playwright/test';
import { parseCsv } from '../../src/core/features/audience/csv';
import { openPage, reloadPage } from '../support/navigation';

export async function exerciseCampaignReports(page:Page,request:APIRequestContext,runtime:{url:string;token:string},width:number,info:TestInfo) {
  const seeded=await request.post(`${runtime.url}/_results/reporting`,{headers:{'X-Test-Token':runtime.token}});expect(seeded.status()).toBe(200);const fixture=await seeded.json();
  const click=async(token:string,ray:string,scanner=false)=>{const response=await page.request.get(`${runtime.url}/l/${encodeURIComponent(token)}`,{maxRedirects:0,headers:{'User-Agent':scanner?'Barracuda LinkProtect':'Mozilla/5.0 Orchard reader','CF-Ray':ray}});expect(response.status()).toBe(302);};
  const base=`${runtime.url}/api/campaigns/${fixture.campaignId}`,query=`revisionId=${fixture.revisionId}`;
  const readReport=async(campaignId=fixture.campaignId,revisionId=fixture.revisionId)=>{
    const response=await page.request.get(`${runtime.url}/api/campaigns/${campaignId}/engagement?revisionId=${revisionId}`);
    expect(response.status()).toBe(200);return response.json();
  };
  expect(await readReport()).toMatchObject({totalClicks:0,uniqueClicks:0,automatedRequests:0});
  // Independent controls share a destination, but neither belongs to this revision.
  for(const[index,control]of fixture.controls.entries()) {
    for(let repeat=0;repeat<index+2;repeat++)await click(control.token,`control-${index}-${repeat}`);
    expect(await readReport(control.campaignId,control.revisionId)).toMatchObject({totalClicks:index+2,uniqueClicks:1,automatedRequests:0});
  }
  expect(await readReport()).toMatchObject({totalClicks:0,uniqueClicks:0,automatedRequests:0});
  expect((await page.request.get(`${base}/engagement?revisionId=${fixture.controls[1].revisionId}`)).status()).toBe(404);
  await click(fixture.links[0].ada,'first-human');await click(fixture.links[0].ada,'second-human');await click(fixture.links[0].chris,'other-human');await click(fixture.links[1].ada,'notes-human');
  for(const[index,link]of fixture.links.slice(0,2).entries())for(let repeat=0;repeat<2;repeat++)await click(link.adaLater,`later-step-${index}-${repeat}`);
  for(const[index,link]of fixture.links.entries())await click(link.scanner,`scanner-${index}`,true);
  const report=await readReport();
  expect(report).toMatchObject({campaignId:fixture.campaignId,revisionId:fixture.revisionId,totalClicks:8,uniqueClicks:2,automatedRequests:3});
  expect(report.links.map((row:any)=>[row.destinationUrl,row.totalClicks,row.uniqueClicks,row.automatedRequests])).toEqual([
    [fixture.links[0].destinationUrl,5,2,1],[fixture.links[1].destinationUrl,3,1,1],[fixture.links[2].destinationUrl,0,0,1],
  ]);
  // Performance intentionally counts clicked recipient steps: Ada has two of them.
  const performance=await(await page.request.get(`${runtime.url}/api/insights/campaign-performance`)).json();
  expect(performance.rows.find((row:any)=>row.revisionId===fixture.revisionId&&row.channel==='email')).toMatchObject({totalClicks:8,uniqueClicks:3});
  const linkCsv=parseCsv(await(await page.request.get(`${base}/engagement?${query}&format=csv`)).text());
  expect(linkCsv.map(row=>[row.clicks,row['unique clickers'],row['automated requests']])).toEqual([['5','2','1'],['3','1','1'],['0','0','1']]);
  const clickers=await(await page.request.get(`${base}/clickers?${query}&destinationUrl=${encodeURIComponent(fixture.links[0].destinationUrl)}`)).json();
  expect(clickers.rows.map((row:any)=>row.contactId)).toEqual(['ada','chris']);expect(clickers.rows[0].clicks).toBe(4);
  const clickCsv=parseCsv(await(await page.request.get(`${base}/clickers?${query}&destinationUrl=${encodeURIComponent(fixture.links[0].destinationUrl)}&format=csv`)).text());
  expect(clickCsv.map(row=>row['contact id'])).toEqual(clickers.rows.map((row:any)=>row.contactId));
  await openPage(page,`${runtime.url}/app/campaigns/${fixture.campaignId}/scheduled`);await expect(page.getByRole('heading',{name:'October studio letter',exact:true})).toBeVisible();
  const links=page.getByRole('table',{name:'Clicks by link'});
  const assertDisplayed=async()=>{
    const totals=page.getByLabel('Saved revision link totals',{exact:true});
    await expect(totals.locator('dt')).toHaveText(['Human clicks','Unique people','Automated requests']);
    await expect(totals.locator('dd')).toHaveText(['8','2','3']);
    await expect(links.locator('tbody tr')).toHaveCount(3);
    await expect(links.locator('[data-label="Clicks"]')).toHaveText(['5','3','0']);
    await expect(links.locator('[data-label="People"]')).toHaveText(['2','1','0']);
    await expect(links.locator('[data-label="Automated"]')).toHaveText(['1','1','1']);
  };
  await assertDisplayed();
  await reloadPage(page);await assertDisplayed();
  expect(await readReport()).toEqual(report);
  await page.getByRole('button',{name:'View clickers: New work',exact:true}).click();await expect(page.getByRole('region',{name:'Link clickers'})).toContainText('Ada Collins');
  await page.getByRole('button',{name:'Save clickers as segment',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Saved clicker segment.'})).toBeVisible();
  const segments=await(await page.request.get(`${runtime.url}/api/audience/segments`)).json();
  const saved=segments.segments.find((row:any)=>row.name.startsWith('Clickers:'));
  expect(JSON.parse(saved.inclusionRuleJson).predicates[0].value).toEqual(['ada','chris']);
  const audience=await page.request.post(`${runtime.url}/api/campaign-authoring/audience`,{headers:{Origin:runtime.url},data:{inclusionRuleJson:saved.inclusionRuleJson,exclusionRulesJson:saved.exclusionRulesJson,channels:['email']}});
  expect(audience.status()).toBe(200);expect(await audience.json()).toMatchObject({status:'ok',candidateCount:2});
  const summary=await(await page.request.get(`${base}`)).json();
  for(const outcome of['delivered','bounced','complained','unsubscribed','skipped','failed']) {
    const response=await page.request.get(`${base}/recipients?${query}&outcome=${outcome}`);expect(response.status()).toBe(200);const recipients=await response.json();
    const csvResponse=await page.request.get(`${base}/recipients?${query}&outcome=${outcome}&format=csv`);expect(csvResponse.status()).toBe(200);
    if(recipients.total)expect(parseCsv(await csvResponse.text()).map(row=>row['recipient-step id'])).toEqual(recipients.rows.map((row:any)=>row.recipientStepId));
    if(['delivered','bounced','skipped','failed'].includes(outcome))expect(recipients.total).toBe(summary.results.steps.flatMap((step:any)=>step.counts).filter((row:any)=>row.disposition===outcome).reduce((sum:number,row:any)=>sum+row.count,0));
    await page.getByLabel('Recipient outcome',{exact:true}).selectOption(outcome);await expect(page.getByRole('table',{name:'Recipient outcomes'}).locator('tbody tr')).toHaveCount(recipients.total);
    if(outcome==='bounced'){expect(recipients.rows[0].contactId).toBe('ben');await expect(page.getByRole('table',{name:'Recipient outcomes'})).toContainText('550 mailbox does not exist');await expect(page.getByRole('table',{name:'Recipient outcomes'})).toContainText('hard');}
    if(outcome==='complained')expect(recipients.rows[0].contactId).toBe('chris');
    if(outcome==='unsubscribed'){expect(recipients.rows[0].contactId).toBe('drew');expect(recipients.rows[0].unsubscribeMethod).toBeNull();await expect(page.getByRole('table',{name:'Recipient outcomes'})).toContainText('Method not recorded');}
    if(outcome==='skipped')expect(recipients.rows[0].reason).toBe('quiet-hours-deadline');
  }
  await page.getByLabel('Recipient outcome',{exact:true}).selectOption('delivered');await expect(page.getByRole('table',{name:'Recipient outcomes'})).toContainText('Erased contact');
  await page.getByRole('button',{name:'Save recipients as segment',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Recipient segment saved.'})).toBeVisible();
  const savedOutcomes=await(await page.request.get(`${runtime.url}/api/audience/segments`)).json();
  expect(JSON.parse(savedOutcomes.segments.find((row:any)=>row.name.startsWith('delivered recipients:')).inclusionRuleJson).predicates[0].value.sort()).toEqual(['ada','chris']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const map=page.frameLocator('iframe[title="Campaign click map"]');
  await expect(map.locator('body')).toContainText('[5 clicks · 2 people]');
  await expect(map.locator('a[href]')).toHaveCount(0);
  await page.locator('iframe[title="Campaign click map"]').scrollIntoViewIfNeeded();
  await map.locator('mark').first().scrollIntoViewIfNeeded();
  await map.locator('body').screenshot({path:info.outputPath(`click-map-content-${width}.png`)});
  await page.screenshot({path:info.outputPath(`click-map-${width}.png`)});
  await page.locator('#recipient-report-title').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`recipients-${width}.png`)});
  const engagement=page.getByRole('region',{name:'Link engagement',exact:true});
  for(const captureWidth of[1440,390]) {
    await page.setViewportSize({width:captureWidth,height:1000});
    await engagement.getByRole('heading',{name:'Link engagement',exact:true}).evaluate(element=>element.scrollIntoView({block:'start'}));
    await page.evaluate(()=>window.scrollBy(0,-120));
    await page.screenshot({path:info.outputPath(`links-${captureWidth}.png`)});
  }
  await page.setViewportSize({width,height:1000});
}

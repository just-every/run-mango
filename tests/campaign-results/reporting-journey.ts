import { expect, type Page, type APIRequestContext, type TestInfo } from '@playwright/test';
import { parseCsv } from '../../src/core/features/audience/csv';
import { openPage } from '../support/navigation';

export async function exerciseCampaignReports(page:Page,request:APIRequestContext,runtime:{url:string;token:string},width:number,info:TestInfo) {
  const seeded=await request.post(`${runtime.url}/_results/reporting`,{headers:{'X-Test-Token':runtime.token}});expect(seeded.status()).toBe(200);const fixture=await seeded.json();
  const click=async(token:string,ray:string,scanner=false)=>{const response=await page.request.get(`${runtime.url}/l/${encodeURIComponent(token)}`,{maxRedirects:0,headers:{'User-Agent':scanner?'Barracuda LinkProtect':'Mozilla/5.0 Orchard reader','CF-Ray':ray}});expect(response.status()).toBe(302);};
  await click(fixture.links[0].ada,'first-human');await click(fixture.links[0].ada,'second-human');await click(fixture.links[0].chris,'other-human');await click(fixture.links[1].ada,'notes-human');
  for(const[index,link]of fixture.links.entries())await click(link.ada,`scanner-${index}`,true);
  const base=`${runtime.url}/api/campaigns/${fixture.campaignId}`,query=`revisionId=${fixture.revisionId}`;
  const report=await(await page.request.get(`${base}/engagement?${query}`)).json();
  expect(report.links.map((row:any)=>[row.totalClicks,row.uniqueClicks,row.automatedRequests])).toEqual([[3,2,1],[1,1,1],[0,0,1]]);
  const clickers=await(await page.request.get(`${base}/clickers?${query}&destinationUrl=${encodeURIComponent(fixture.links[0].destinationUrl)}`)).json();
  expect(clickers.rows.map((row:any)=>row.contactId)).toEqual(['ada','chris']);expect(clickers.rows[0].clicks).toBe(2);
  const clickCsv=parseCsv(await(await page.request.get(`${base}/clickers?${query}&destinationUrl=${encodeURIComponent(fixture.links[0].destinationUrl)}&format=csv`)).text());
  expect(clickCsv.map(row=>row['contact id'])).toEqual(clickers.rows.map((row:any)=>row.contactId));
  await openPage(page,`${runtime.url}/app/campaigns/${fixture.campaignId}/scheduled`);await expect(page.getByRole('heading',{name:'October studio letter',exact:true})).toBeVisible();
  const links=page.getByRole('table',{name:'Clicks by link'});await expect(links.locator('tbody tr')).toHaveCount(3);
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
    if(outcome==='unsubscribed')expect(recipients.rows[0].contactId).toBe('drew');
    if(outcome==='skipped')expect(recipients.rows[0].reason).toBe('quiet-hours-deadline');
  }
  await page.getByLabel('Recipient outcome',{exact:true}).selectOption('delivered');await expect(page.getByRole('table',{name:'Recipient outcomes'})).toContainText('Erased contact');
  await page.getByRole('button',{name:'Save recipients as segment',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Recipient segment saved.'})).toBeVisible();
  const savedOutcomes=await(await page.request.get(`${runtime.url}/api/audience/segments`)).json();
  expect(JSON.parse(savedOutcomes.segments.find((row:any)=>row.name.startsWith('delivered recipients:')).inclusionRuleJson).predicates[0].value.sort()).toEqual(['ada','chris']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const map=page.frameLocator('iframe[title="Campaign click map"]');
  await expect(map.locator('body')).toContainText('[3 clicks · 2 people]');
  await expect(map.locator('a[href]')).toHaveCount(0);
  await page.locator('iframe[title="Campaign click map"]').scrollIntoViewIfNeeded();
  await map.locator('mark').first().scrollIntoViewIfNeeded();
  await map.locator('body').screenshot({path:info.outputPath(`click-map-content-${width}.png`)});
  await page.screenshot({path:info.outputPath(`click-map-${width}.png`)});
  await page.locator('#link-engagement-title').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`links-${width}.png`)});
  await page.locator('#recipient-report-title').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`recipients-${width}.png`)});
}

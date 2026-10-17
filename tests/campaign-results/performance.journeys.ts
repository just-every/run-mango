import {test,contract,runtime} from './runtime-fixture';
import {expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {localSessionCookieName} from '../support/local-session';
import {openPage} from '../support/navigation';
import {csvRows,parseCsv} from '../../src/core/features/audience/csv';
for(const width of [1440,390])contract('REPORT-002',`campaign filters, exact CSV rows and optional open estimates at ${width}`,async({page,request})=>{
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
});

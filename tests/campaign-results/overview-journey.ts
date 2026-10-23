import {proveSavedReportMetrics} from './saved-report-metric-journey';
import {expect,type Page,type APIRequestContext,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';

export async function proveOverview(page:Page,request:APIRequestContext,runtime:{url:string;token:string},width:number,info:TestInfo) {
  const response=await request.post(`${runtime.url}/_results/overview`,{headers:{'X-Test-Token':runtime.token}});expect(response.status(),await response.text()).toBe(200);
  const fixture=await response.json(),query=new URLSearchParams({from:fixture.from,to:fixture.to});
  const report=await (await page.request.get(`${runtime.url}/api/insights?${query}`)).json(),overview=report.overview;
  expect(overview.days).toBe(fixture.days);expect(overview.previous).toMatchObject({from:fixture.previousFrom,to:fixture.previousTo});
  expect(overview.current.campaignRevenueUsdMinor).toBe('13000');expect(overview.previous.campaignRevenueUsdMinor).toBe('2000');
  expect(overview.current).toMatchObject({clicks:3,conversions:3,growth:{net:2}});expect(overview.previous).toMatchObject({clicks:1,conversions:1,growth:{net:1}});
  expect(overview.current.growth.sources).toEqual(expect.arrayContaining([expect.objectContaining({source:'Studio event',net:1}),expect.objectContaining({source:'Newsletter form',net:1})]));
  expect(overview.current.costs).toEqual([{currency:'USD',reportedCostMicros:8000,unpricedFacts:1}]);
  expect(overview.previous.costs).toEqual([{currency:'USD',reportedCostMicros:2000,unpricedFacts:0}]);
  expect(overview.current.health).toEqual([expect.objectContaining({delivered:2,complained:1,attempted:2,hardBounced:0,complaintRate:0.5,hardBounceRate:0})]);
  expect(overview.current.topCampaigns.map((row:any)=>[row.campaignId,row.netAmountMinor])).toEqual([['overview-top','8000'],['overview-current','5000']]);
  expect(overview.incrementalRevenue).toBeNull();expect(overview.flows).toBeNull();
  for(const period of [overview.current,overview.previous]) {
    const filter=new URLSearchParams({from:period.from,to:period.to});
    const performance=await (await page.request.get(`${runtime.url}/api/insights/campaign-performance?${filter}`)).json();
    expect(period.campaignRevenueUsdMinor).toBe(performance.rows.reduce((n:bigint,row:any)=>n+BigInt(row.revenueByCurrency.find((value:any)=>value.currency==='USD')?.netAmountMinor??0),0n).toString());
    expect(period.clicks).toBe(performance.rows.reduce((n:number,row:any)=>n+row.totalClicks,0));expect(period.conversions).toBe(performance.rows.reduce((n:number,row:any)=>n+row.conversions,0));
    const growth=await (await page.request.get(`${runtime.url}/api/insights/list-growth?${filter}`)).json();
    expect(period.growth.net).toBe(growth.channels.reduce((n:number,row:any)=>n+row.net,0));
  }
  await proveSavedReportMetrics(page,runtime.url,new Date(Date.parse(fixture.from+'T00:00:00Z')+4*86400000).toISOString().slice(0,10));
  for(const bad of ['from=2026-02-30','from=2026-10-02&to=2026-10-01','from=2020-01-01&to=2026-10-01'])expect((await page.request.get(`${runtime.url}/api/insights?${bad}`)).status()).toBe(400);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/hydration|hydrated.*match/i.test(message.text()))errors.push(message.text());});
  await openPage(page,`${runtime.url}/app/insights`);
  const panel=page.getByRole('region',{name:'Marketing overview'});
  await expect(panel.getByLabel('Overview from (UTC)')).toBeEnabled();
  await panel.getByLabel('Overview from (UTC)').fill(fixture.from);await panel.getByLabel('Overview through (UTC)').fill(fixture.to);await expect(panel.getByLabel('Overview from (UTC)')).toHaveValue(fixture.from);await expect(panel.getByLabel('Overview through (UTC)')).toHaveValue(fixture.to);await panel.getByRole('button',{name:'Apply overview dates'}).click();
  await expect(panel.locator('[data-overview-period]')).toContainText(fixture.from);
  await expect(panel.locator('[data-overview-metric="revenue"]')).toContainText('USD 130.00');
  await expect(panel.locator('[data-overview-metric="revenue"]')).toContainText('USD 20.00');
  await expect(panel.getByRole('region',{name:'Incremental revenue'})).toContainText('No holdout configured');await expect(panel.getByRole('region',{name:'Flow results'})).toContainText('No flows yet');
  await expect(panel.getByRole('region',{name:'Overview provider costs'})).toContainText('USD 0.008');await expect(panel.getByRole('region',{name:'Overview deliverability health'})).toContainText('50.00%');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
  expect(errors).toEqual([]);await panel.scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`overview-${width}.png`),fullPage:true});
}

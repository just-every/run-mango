import {expect,type Page} from '@playwright/test';
/** The same seeded UTC day reconciles saved reports with the overview's facts. */
export async function proveSavedReportMetrics(page:Page,url:string,day:string) {
  for(const [metric,dimension,value,currency,unpricedFacts]of [
    ['providerCost','provider','8000','USD',1],['billableUnits','channel','3',null,0],
    ['humanClicks','channel','3',null,0],['conversions','channel','3',null,0],['attributedRevenueUsd','channel','13000','USD',0],
  ] as const){
    const created=await page.request.post(url+'/api/settings/reports',{headers:{Origin:url},data:{metric,dimension}});expect(created.status(),await created.text()).toBe(201);
    const {id}=await created.json(),read=await page.request.get(`${url}/api/settings/reports/${id}/read?from=${day}&to=${day}`);expect(read.status(),await read.text()).toBe(200);
    const {report}=await read.json();expect(report.rows).toEqual([expect.objectContaining({day,dimension:dimension==='provider'?'sendgrid':'email',metric,value,currency,unpricedFacts})]);
    expect(JSON.stringify(report)).not.toContain('current@example.test');expect(JSON.stringify(report)).not.toContain('top@example.test');
  }
}

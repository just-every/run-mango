import { expect, type Page, type APIRequestContext, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openPage } from '../support/navigation';

export async function exerciseRetention(page:Page,request:APIRequestContext,runtime:{url:string;token:string},width:number,info:TestInfo) {
  const seeded=await request.post(`${runtime.url}/_results/retention`,{headers:{'X-Test-Token':runtime.token}});expect(seeded.status(),await seeded.text()).toBe(200);const fixture=await seeded.json();
  const response=await page.request.get(`${runtime.url}/api/insights/retention`);expect(response.status()).toBe(200);const report=await response.json();
  const byCustomer=new Map<string,typeof fixture.orders>();for(const order of fixture.orders)byCustomer.set(order.contactId,[...byCustomer.get(order.contactId)??[],order]);
  const repeat=[...byCustomer.values()].filter(orders=>orders.length>1).length;
  expect(report.customers).toBe(byCustomer.size);expect(report.repeatPurchaseRate).toBe(repeat/byCustomer.size);expect(report.medianDaysBetweenOrders).toBe(40);
  const month=(at:number)=>new Date(at).toISOString().slice(0,7),cohorts=new Map<string,Map<string,Set<string>>>();
  for(const[id,orders]of byCustomer){const first=month(Math.min(...orders.map((order:any)=>order.purchasedAt)));const cohort=cohorts.get(first)??new Map<string,Set<string>>();for(const order of orders){const key=month(order.purchasedAt),members=cohort.get(key)??new Set<string>();members.add(id);cohort.set(key,members);}cohorts.set(first,cohort);}
  for(const cohort of report.cohorts){const expected=cohorts.get(cohort.month)!;expect(cohort.customers).toBe(expected.get(cohort.month)!.size);for(const cell of cohort.months)expect(cell.retentionRate).toBe((expected.get(cell.month)?.size??0)/cohort.customers);}
  expect(report.stages).toEqual({new:1,active:1,'at-risk':1,lapsed:1,champion:1});
  const person=report.rfm.find((row:any)=>row.contactId==='retention-iris');expect(person).toMatchObject({orders:5,recencyScore:5,frequencyScore:5,stage:'champion'});expect(person.monetaryByCurrency).toEqual([{currency:'USD',amountMinor:48000,score:5}]);
  expect(report.valueByForm.find((row:any)=>row.source==='Studio opening').valueByCurrency[0].amountMinor).toBe(48000);
  expect(report.productAffinity.together.find((row:any)=>row.productA==='Orchard linen'&&row.productB==='Studio ceramics').orders).toBe(5);
  await openPage(page,`${runtime.url}/app/insights`);await expect(page.getByRole('heading',{name:'Customer retention',exact:true})).toBeVisible();
  await expect(page.getByRole('table',{name:'First-order cohorts'}).locator('tbody tr')).toHaveCount(report.cohorts.length);
  await expect(page.getByRole('table',{name:'Customer RFM scores'})).toContainText('Iris Dawson');await expect(page.getByRole('table',{name:'Customer RFM scores'})).toContainText('JPY 10,000');await expect(page.getByText('80.0% (4/5)',{exact:true})).toBeVisible();
  await page.getByText('Methods and thresholds',{exact:true}).click();await expect(page.getByText(/Midrank percentile/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.locator('#retention-title').scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`retention-${width}.png`)});
  await openPage(page,`${runtime.url}/app/audience/retention-iris`);await expect(page.getByRole('heading',{name:'Purchase lifecycle and RFM',exact:true})).toBeVisible();await expect(page.getByText('Recency score 5/5 · Frequency score 5/5',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);await page.getByRole('heading',{name:'Purchase lifecycle and RFM',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`contact-rfm-${width}.png`)});
}

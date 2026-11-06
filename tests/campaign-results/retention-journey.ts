import { expect, type Page, type APIRequestContext, type TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { openPage } from '../support/navigation';
import type { RetentionFixture } from './retention-fixture';
import { localSessionCookieName } from '../support/local-session';

export async function exerciseRetention(page:Page,request:APIRequestContext,runtime:{url:string;token:string},width:number,info:TestInfo) {
  const before=Date.parse('2031-10-05T23:59:59.900Z');
  const setClock=async(at:number|null)=>{
    const response=await request.post(`${runtime.url}/_results/retention-time`,{headers:{'X-Test-Token':runtime.token},data:{at}});
    expect(response.status(),await response.text()).toBe(200);
    if(at!==null)expect((await response.json()).now).toBe(at);
  };
  await setClock(before);
  try {
    // Issue the native operator session under the same server clock, rather
    // than extending a real-time session beyond its ordinary expiry.
    const session=await request.post(`${runtime.url}/_results/open`,{headers:{'X-Test-Token':runtime.token}});
    expect(session.status()).toBe(200);
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:(await session.json()).token,domain:'127.0.0.1',path:'/'}]);
    const fixture=await inspectRetention(page,request,runtime,width,info,before);
    const after=before+200;
    await setClock(after);
    const response=await page.request.get(`${runtime.url}/api/insights/retention`);
    expect(response.status()).toBe(200);
    const report=await response.json();
    // The same recorded purchases cross midnight by only 200 milliseconds.
    // A rolling 24-hour age or a cached stage cannot satisfy this read.
    const expected=rfmExpectations(fixture,after);
    expect(report.asOf).toBe(new Date(after).toISOString());
    expect(report.scoringDay).toBe('2031-10-06');
    expect(report.rfm).toEqual(expected.rows);
    expect(report.stages).toEqual(expected.stages);
    expect(expected.rows.find(row=>row.contactId==='retention-luis')).toMatchObject({recencyDays:30,stage:'active'});
    for(const person of expected.rows) {
      const detail=await page.request.get(`${runtime.url}/api/contacts/${person.contactId}/rfm`);
      expect(detail.status()).toBe(200);expect((await detail.json()).scores).toEqual(person);
    }
    await openPage(page,`${runtime.url}/app/insights`);
    await assertRfmTable(page,expected.rows);
    await openPage(page,`${runtime.url}/app/audience/retention-luis`);
    await assertContactRfm(page,expected.rows.find(row=>row.contactId==='retention-luis')!);
    console.log('PROBE SEG-003 acceptance-3: native server reads 200ms across UTC midnight -> every recency increments and Luis changes from new to active');
  } finally {
    await setClock(null);
    await page.setViewportSize({width,height:1000});
  }
}

async function inspectRetention(page:Page,request:APIRequestContext,runtime:{url:string;token:string},width:number,info:TestInfo,now:number) {
  const seeded=await request.post(`${runtime.url}/_results/retention`,{headers:{'X-Test-Token':runtime.token}});expect(seeded.status(),await seeded.text()).toBe(200);const fixture:RetentionFixture=await seeded.json();
  const response=await page.request.get(`${runtime.url}/api/insights/retention`);expect(response.status()).toBe(200);const report=await response.json();
  const population=rfmExpectations(fixture,now);
  expect(fixture.now).toBe(now);
  expect(report.asOf).toBe(new Date(now).toISOString());
  expect(report.rfm).toEqual(population.rows);
  expect(report.stages).toEqual(population.stages);
  for(const person of population.rows) {
    const detail=await page.request.get(`${runtime.url}/api/contacts/${person.contactId}/rfm`);
    expect(detail.status()).toBe(200);expect((await detail.json()).scores).toEqual(person);
  }
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
  const expected=retentionExpectations(fixture);
  expect(report.valueByAcquisitionSource).toEqual(expected.sources);
  expect(report.valueByForm).toEqual(expected.forms);
  expect(report.productAffinity).toEqual(expected.affinity);
  expect(report.valueByAcquisitionSource.reduce((sum:number,row:any)=>sum+row.orders,0)).toBe(fixture.orders.length);
  expect(fixture.excludedOrders).toHaveLength(2);
  // Direction is not an unordered co-purchase: linen precedes ceramics twice, never the reverse.
  expect(report.productAffinity.next.find((row:any)=>row.fromProduct==='Orchard linen'&&row.toProduct==='Studio ceramics')).toMatchObject({transitions:2,customers:2});
  expect(report.productAffinity.next.some((row:any)=>row.fromProduct==='Studio ceramics'&&row.toProduct==='Orchard linen')).toBe(false);
  await openPage(page,`${runtime.url}/app/insights`);await expect(page.getByRole('heading',{name:'Customer retention',exact:true})).toBeVisible();
  await expect(page.getByRole('table',{name:'First-order cohorts'}).locator('tbody tr')).toHaveCount(report.cohorts.length);
  await expect(page.getByRole('table',{name:'Customer RFM scores'})).toContainText('Iris Dawson');await expect(page.getByRole('table',{name:'Customer RFM scores'})).toContainText('JPY 10,000');await expect(page.getByText('80.0% (4/5)',{exact:true})).toBeVisible();
  await assertRfmTable(page,population.rows);
  await assertValueTable(page,'Customer value by acquisition source',expected.sources);
  await assertValueTable(page,'Customer value by signup form',expected.forms);
  await assertAffinityTables(page,expected.affinity);
  await page.getByText('Methods and thresholds',{exact:true}).click();await expect(page.getByText(/Midrank percentile/)).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.getByRole('table',{name:'Customer RFM scores',exact:true}).screenshot({path:info.outputPath(`retention-${width}.png`)});
  await openPage(page,`${runtime.url}/app/audience/retention-iris`);await expect(page.getByRole('heading',{name:'Purchase lifecycle and RFM',exact:true})).toBeVisible();await expect(page.getByText('Recency score 5/5 · Frequency score 5/5',{exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);await page.getByRole('heading',{name:'Purchase lifecycle and RFM',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:info.outputPath(`contact-rfm-${width}.png`)});
  for(const contactId of ['retention-iris','retention-maya']) {
    await openPage(page,`${runtime.url}/app/audience/${contactId}`);
    await assertContactRfm(page,population.rows.find(row=>row.contactId===contactId)!);
  }
  // Assertions run at 1440; capture the same built screens at phone width as
  // browser proof without registering a second copy of the journey.
  await page.setViewportSize({width:390,height:844});
  await openPage(page,`${runtime.url}/app/insights`);
  await page.getByRole('table',{name:'Customer RFM scores',exact:true}).getByRole('row').filter({has:page.getByRole('link',{name:'Maya Chen',exact:true})}).scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('retention-390.png')});
  await openPage(page,`${runtime.url}/app/audience/retention-maya`);
  await page.getByRole('heading',{name:'Purchase lifecycle and RFM',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('contact-rfm-390.png')});
  await page.setViewportSize({width,height:1000});
  console.log(`PROBE SEG-003 acceptance-1 and acceptance-4: authenticated retention and five contact routes -> ${population.rows.length} independently reconciled RFM rows, tied ranks and separate USD and JPY scores`);
  console.log('PROBE SEG-003 acceptance-2: native operator retention table and contact profiles -> all five stages, exact scores and visible methods; browser captures at 1440 and 390');
  return fixture;
}

// Count how many values are strictly below or tied with each observation. This
// pairwise calculation deliberately does not copy production's sorted-run
// scoring algorithm or import any production scoring helpers.
function rfmExpectations(fixture:RetentionFixture,now:number) {
  const day=86400000;
  const facts=fixture.customers.map(customer=>{
    const orders=fixture.orders.filter(order=>order.contactId===customer.contactId);
    const first=Math.min(...orders.map(order=>order.purchasedAt)),last=Math.max(...orders.map(order=>order.purchasedAt));
    const currencies=[...new Set(orders.map(order=>order.currency))].sort();
    return {...customer,first,last,orders:orders.length,recency:Math.floor(now/day)-Math.floor(last/day),
      money:currencies.map(currency=>({currency,amount:orders.filter(order=>order.currency===currency).reduce((sum,order)=>sum+BigInt(order.grossMinor)-BigInt(order.refundedMinor),0n)}))};
  });
  const rank=(value:number|bigint,values:(number|bigint)[],recent=false)=>{
    const below=values.filter(other=>other<value).length,equal=values.filter(other=>other===value).length;
    const fraction=values.length===1?0.5:(below+(equal-1)/2)/(values.length-1);
    const band=[0.2,0.4,0.6,0.8].filter(boundary=>fraction>=boundary).length+1;
    return recent?6-band:band;
  };
  const rows=facts.map(person=>{
    const recencyScore=rank(person.recency,facts.map(other=>other.recency),true);
    const frequencyScore=rank(person.orders,facts.map(other=>other.orders));
    const stage=person.recency>=180?'lapsed':person.recency>=90?'at-risk':person.orders===1&&Math.floor(now/day)-Math.floor(person.first/day)<30?'new':recencyScore>=4&&frequencyScore>=4?'champion':'active';
    return {contactId:person.contactId,displayName:person.displayName,firstOrderAt:new Date(person.first).toISOString(),lastOrderAt:new Date(person.last).toISOString(),
      orders:person.orders,recencyDays:person.recency,recencyScore,frequencyScore,stage,
      monetaryByCurrency:person.money.map(({currency,amount})=>({currency,amountMinor:Number(amount),score:rank(amount,facts.flatMap(other=>other.money.filter(value=>value.currency===currency).map(value=>value.amount)))}))};
  }).sort((a,b)=>a.contactId.localeCompare(b.contactId));
  const stages={new:0,active:0,'at-risk':0,lapsed:0,champion:0};
  for(const row of rows)stages[row.stage as keyof typeof stages]++;
  return {rows,stages};
}
type RfmRow=ReturnType<typeof rfmExpectations>['rows'][number];
function displayedMoney(currency:string,amountMinor:number) {
  const digits=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits!;
  return `${currency} ${(amountMinor/10**digits).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits})}`;
}
async function assertRfmTable(page:Page,expected:RfmRow[]) {
  const table=page.getByRole('table',{name:'Customer RFM scores',exact:true});
  await expect(table.locator('tbody tr')).toHaveCount(expected.length);
  for(const person of expected) {
    const row=table.getByRole('row').filter({has:page.getByRole('link',{name:person.displayName,exact:true})});
    await expect(row.locator('td[data-label="Stage"]')).toHaveText(person.stage);
    await expect(row.locator('td[data-label="Recency"]')).toHaveText(`${person.recencyDays} days / ${person.recencyScore}`);
    await expect(row.locator('td[data-label="Frequency"]')).toHaveText(`${person.orders} / ${person.frequencyScore}`);
    await expect(row.locator('td[data-label="Monetary"] > div')).toHaveText(person.monetaryByCurrency.map(value=>`${displayedMoney(value.currency,value.amountMinor)} / ${value.score}`));
  }
}
async function assertContactRfm(page:Page,person:RfmRow) {
  const panel=page.locator('section').filter({has:page.getByRole('heading',{name:'Purchase lifecycle and RFM',exact:true})}).last();
  await expect(panel.locator('p').first()).toHaveText(`${person.stage} · ${person.recencyDays} days since last purchase · ${person.orders} orders`);
  await expect(panel.locator('p').nth(1)).toHaveText(`Recency score ${person.recencyScore}/5 · Frequency score ${person.frequencyScore}/5`);
  await expect(panel.locator('p').filter({hasText:'Monetary score'})).toHaveText(person.monetaryByCurrency.map(value=>`${displayedMoney(value.currency,value.amountMinor)} · Monetary score ${value.score}/5`));
}


// Reconcile from the fixture's recorded facts, never from a report field or a
// production aggregation helper. The fixture includes later captures, a store
// origin fallback, an unknown origin and a shared source with two currencies.
function retentionExpectations(fixture:RetentionFixture) {
  const histories=new Map<string,RetentionFixture['orders']>();
  for(const order of fixture.orders) {
    const history=histories.get(order.contactId)??[];
    history.push(order);histories.set(order.contactId,history);
  }
  const sourceByContact=new Map<string,string|null>(),formByContact=new Map<string,string|null>();
  for(const[contactId,history]of histories) {
    history.sort((a,b)=>a.purchasedAt-b.purchasedAt);
    const firstPurchase=history[0].purchasedAt;
    const capture=fixture.captures.filter(fact=>fact.contactId===contactId&&fact.occurredAt<=firstPurchase).sort((a,b)=>a.occurredAt-b.occurredAt)[0];
    const origin=fixture.customerSources.filter(fact=>fact.contactId===contactId&&fact.occurredAt<=firstPurchase).sort((a,b)=>a.occurredAt-b.occurredAt)[0];
    sourceByContact.set(contactId,capture?`${capture.method}: ${capture.source}`:origin?.provider??null);
    formByContact.set(contactId,capture?.method==='hosted-signup-form'?capture.source:null);
  }
  function valueGroups(labels:Map<string,string|null>) {
    return [...new Set(labels.values())].sort((a,b)=>(a??'').localeCompare(b??'')).map(source=>{
      const contacts=[...labels].filter(([,label])=>label===source).map(([contactId])=>contactId);
      const orders=fixture.orders.filter(order=>contacts.includes(order.contactId));
      return {source,evidence:source===null?'unknown':'recorded',customers:contacts.length,orders:orders.length,
        valueByCurrency:[...new Set(orders.map(order=>order.currency))].sort().map(currency=>{
          const currencyOrders=orders.filter(order=>order.currency===currency),customers=new Set(currencyOrders.map(order=>order.contactId)).size;
          const amountMinor=currencyOrders.reduce((sum,order)=>sum+order.grossMinor-order.refundedMinor,0);
          return {currency,customers,grossAmountMinor:currencyOrders.reduce((sum,order)=>sum+order.grossMinor,0),
            reversedAmountMinor:currencyOrders.reduce((sum,order)=>sum+order.refundedMinor,0),amountMinor,
            meanCustomerValue:{amountMinorNumerator:amountMinor,customersDenominator:customers}};
        })};
    });
  }
  const retained=(order:RetentionFixture['orders'][number])=>[...new Set(order.lines.filter(line=>line.quantity>line.refundedQuantity).map(line=>line.productId))].sort();
  // Record observations first, then count distinct customers independently of
  // observation counts. Each pair is a directed tuple for next purchases.
  const togetherFacts:{a:string;b:string;contactId:string}[]=[],nextFacts:typeof togetherFacts=[];
  for(const[contactId,orders]of histories) {
    for(const[at,order]of orders.entries()) {
      const products=retained(order);
      products.forEach((a,index)=>products.slice(index+1).forEach(b=>togetherFacts.push({a,b,contactId})));
      if(at)for(const a of retained(orders[at-1]))for(const b of products)nextFacts.push({a,b,contactId});
    }
  }
  const pairs=(facts:typeof togetherFacts)=>[...new Set(facts.map(({a,b})=>JSON.stringify([a,b])))].map(key=>{
    const[a,b]=JSON.parse(key) as string[],observations=facts.filter(fact=>fact.a===a&&fact.b===b);
    return {a,b,count:observations.length,customers:new Set(observations.map(fact=>fact.contactId)).size};
  }).sort((a,b)=>b.count-a.count||a.a.localeCompare(b.a)||a.b.localeCompare(b.b));
  return {sources:valueGroups(sourceByContact),forms:valueGroups(formByContact),affinity:{
    together:pairs(togetherFacts).map(({a,b,count,customers})=>({productA:a,productB:b,orders:count,customers})),
    next:pairs(nextFacts).map(({a,b,count,customers})=>({fromProduct:a,toProduct:b,transitions:count,customers})),
    ambiguousSimultaneousOrders:0}};
}

type ValueRows=ReturnType<typeof retentionExpectations>['sources'];
async function assertValueTable(page:Page,name:string,expected:ValueRows) {
  const table=page.getByRole('table',{name,exact:true});
  await expect(table.locator('tbody tr')).toHaveCount(expected.length);
  for(const value of expected) {
    const row=table.getByRole('row').filter({has:page.getByRole('rowheader',{name:value.source??'Unknown source',exact:true})});
    await expect(row.locator('td[data-label="Customers"]')).toHaveText(String(value.customers));
    await expect(row.locator('td[data-label="Orders"]')).toHaveText(String(value.orders));
    const amounts=value.valueByCurrency.map(({currency,amountMinor})=>{
      const digits=new Intl.NumberFormat('en',{style:'currency',currency}).resolvedOptions().maximumFractionDigits!;
      return `${currency} ${(amountMinor/10**digits).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits})}`;
    });
    await expect(row.locator('td[data-label="Net value"] > div')).toHaveText(amounts);
  }
}
async function assertAffinityTables(page:Page,expected:ReturnType<typeof retentionExpectations>['affinity']) {
  const together=page.getByRole('table',{name:'Products bought together',exact:true}),next=page.getByRole('table',{name:'Next products bought',exact:true});
  await expect(together.locator('tbody tr')).toHaveCount(expected.together.length);
  await expect(next.locator('tbody tr')).toHaveCount(expected.next.length);
  for(const pair of expected.together) {
    const row=together.getByRole('row').filter({has:page.getByRole('rowheader',{name:`${pair.productA} + ${pair.productB}`,exact:true})});
    await expect(row.locator('td')).toHaveText([String(pair.orders),String(pair.customers)]);
  }
  for(const pair of expected.next) {
    const row=next.getByRole('row').filter({has:page.getByRole('rowheader',{name:`${pair.fromProduct} → ${pair.toProduct}`,exact:true})});
    await expect(row.locator('td')).toHaveText([String(pair.transitions),String(pair.customers)]);
  }
}

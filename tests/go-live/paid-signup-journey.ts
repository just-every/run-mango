import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {type Installation,json,confirmedContact,draftCampaign,approve,dispatch} from './harness';
import {signupCounterWindow} from './kiosk-harness';
import type {providerEdge} from './edge';
import {openPage} from '../support/navigation';
import type {PaidTier} from '../../src/core/features/store/stripe/paid-tier';

/** [PUB-005][FORM-008][FORM-010] Hosted page and real Worker doors; only Stripe and mail are network fakes. */
export async function paidSignupJourney({site,page,info,owner,edge,post,replacement}:{site:Installation;page:Page;info:TestInfo;owner:string;edge:Awaited<ReturnType<typeof providerEdge>>;post:(event:unknown)=>Promise<Response>;replacement:PaidTier}) {
  const payer='synthetic-mango-51@example.test',unsubscribed='synthetic-mango-52@example.test',suppressed='synthetic-mango-53@example.test';
  const url=site.runtime.url+'/subscribe?paid=1';
  const oldDescription=await json(await site.call('/paid/info'),200);
  expect(await json(await site.call('/api/settings/stripe/paid-tier',{method:'PUT',cookie:owner,body:replacement}),200)).toEqual({paidTier:replacement});
  const beforeStale={requests:edge.stripe.requests.length,sessions:edge.stripe.sessions.length,evidence:await site.count('consent_evidence'),sends:edge.sends.length};
  expect(await json(await site.call('/paid/checkout',{method:'POST',headers:{'CF-Connecting-IP':'198.51.100.151'},body:{email:payer,consent:true,disclosure:oldDescription.disclosure,requestId:crypto.randomUUID()}}),400)).toMatchObject({error:'signup_refused'});
  expect(edge.stripe.requests).toHaveLength(beforeStale.requests);
  expect(edge.stripe.sessions).toHaveLength(beforeStale.sessions);
  expect(await site.count('consent_evidence')).toBe(beforeStale.evidence);
  expect(edge.sends).toHaveLength(beforeStale.sends);
  const oldSelectors=new URLSearchParams({priceId:'price_synthetic',tier:oldDescription.paidTopic}).toString();
  const freshInfo=await site.call('/paid/info?'+oldSelectors);
  expect(freshInfo.headers.get('cache-control')).toBe('no-store');
  const description=await json(freshInfo,200);
  expect(description).toMatchObject({paidTopic:replacement.paidTopic,price:'$27.00 every 3 weeks'});
  expect(description.disclosure).not.toBe(oldDescription.disclosure);
  expect(await json(await site.call('/paid/info'),200)).toEqual(description);
  const confirmations=(email:string)=>edge.sends.filter(send=>send.to===email&&send.body.subject==='Confirm your Mango Garden subscription');
  const contact=async(email:string)=>(await site.rows(`SELECT id,email_status FROM contacts WHERE email='${email}'`))[0];
  let payerIndex=51;
  async function complete(email:string) {
    const n=payerIndex++,customer=`cus_syntheticMango${n}`,subscription=`sub_syntheticMango${n}`;
    edge.stripe.customers[customer]={email,name:'Garden paid reader'};
    edge.stripe.subscriptions[subscription]={customer,status:'active',metadata:{mango_paid_tier:'1'}};
    const event={id:`evt_syntheticMango${n}`,type:'checkout.session.completed',created:Math.floor((await site.control('/_golive/clock')).now/1000),livemode:false,
      data:{object:{id:`cs_synthetic_${edge.stripe.sessions.length}`,mode:'subscription',customer,subscription,customer_details:{email},currency:'usd',amount_total:2916,total_details:{amount_tax:216}}}};
    for(let i=0;i<2;i++)expect((await post(event)).status).toBe(204);
  }
  await page.context().setExtraHTTPHeaders({'CF-Connecting-IP':'198.51.100.151'});
  // A synthetic Stripe-hosted Checkout at the browser network edge. Its explicit
  // Complete checkout POST emits the signed notification, then returns to Mango.
  await page.route('https://checkout.stripe.com/**',async route=>{
    if(route.request().method()==='POST') {
      await complete(payer);
      await route.fulfill({status:303,headers:{location:site.local(edge.stripe.sessions.at(-1)!.form.get('success_url')!)}});
    }else await route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><title>Synthetic checkout</title><h1>Stripe Checkout test edge</h1><form method="post"><button>Complete checkout</button></form></html>'});
  });
  for(const width of [1440]) {
    await page.setViewportSize({width,height:1000});await openPage(page,url+'&'+oldSelectors);
    await expect(page.getByRole('heading',{name:replacement.paidTopic,exact:true})).toBeVisible();
    await expect(page.locator('main')).toContainText(description.price);
    await expect(page.locator('main')).toContainText('Stripe Tax');
    await expect(page.getByRole('checkbox')).toHaveAccessibleName(description.consentText+' (required)');
    await expect(page.getByRole('checkbox')).not.toBeChecked();
    expect(await page.locator('input').evaluateAll(inputs=>inputs.some(input=>/card|payment/i.test((input as HTMLInputElement).name)))).toBe(false);
    expect(await page.evaluate(() => window.__rerHydration?.count ?? 0)).toBe(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
    await page.screenshot({path:info.outputPath(`paid-signup-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:390,height:1000});
  await page.screenshot({path:info.outputPath('paid-signup-390.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.getByLabel('Email address',{exact:true}).fill(payer);
  await page.getByRole('checkbox').check();
  await page.getByRole('button',{name:'Continue to Stripe Checkout',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Stripe Checkout test edge',exact:true})).toBeVisible();
  expect(Object.fromEntries(edge.stripe.sessions.at(-1)!.form)).toMatchObject({'line_items[0][price]':replacement.priceId,'automatic_tax[enabled]':'true','customer_email':payer});
  await page.getByRole('button',{name:'Complete checkout',exact:true}).click();
  await expect(page.getByRole('heading',{name:'What happens next',exact:true})).toBeVisible();
  for(const width of [1440]) {
    await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/subscribe?paid=1&returned=1');
    await expect(page.locator('main')).toContainText('Confirm subscription');
    expect(await page.evaluate(() => window.__rerHydration?.count ?? 0)).toBe(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
    await page.screenshot({path:info.outputPath(`paid-signup-return-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:390,height:1000});
  await page.screenshot({path:info.outputPath('paid-signup-return-390.png'),fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  expect(confirmations(payer)).toHaveLength(1);
  expect((await contact(payer)).email_status).toBe('pending');
  expect((await site.rows(`SELECT capture_method,confirmed_at FROM consent_evidence WHERE destination='${payer}'`))).toEqual([{capture_method:'paid-checkout',confirmed_at:null}]);
  const evidence=(await site.rows(`SELECT occurred_at,capture_source,consent_version,consent_text FROM consent_evidence WHERE destination='${payer}'`))[0];
  expect(evidence.occurred_at).toBeGreaterThan(0);
  expect(evidence.capture_source).toBe(site.origin+'/subscribe?paid=1');
  expect(evidence.consent_version.length).toBeGreaterThan(0);
  expect(evidence.consent_text).toBe(description.consentText);
  const paidControl=['synthetic-mango-54','example.test'].join('@'),freeControl=['free-reader','example.test'].join('@');
  await confirmedContact(site,edge,owner,paidControl,'Confirmed garden supporter');
  await start(paidControl);await complete(paidControl);
  const preview=await json(await site.call('/api/audience/import-preview',{method:'POST',cookie:owner,body:{files:[{name:'synthetic-mango-53.csv',preset:'csv-cleaned',csv:`Email Address,First Name\n${suppressed},Suppressed reader`}]}}),200);
  let {job}=await json(await site.call('/api/audience/imports',{method:'POST',cookie:owner,body:{fingerprint:preview.fingerprint}}),200);
  while(['queued','applying'].includes(job.state))({job}=await json(await site.call(`/api/audience/imports/${job.id}/resume`,{method:'POST',cookie:owner,body:{}}),200));
  await site.control('/_golive/clock',{advanceMs:2001});
  await start(suppressed);await complete(suppressed);
  expect((await contact(suppressed)).email_status).toBe('suppressed');expect(confirmations(suppressed)).toHaveLength(0);
  expect(edge.sends.filter(send=>send.to===suppressed)).toHaveLength(0);
  for(const email of [payer,suppressed,paidControl]) {
    const reader=await contact(email);
    expect(await site.rows(`SELECT state FROM paid_subscriptions WHERE contact_id='${reader.id}'`)).toEqual([{state:'active'}]);
  }
  // Real review, approval and queue handoffs with eligible controls prove that
  // neither pending consent nor suppression is bypassed by either issue type.
  for(const kind of ['paid','free'] as const) {
    await site.control('/_golive/clock',{advanceMs:86400001});
    await site.control('/_golive/sender-evidence');
    const sendAt=new Date((await site.control('/_golive/clock')).now+3600000);
    const name=`Paid signup ${kind} consent boundary`;
    const issue=await draftCampaign(site,owner,name,[payer,suppressed,paidControl,freeControl],sendAt);
    if(kind==='paid')await json(await site.call(`/api/campaign-revisions/${issue.revisionId}`,{method:'PATCH',cookie:owner,body:{inclusionRuleJson:JSON.stringify({version:1,operator:'all',predicates:[
      {sourceType:'contact',field:'email',comparator:'in',value:[payer,suppressed,paidControl,freeControl]},
      {sourceType:'contact',field:'paidMember',channel:'email',comparator:'eq',value:true},
    ]})}}),200);
    const expected=kind==='paid'?[paidControl]:[paidControl,freeControl].sort();
    expect(await json(await site.call(`/api/campaigns/${issue.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:issue.revisionId}}),200))
      .toMatchObject({candidateCount:kind==='paid'?1:4,eligibleCount:expected.length});
    await approve(site,owner,issue);await site.control('/_golive/clock',{advanceMs:3600001});
    const recipients=await dispatch(site,issue.campaignId,sendAt);
    expect(recipients.map(row=>row.email).sort()).toEqual(expected);
    expect(recipients.filter(row=>row.transport_disposition==='accepted').map(row=>row.email).sort()).toEqual(expected);
    expect(edge.sends.filter(send=>String(send.body.subject).startsWith(name)).map(send=>send.to).sort()).toEqual(expected);
    expect(await site.rows(`SELECT f.id FROM delivery_facts f JOIN recipient_steps r ON r.id=f.recipient_step_id WHERE r.campaign_id='${issue.campaignId}' AND r.destination IN ('${payer}','${suppressed}')`)).toEqual([]);
  }
  expect((await contact(payer)).email_status).toBe('pending');expect(confirmations(payer)).toHaveLength(1);
  expect((await contact(suppressed)).email_status).toBe('suppressed');expect(confirmations(suppressed)).toHaveLength(0);
  expect(edge.sends.filter(send=>send.to===suppressed)).toHaveLength(0);
  const before=(await json(await site.call('/api/settings/stripe',{cookie:owner}),200)).paidReaders;
  expect(before.consentMissing).toBeGreaterThan(0);
  const due=new Date((await site.control('/_golive/clock')).now+3600000);
  const campaign=await draftCampaign(site,owner,'Paid signup first issue',[payer,'free-reader@example.test'],due);
  const rule={version:1,operator:'all',predicates:[{sourceType:'contact',field:'paidMember',channel:'email',comparator:'eq',value:true},
    {sourceType:'contact',field:'email',comparator:'in',value:[payer,freeControl]}]};
  await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie:owner,body:{inclusionRuleJson:JSON.stringify(rule)}}),200);
  expect(await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}}),200)).toMatchObject({candidateCount:0,eligibleCount:0});
  const confirmation=confirmations(payer)[0];
  const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(confirmation.body.content.find((part:any)=>part.type==='text/plain').value)![0];
  expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
  expect((await contact(payer)).email_status).toBe('subscribed');
  await approve(site,owner,campaign);await site.control('/_golive/clock',{advanceMs:3600001});
  expect((await dispatch(site,campaign.campaignId,due)).filter(row=>row.transport_disposition==='accepted').map(row=>row.email)).toEqual([payer]);
  expect(edge.sends.filter(send=>String(send.body.subject).startsWith('Paid signup first issue')).map(send=>send.to)).toEqual([payer]);
  // A subscribed and confirmed reader needs no second confirmation.
  async function start(email:string,requestId=crypto.randomUUID()) {
    return json(await site.call('/paid/checkout',{method:'POST',headers:{'CF-Connecting-IP':'198.51.100.152'},body:{email,consent:true,disclosure:description.disclosure,requestId}}),200);
  }
  await site.control('/_golive/clock',{advanceMs:2001});
  const acceptedCount=async()=>(await site.rows("SELECT COALESCE(SUM(count),0) AS n FROM oa_limits WHERE key='signup-global'"))[0].n;
  const beforeSubscribed=await acceptedCount();
  await start(payer);expect(confirmations(payer)).toHaveLength(1);
  expect(await acceptedCount()).toBe(beforeSubscribed);
  await confirmedContact(site,edge,owner,unsubscribed,'Returning garden reader');
  const unsub=await contact(unsubscribed);
  await json(await site.call(`/api/contacts/${unsub.id}/opt-out`,{method:'POST',cookie:owner,body:{channel:'email'}}),200);
  await site.control('/_golive/clock',{advanceMs:2001});
  const count=confirmations(unsubscribed).length,requestId=crypto.randomUUID();
  await start(unsubscribed,requestId);const afterReturning=await acceptedCount();
  await start(unsubscribed,requestId);expect(await acceptedCount()).toBe(afterReturning);await complete(unsubscribed);
  expect((await contact(unsubscribed)).email_status).toBe('unsubscribed');
  expect(confirmations(unsubscribed)).toHaveLength(count+1);
  const returning=confirmations(unsubscribed).at(-1)!;
  const returningLink=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(returning.body.content.find((part:any)=>part.type==='text/plain').value)![0];
  expect((await fetch(site.local(returningLink))).status).toBe(200);expect((await contact(unsubscribed)).email_status).toBe('unsubscribed');
  expect((await fetch(site.local(returningLink),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
  expect((await contact(unsubscribed)).email_status).toBe('subscribed');
  // ct 23 October: erasure also removes the paid-signup address and evidence.
  const erasedPayer = await contact(payer);
  const freshOwner = await site.open();
  let erasure = await site.call(`/api/contacts/${erasedPayer.id}`,{method:'DELETE',cookie:freshOwner});
  let receipt = await erasure.json();
  for(let step=0;erasure.status===202&&step<400;step++) {
    erasure=await site.call(`/api/audience/erasures/${receipt.receipt.reference}/resume`,{method:'POST',cookie:freshOwner,body:{}});
    receipt=await erasure.json();
  }
  expect(erasure.status).toBe(200);expect(receipt.receipt.state).toBe('complete');
  expect(await site.rows(`SELECT id FROM contacts WHERE email='${payer}'`)).toEqual([]);
  expect(await site.rows(`SELECT id FROM consent_evidence WHERE destination='${payer}'`)).toEqual([]);
  // Paid and free capture consume the same accepted network allowance. Fill it
  // through public doors, then both refuse without another Stripe hand-off.
  const capacityIp='198.51.100.153';
  const checkout=(email:string)=>site.call('/paid/checkout',{method:'POST',headers:{'CF-Connecting-IP':capacityIp},body:{email,consent:true,disclosure:description.disclosure,requestId:crypto.randomUUID()}});
  // The product window is the real SQLite hour; the Worker clock offset does not move it. Start the
  // read-fill-read block only with more than 180 s left in the real hour, as the opt-in journey does.
  const counter=await signupCounterWindow(site,'signup-global');
  const beforeCapacity=counter.before;
  await json(await checkout('synthetic-mango-capacity-paid@example.test'),200);
  expect(await counter.count()).toBe(beforeCapacity+1);
  const levels=await json(await site.call('/api/audience/signup-allowance',{cookie:owner}),200);
  const freeDescription=await json(await site.call('/subscribe/info'),200);
  const freeSignup=(email:string)=>site.call('/subscribe',{method:'POST',headers:{'CF-Connecting-IP':capacityIp},body:{email,consent:true,disclosure:freeDescription.disclosure}});
  for(let index=1;index<levels.levels.networkUnchallenged;index++) {
    await json(await freeSignup(`synthetic-mango-capacity-free-${index}@example.test`),202);
  }
  expect(await counter.count()).toBe(beforeCapacity+levels.levels.networkUnchallenged);
  const sessionsBeforeRefusal=edge.stripe.sessions.length;
  const refused=await checkout('synthetic-mango-capacity-over@example.test');
  expect(refused.status).toBe(429);expect(Number(refused.headers.get('Retry-After'))).toBeGreaterThan(0);
  expect(await refused.json()).toMatchObject({error:'rate_limited',reason:'network-rate-limit'});
  expect(edge.stripe.sessions).toHaveLength(sessionsBeforeRefusal);
  expect((await freeSignup('synthetic-mango-capacity-free-over@example.test')).status).toBe(429);
  expect(await counter.count()).toBe(beforeCapacity+levels.levels.networkUnchallenged);
  expect(await site.rows("SELECT id FROM contacts WHERE email='synthetic-mango-capacity-over@example.test'")).toEqual([]);
  expect((await site.rows("SELECT SUM(refusals) AS n FROM signup_refusal_hours WHERE form='hosted' AND reason='network-rate-limit'"))[0].n).toBeGreaterThanOrEqual(2);
  await page.unroute('https://checkout.stripe.com/**');await page.context().setExtraHTTPHeaders({});
}

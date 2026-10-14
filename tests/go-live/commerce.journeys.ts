import {expect,test} from '@playwright/test';
import {createHmac,createHash} from 'node:crypto';
import {providerEdge} from './edge';
import {storeEdge,bag} from './commerce-edge';
import {eventSigner} from './sendgrid-events';
import {approve,confirmedContact,dispatch,draftCampaign,installation,json,sender,consent,type Installation} from './harness';

/** Business proof enters through signed provider ingress, authenticated authoring,
 * and production Cron/Queue. SQL below observes results only. */
test('[RESULT-003][RESULT-005][AUD-003][AUD-006] actual tracked delivery attributes canonical paid store receipts and distinct refunds',async()=>{
  const store=storeEdge(),edge=await providerEdge({commerce:store.answer});
  let site:Installation|undefined;
  try {
    site=await installation(edge,eventSigner(),{commerce:true});
    let cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    for(const email of ['buyer@example.test','untracked@example.test'])await confirmedContact(site,edge,cookie,email,email);
    const destination='https://mango-test.myshopify.com/products/herbs?size=large&colour=green';
    const due=new Date(Date.now()+5000),campaign=await draftCampaign(site,cookie,'Herbs',['buyer@example.test'],due);
    await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{emailBody:`<p><a href="${destination.replaceAll('&','&amp;')}">Herbs</a></p>`,trackingEnabled:true}}),200);
    expect((await approve(site,cookie,campaign)).status).toBe('scheduled');
    expect((await dispatch(site,campaign.campaignId,due))[0].transport_disposition).toBe('accepted');
    const outbound=edge.sends.findLast(send=>send.to==='buyer@example.test'&&!send.body.subject.includes('Confirm'))!;
    const html=outbound.body.content.find((p:any)=>p.type==='text/html').value,text=outbound.body.content.find((p:any)=>p.type==='text/plain').value;
    const tracked=/https:\/\/mango\.example\.test\/l\/[^\s<>"')]+/.exec(text)![0];
    expect(html).toContain(tracked);expect(tracked).not.toContain('buyer');expect(text).not.toContain(destination);
    const click=async(agent:string)=>fetch(site!.local(tracked),{redirect:'manual',headers:{'User-Agent':agent}});
    let response=await click('Mozilla/5.0');
    expect(response.status).toBe(302);expect(response.headers.get('location')).toBe(destination);expect(response.headers.get('set-cookie')).toBeNull();expect(await response.text()).toBe('');
    expect((await fetch(site.local(tracked+'tampered'),{redirect:'manual'})).status).toBe(404);
    await click('Proofpoint security scanner');
    const paid=store.order('100','buyer@example.test',new Date(),{products:['1','2']});
    const post=async(node:Record<string,any>,topic='orders/paid',id=crypto.randomUUID(),signature=true,orderId=paid.id)=>{
      const raw=JSON.stringify(topic==='refunds/create'?{id:node.id,order_id:orderId}:{id:node.id});
      return site!.call('/webhooks/commerce/shopify',{method:'POST',raw,headers:{'Content-Type':'application/json','X-Shopify-Shop-Domain':'mango-test.myshopify.com','X-Shopify-Topic':topic,'X-Shopify-Webhook-Id':id,'X-Shopify-Event-Id':id,'X-Shopify-Hmac-Sha256':signature?createHmac('sha256','synthetic-store-webhook-key').update(raw).digest('base64'):'invalid'}});
    };
    expect((await post(paid,'orders/paid',crypto.randomUUID(),false)).status).toBe(401);
    const receipt=crypto.randomUUID();expect((await post(paid,'orders/paid',receipt)).status).toBe(204);expect((await post(paid,'orders/paid',receipt)).status).toBe(204);
    const report=async()=>json(await site!.call(`/api/campaigns/${campaign.campaignId}/results`,{cookie}),200);
    expect((await report()).attribution).toMatchObject({orders:1,revenueByCurrency:[{currency:'USD',grossAmountMinor:1000,reversedAmountMinor:0,amountMinor:1000}]});
    expect((await report()).engagement).toMatchObject({observedClicks:1,automatedRequestsRetainedButExcluded:1});
    // An older provider snapshot arriving later cannot regress accepted money.
    const stale={...paid,updatedAt:new Date(Date.parse(paid.updatedAt)-1000).toISOString(),displayFinancialStatus:'VOIDED',totalReceivedSet:bag('0')};
    store.orders.set(paid.id,stale);
    expect((await post(stale,'orders/updated')).status).toBe(204);
    expect((await report()).attribution.revenueByCurrency[0].amountMinor).toBe(1000);
    store.orders.set(paid.id,paid);
    const financialSnapshot=()=>Promise.all(['source_records','commerce_receipts','commerce_orders','commerce_refunds','source_activities','contacts','contact_email_addresses','contact_phones','contact_history'].map(table=>site!.rows(`SELECT * FROM ${table} ORDER BY rowid`)));
    const rejectCurrency=async(node:Record<string,any>,topic:string,orderId=paid.id)=>{
      const before=await financialSnapshot();
      const rejected=await post(node,topic,crypto.randomUUID(),true,orderId);
      expect(rejected.status,await rejected.clone().text()).toBe(422);
      expect(await financialSnapshot()).toEqual(before);
    };
    const refundCurrency=(refund:Record<string,any>,currency:string)=>{
      refund.totalRefundedSet=bag(refund.totalRefundedSet.shopMoney.amount,currency);
      for(const tx of refund.transactions.nodes)tx.amountSet=bag(tx.amountSet.shopMoney.amount,currency);
      for(const line of refund.refundLineItems.nodes)for(const field of ['subtotalSet','totalTaxSet'])line[field]=bag(line[field].shopMoney.amount,currency);
    };
    // A refund for an existing USD order cannot commit EUR money or a new buyer
    // identity. Source, receipt, activity and identity writes all roll back.
    const wrongRefund=store.refund(paid,'wrong-currency','1.00',new Date());
    refundCurrency(wrongRefund,'EUR');
    const originalCustomer=structuredClone(paid.customer);
    paid.customer.email='rejected-refund-buyer@example.test';
    await rejectCurrency(wrongRefund,'refunds/create');
    paid.customer=originalCustomer;refundCurrency(wrongRefund,'USD');
    wrongRefund.transactions.nodes[0].status='FAILURE';wrongRefund.updatedAt=new Date().toISOString();
    // Embedded refunds are validated before any part of their new order commits.
    const embedded=store.order('embedded-currency','embedded-currency@example.test',new Date(),{products:['99']});
    const embeddedRefund=store.refund(embedded,'embedded-currency-refund','1.00',new Date(),'PENDING');
    refundCurrency(embeddedRefund,'EUR');await rejectCurrency(embedded,'orders/paid');
    refundCurrency(embeddedRefund,'USD');
    // The parent has not been ingested: retain the genuine EUR refund first.
    // Its later USD order omits embedded refunds, exercising the durable orphan
    // check rather than relying on same-payload validation.
    const orphan=store.order('orphan-currency','orphan-currency@example.test',new Date(),{products:['99']});
    const orphanRefund=store.refund(orphan,'orphan-currency-refund','1.00',new Date());refundCurrency(orphanRefund,'EUR');
    expect((await post(orphanRefund,'refunds/create',crypto.randomUUID(),true,orphan.id)).status).toBe(204);
    orphan.refunds=[];orphan.customer.firstName='Uncommitted identity change';
    await rejectCurrency(orphan,'orders/paid');
    // Correct the provider snapshots before subsequent exhaustive native syncs.
    orphan.customer.firstName='Store';orphan.currencyCode='EUR';orphan.refunds=[orphanRefund];
    for(const field of ['totalPriceSet','currentTotalPriceSet','totalReceivedSet','totalRefundedSet'])orphan[field]=bag(orphan[field].shopMoney.amount,'EUR');
    for(const line of orphan.lineItems.nodes)for(const field of ['originalTotalSet','discountedTotalSet'])line[field]=bag(line[field].shopMoney.amount,'EUR');
    expect((await report()).attribution.revenueByCurrency[0].amountMinor).toBe(1000);
    const first=store.refund(paid,'r1','2.50',new Date());expect((await post(first,'refunds/create')).status).toBe(204);
    const second=store.refund(paid,'r2','1.25',new Date());expect((await post(second,'refunds/create')).status).toBe(204);
    expect((await post(first,'refunds/create')).status).toBe(204);
    expect((await report()).attribution.revenueByCurrency).toEqual([{currency:'USD',orders:1,grossAmountMinor:1000,reversedAmountMinor:375,amountMinor:625}]);
    const pending=store.refund(paid,'r3','9.00',new Date(),'PENDING');expect((await post(pending,'refunds/create')).status).toBe(204);
    expect((await report()).attribution.revenueByCurrency[0].amountMinor).toBe(625);
    paid.cancelledAt=new Date().toISOString();paid.updatedAt=paid.cancelledAt;paid.cancelReason='CUSTOMER';
    expect((await post(paid,'orders/cancelled')).status).toBe(204);
    expect((await report()).attribution).toMatchObject({orders:1,revenueByCurrency:[{grossAmountMinor:1000,reversedAmountMinor:1000,amountMinor:0}],events:[{providerOrderId:paid.id,cancellationReason:'CUSTOMER'}]});
    for(const [id,options] of [['unpaid',{status:'PENDING',received:'0'}],['void',{status:'VOIDED',received:'0'}],['test',{test:true}]] as const)expect((await post(store.order(id,'buyer@example.test',new Date(),options))).status).toBe(204);
    expect((await report()).attribution.orders).toBe(1);
    const part=store.order('partial','buyer@example.test',new Date(),{amount:'20.00',received:'4.00',status:'PARTIALLY_PAID'});expect((await post(part)).status).toBe(204);
    const yen=store.order('yen','buyer@example.test',new Date(),{amount:'123',currency:'JPY'});expect((await post(yen)).status).toBe(204);
    expect((await report()).attribution.revenueByCurrency).toEqual([{currency:'JPY',orders:1,grossAmountMinor:123,reversedAmountMinor:0,amountMinor:123},{currency:'USD',orders:2,grossAmountMinor:1400,reversedAmountMinor:1000,amountMinor:400}]);
    const old=store.order('before-click','buyer@example.test',new Date(Date.now()-86400000));old.updatedAt=new Date().toISOString();expect((await post(old)).status).toBe(204);expect((await report()).attribution.orders).toBe(3);
    const offDue=new Date(Date.now()+5000),off=await draftCampaign(site,cookie,'Original links',['untracked@example.test'],offDue);
    await json(await site.call(`/api/campaign-revisions/${off.revisionId}`,{method:'PATCH',cookie,body:{emailBody:`<p><a href="${destination.replaceAll('&','&amp;')}">Herbs</a></p>`,trackingEnabled:false}}),200);
    expect((await approve(site,cookie,off)).status).toBe('scheduled');await dispatch(site,off.campaignId,offDue);
    const original=edge.sends.findLast(send=>send.to==='untracked@example.test'&&!send.body.subject.includes('Confirm'))!;
    expect(original.body.content.find((p:any)=>p.type==='text/plain').value).toContain(destination);expect(JSON.stringify(original.body)).not.toContain('/l/');
    expect(await site.rows(`SELECT COUNT(*) n FROM tracked_links t JOIN recipient_steps r ON r.id=t.recipient_step_id WHERE r.campaign_id='${off.campaignId}'`)).toEqual([{n:0}]);
    // Product policy reads all products and reports overlapping reasons once per
    // contact; an order for another product does not exclude its buyer.
    await confirmedContact(site,edge,cookie,'other-product@example.test','Other buyer');
    expect((await post(store.order('other-product','other-product@example.test',new Date(),{products:['99']}))).status).toBe(204);
    paid.returns={nodes:[{id:'gid://shopify/Return/3001',status:'OPEN',createdAt:new Date().toISOString(),closedAt:null,
      returnLineItems:{nodes:[{__typename:'ReturnLineItem',id:'gid://shopify/ReturnLineItem/3002',quantity:1,refundedQuantity:0,refundableQuantity:1,fulfillmentLineItem:{lineItem:paid.lineItems.nodes[1]}}],pageInfo:{hasNextPage:false,endCursor:null}}}],pageInfo:{hasNextPage:false,endCursor:null}};
    paid.updatedAt=new Date().toISOString();expect((await post(paid,'orders/updated')).status).toBe(204);
    for(const sourceType of ['order','refund']) {
      const sync=await json(await site.call('/api/store/sync',{method:'POST',cookie,body:{sourceType}}),202);
      await expect.poll(async()=> (await site!.rows(`SELECT state FROM source_sync_runs WHERE id='${sync.runId}'`))[0]?.state,{timeout:60000}).toBe('completed');
    }
    const productFirstDue=new Date(Date.now()+60000);
    const productCampaign=await draftCampaign(site,cookie,'Product follow-up',['buyer@example.test','other-product@example.test'],productFirstDue);
    const inclusionRuleJson=JSON.stringify({version:1,operator:'any',predicates:[
      {sourceType:'contact',field:'email',comparator:'eq',value:'other-product@example.test'},
      {sourceType:'order',field:'activity.productId',comparator:'in',value:['gid://shopify/Product/1','gid://shopify/Product/2']},
    ]});
    await json(await site.call(`/api/campaign-revisions/${productCampaign.revisionId}`,{method:'PATCH',cookie,body:{inclusionRuleJson,steps:[productFirstDue,new Date(productFirstDue.getTime()+25*3600000)].map(scheduledAt=>({channel:'email',timezone:'Australia/Brisbane',scheduledAt:scheduledAt.toISOString(),sendByAt:new Date(scheduledAt.getTime()+3600000).toISOString(),whyThisTime:'Owner scheduled the product sequence'}))}}),200);
    const review=await json(await site.call(`/api/campaigns/${productCampaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:productCampaign.revisionId}}),200);
    expect(review).toMatchObject({candidateCount:2,eligibleCount:1});
    expect(review.exclusions).toEqual(expect.arrayContaining([
      {reason:'recent-product-purchase',count:1},{reason:'unresolved-refund',count:1},{reason:'unresolved-return',count:1},{reason:'frequency-window',count:1},
    ]));
    expect((await approve(site,cookie,productCampaign)).status).toBe('scheduled');
    // This other-product buyer receives step one. A genuine qualifying purchase
    // between steps must remove them from the frozen sequence's later delivery.
    const productFirstStep=String((await site.rows(`SELECT id FROM campaign_steps WHERE revision_id='${productCampaign.revisionId}' ORDER BY sequence`))[0].id);
    expect(await dispatch(site,productCampaign.campaignId,productFirstDue,productFirstStep)).toEqual([expect.objectContaining({email:'other-product@example.test',transport_disposition:'accepted'})]);
    expect((await post(store.order('after-approval','other-product@example.test',new Date(),{products:['2']}))).status).toBe(204);
    expect(edge.sends.filter(send=>send.to==='other-product@example.test'&&!send.body.subject.includes('Confirm'))).toHaveLength(1);
    // Historical, confirmed consent enters through the native CSV importer.
    // A fresh cart observation never manufactures consent or resets dormancy.
    const oldConsent=new Date(Date.now()-400*86400000).toISOString();
    const preview=await json(await site.call('/api/audience/import-preview',{method:'POST',cookie,body:{consent,
      files:[{name:'historical-readers.csv',preset:'csv-subscribed',csv:`Email Address,Email Marketing Status,OPTIN_TIME,CONFIRM_TIME\ndormant@example.test,subscribed,${oldConsent},${oldConsent}`}]} }),200);
    let {job}=await json(await site.call('/api/audience/imports',{method:'POST',cookie,body:{fingerprint:preview.fingerprint}}),200);
    while(['queued','applying'].includes(job.state))({job}=await json(await site.call(`/api/audience/imports/${job.id}/resume`,{method:'POST',cookie,body:{}}),200));
    expect(job.state).toBe('completed');
    const cart=JSON.stringify({id:'cart-500',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),email:'dormant@example.test',line_items:[{product_id:1,variant_id:1,quantity:1,price:'10.00'}]});
    const cartId=crypto.randomUUID();
    expect((await site.call('/webhooks/commerce/shopify',{method:'POST',raw:cart,headers:{'X-Shopify-Shop-Domain':'mango-test.myshopify.com','X-Shopify-Topic':'carts/update','X-Shopify-Webhook-Id':cartId,'X-Shopify-Event-Id':cartId,'X-Shopify-Hmac-Sha256':createHmac('sha256','synthetic-store-webhook-key').update(cart).digest('base64')}})).status).toBe(204);
    const dormant=await draftCampaign(site,cookie,'Dormancy',['dormant@example.test'],new Date(Date.now()+60000));
    const dormantReview=()=>site!.call(`/api/campaigns/${dormant.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:dormant.revisionId}}).then(response=>json(response,200));
    expect(await dormantReview()).toMatchObject({candidateCount:1,eligibleCount:0,exclusions:[{reason:'dormant',count:1}]});
    expect(await site.rows("SELECT email_status FROM contacts WHERE email='dormant@example.test'")).toEqual([{email_status:'subscribed'}]);
    expect((await post(store.order('dormant-purchase','dormant@example.test',new Date()))).status).toBe(204);
    expect(await dormantReview()).toMatchObject({candidateCount:1,eligibleCount:1});
    // A refund delivered before its order and replayed remains one independent
    // reversal when the order eventually joins the verified buyer's click.
    const late=store.order('late-order','buyer@example.test',new Date(),{amount:'5.00'});
    const earlyRefund=store.refund(late,'early-refund','8.00',new Date());
    expect((await post(earlyRefund,'refunds/create',crypto.randomUUID(),true,late.id)).status).toBe(204);
    expect((await post(late)).status).toBe(204);
    const lateEvent=(await report()).attribution.events.find((event:any)=>event.providerOrderId===late.id);
    expect(lateEvent).toMatchObject({grossAmountMinor:500,reversedAmountMinor:500,refunds:[{providerRefundId:earlyRefund.id,amountMinor:800}]});
    const malformed=store.order('invalid-money','buyer@example.test',new Date(),{currency:'JPY',amount:'1.25'});
    expect((await post(malformed)).status).toBe(422);
    expect(await site.rows(`SELECT count(*) n FROM commerce_orders WHERE provider_order_id='${malformed.id}'`)).toEqual([{n:0}]);
    expect(await site.rows(`SELECT count(*) n FROM source_records WHERE provider_source_id='${malformed.id}'`)).toEqual([{n:0}]);
    await confirmedContact(site,edge,cookie,'race@example.test','Race buyer');
    // Remove the deliberately rejected provider record from the edge's response
    // by correcting its invalid precision, then ingest that actual correction.
    malformed.totalPriceSet=bag('1','JPY');malformed.currentTotalPriceSet=bag('1','JPY');malformed.totalReceivedSet=bag('1','JPY');for(const line of malformed.lineItems.nodes){line.originalTotalSet=bag('1','JPY');line.discountedTotalSet=bag('1','JPY');}malformed.updatedAt=new Date().toISOString();
    expect((await post(malformed)).status).toBe(204);
    const repairedSync=await json(await site.call('/api/store/sync',{method:'POST',cookie,body:{sourceType:'order'}}),202);
    await expect.poll(async()=> (await site!.rows(`SELECT state FROM source_sync_runs WHERE id='${repairedSync.runId}'`))[0]?.state,{timeout:60000}).toBe('completed');
    await confirmedContact(site,edge,cookie,'approval-race@example.test','Approval race buyer');
    const originalApproval=await draftCampaign(site,cookie,'Future product sequence',['approval-race@example.test'],new Date(Date.now()+3600000));
    await json(await site.call(`/api/campaign-revisions/${originalApproval.revisionId}`,{method:'PATCH',cookie,body:{inclusionRuleJson:JSON.stringify({version:1,operator:'any',predicates:[
      {sourceType:'contact',field:'email',comparator:'eq',value:'approval-race@example.test'},
      {sourceType:'order',field:'activity.productId',comparator:'eq',value:'gid://shopify/Product/2'},
    ]})}}),200);
    expect((await approve(site,cookie,originalApproval)).status).toBe('scheduled');
    const replacement=await json(await site.call(`/api/campaigns/${originalApproval.campaignId}/edit-schedule`,{method:'POST',cookie,body:{}}),201);
    expect(replacement.kind).toBe('replacement');
    await json(await site.call(`/api/campaign-revisions/${replacement.revisionId}`,{method:'PATCH',cookie,body:{emailSubject:'Changed product sequence'}}),200);
    const approvalSnapshot=()=>Promise.all([
      site!.rows(`SELECT active_revision_id,state FROM campaigns WHERE id='${originalApproval.campaignId}'`),
      site!.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${originalApproval.campaignId}' ORDER BY rowid`),
      site!.rows(`SELECT * FROM recipient_steps WHERE campaign_id='${originalApproval.campaignId}' ORDER BY id`),
      site!.rows(`SELECT * FROM step_dispatches WHERE revision_id='${originalApproval.revisionId}' ORDER BY step_id`),
    ]);
    const originalState=await approvalSnapshot();
    await site.control('/_golive/barrier',{action:'arm',point:'approval',identity:replacement.revisionId});
    const replacing=site.call(`/api/campaigns/${originalApproval.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:replacement.revisionId,idempotencyKey:`approve-${replacement.revisionId}`}});
    await expect.poll(async()=> (await site!.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    try {
      expect((await post(store.order('approval-race','approval-race@example.test',new Date(),{products:['2']}))).status).toBe(204);
    } finally {await site.control('/_golive/barrier',{action:'release'});}
    expect((await replacing).status).toBe(409);
    expect(await approvalSnapshot()).toEqual(originalState);
    expect(await site.rows(`SELECT count(*) n FROM campaign_approval_requests WHERE revision_id='${replacement.revisionId}'`)).toEqual([{n:0}]);
    expect(await site.rows(`SELECT count(*) n FROM recipient_steps WHERE revision_id='${replacement.revisionId}'`)).toEqual([{n:0}]);
    const raceDue=new Date(Date.now()+10000),race=await draftCampaign(site,cookie,'Late purchase',['race@example.test'],raceDue);
    await json(await site.call(`/api/campaign-revisions/${race.revisionId}`,{method:'PATCH',cookie,body:{inclusionRuleJson:JSON.stringify({version:1,operator:'any',predicates:[
      {sourceType:'contact',field:'email',comparator:'eq',value:'race@example.test'},
      {sourceType:'order',field:'activity.productId',comparator:'eq',value:'gid://shopify/Product/1'},
    ]})}}),200);
    expect((await approve(site,cookie,race)).status).toBe('scheduled');
    await site.control('/_golive/barrier',{action:'arm',point:'handoff',identity:createHash('sha256').update(`${site.runtime.token}:race@example.test`).digest('hex')});
    while(Date.now()<=raceDue.getTime())await new Promise(resolve=>setTimeout(resolve,100));
    await site.control('/_golive/cron');
    await expect.poll(async()=> (await site!.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    try {
      // This source commit occurs after finalEligibility returned, before the
      // real UPDATE that would authorize the provider call.
      expect((await post(store.order('handoff-race','race@example.test',new Date()))).status).toBe(204);
    } finally {await site.control('/_golive/barrier',{action:'release'});}
    await expect.poll(async()=> (await site!.rows(`SELECT last_error_code FROM recipient_steps WHERE campaign_id='${race.campaignId}' AND destination='race@example.test'`))[0]?.last_error_code,{timeout:60000}).toBe('approval-or-sender-authority-changed');
    expect(edge.sends.filter(send=>send.to==='race@example.test'&&!send.body.subject.includes('Confirm'))).toHaveLength(0);
    // Cross the unchanged frequency policy using only the fixture's wall clock.
    // Both campaign sends still pass through production Cron and Queue.
    const advanced=await site.control('/_golive/clock',{advanceMs:25*3600000});
    cookie=await site.open();await site.control('/_golive/sender-evidence');
    await site.control('/_golive/cron');
    await expect.poll(async()=>await site!.rows(`SELECT r.transport_disposition,r.skip_reason FROM recipient_steps r JOIN campaign_steps s ON s.id=r.step_id WHERE r.campaign_id='${productCampaign.campaignId}' ORDER BY s.sequence`),{timeout:60000}).toEqual([
      {transport_disposition:'accepted',skip_reason:null},{transport_disposition:'skipped',skip_reason:'recent-product-purchase'},
    ]);
    expect(edge.sends.filter(send=>send.to==='other-product@example.test'&&!send.body.subject.includes('Confirm'))).toHaveLength(1);
    const secondCampaign=await draftCampaign(site,cookie,'Later herbs',['buyer@example.test'],new Date(advanced.now+60000));
    await json(await site.call(`/api/campaign-revisions/${secondCampaign.revisionId}`,{method:'PATCH',cookie,body:{emailBody:`<p><a href="${destination.replaceAll('&','&amp;')}">Herbs again</a></p>`,trackingEnabled:true}}),200);
    expect((await approve(site,cookie,secondCampaign)).status).toBe('scheduled');
    await site.control('/_golive/clock',{advanceMs:60001});await site.control('/_golive/cron');
    await expect.poll(async()=> (await site!.rows(`SELECT transport_disposition FROM recipient_steps WHERE campaign_id='${secondCampaign.campaignId}'`))[0]?.transport_disposition,{timeout:60000}).toBe('accepted');
    const newer=edge.sends.findLast(send=>send.to==='buyer@example.test')!;
    const newerLink=/https:\/\/mango\.example\.test\/l\/[^\s<>"')]+/.exec(newer.body.content.find((p:any)=>p.type==='text/plain').value)![0];
    expect(newerLink).not.toBe(tracked);
    const newerRecipient=(await site.rows(`SELECT id FROM recipient_steps WHERE campaign_id='${secondCampaign.campaignId}'`))[0].id;
    await site.control('/_golive/barrier',{action:'arm',point:'click-index',identity:newerRecipient});
    const delayedClick=fetch(site.local(newerLink),{redirect:'manual',headers:{'User-Agent':'Mozilla/5.0'}});
    await expect.poll(async()=> (await site!.control('/_golive/barrier',{action:'status'}))?.waiting,{timeout:60000}).toBe(true);
    let latest:Record<string,any>;
    try {
      // The human request has occurred, but its real D1 insert is delayed until
      // after the order commits. Late indexing must converge to the same winner.
      const purchased=await site.control('/_golive/clock',{advanceMs:1});
      latest=store.order('latest-wins','buyer@example.test',new Date(purchased.now),{amount:'7.00'});
      expect((await post(latest)).status).toBe(204);
      expect((await report()).attribution.events.some((event:any)=>event.providerOrderId===latest.id)).toBe(true);
    } finally {await site.control('/_golive/barrier',{action:'release'});}
    expect((await delayedClick).status).toBe(302);
    await click('Proofpoint security scanner');
    const newerResult=await json(await site.call(`/api/campaigns/${secondCampaign.campaignId}/results`,{cookie}),200);
    expect(newerResult.attribution).toMatchObject({orders:1,revenueByCurrency:[{currency:'USD',grossAmountMinor:700,amountMinor:700}],events:[{providerOrderId:latest.id}]});
    expect((await report()).attribution.events.some((event:any)=>event.providerOrderId===latest.id)).toBe(false);
    const buyerId=String((await site.rows("SELECT id FROM contacts WHERE email='buyer@example.test'"))[0].id);
    expect((await site.call(`/api/contacts/${buyerId}`,{method:'DELETE'})).status).toBe(401);
    const deletion=await site.call(`/api/contacts/${buyerId}`,{method:'DELETE',cookie});
    expect([200,202]).toContain(deletion.status);
    let erased=await deletion.json() as {receipt:{reference:string;state:string}};
    const erasureDeadline=Date.now()+60000;
    const erasureRevision=async()=>Number((await site!.rows(`SELECT revision FROM audience_erasures WHERE reference='${erased.receipt.reference}'`))[0].revision);
    let revision=await erasureRevision();
    while(erased.receipt.state==='pending') {
      expect(Date.now()).toBeLessThan(erasureDeadline);
      const continuation=await site.call(`/api/audience/erasures/${erased.receipt.reference}/resume`,{method:'POST',cookie,body:{}});
      expect([200,202]).toContain(continuation.status);erased=await continuation.json() as typeof erased;
      const next=await erasureRevision();
      expect(next).toBeGreaterThanOrEqual(revision);
      if(erased.receipt.state==='pending')expect(next).toBeGreaterThan(revision);
      revision=next;
    }
    expect(erased.receipt.state).toBe('complete');
    const completed=await json(await site.call(`/api/audience/erasures/${erased.receipt.reference}/resume`,{method:'POST',cookie,body:{}}),200);
    expect(completed.receipt).toEqual(erased.receipt);
    expect(await erasureRevision()).toBe(revision);
    expect(await site.rows(`SELECT count(*) n FROM contacts WHERE id='${buyerId}'`)).toEqual([{n:0}]);
    expect(await site.rows(`SELECT count(*) n FROM commerce_orders WHERE contact_id='${buyerId}'`)).toEqual([{n:0}]);
    expect(await site.rows(`SELECT count(*) n FROM commerce_refunds WHERE contact_id='${buyerId}'`)).toEqual([{n:0}]);
    expect((await report()).attribution.orders).toBe(0);
    expect((await click('Mozilla/5.0')).status).toBe(404);
    expect(edge.unexpected).toEqual([]);
  } finally {await site?.runtime.close();await edge.close();}
});

// @ts-nocheck -- Native Worker/D1 integration; only Shopify and mail network edges are doubled.
import {expect,test} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash,createHmac} from 'node:crypto';
import {shopifyRuntime,secret} from './runtime.mjs';
import {portableHash} from '../../src/core/features/audience/portable-hashes';
import {seedShopify,page,order,customer,product,variant,inventory,id,at,line,bag} from './fixtures';

const digest=(raw:string)=>createHash('sha256').update(raw).digest('hex');
async function sync(f,session,type){
  const queued=await f.call('/api/store/sync',{method:'POST',cookie:session,body:{sourceType:type}});
  expect(queued.status,await queued.clone().text()).toBe(202);
  const outcomes=await (await f.call('/test/run-queue',{method:'POST'})).json();
  expect(outcomes).toEqual([expect.objectContaining({command:expect.objectContaining({kind:'source.sync',payload:expect.objectContaining({sourceType:type})}),attempts:1})]);
  return outcomes;
}
async function webhook(f,body,options={}){
  const raw=typeof body==='string'?body:JSON.stringify(body);
  return f.call('/webhooks/commerce/shopify',{method:'POST',raw,headers:{'X-Shopify-Hmac-Sha256':createHmac('sha256',secret).update(raw).digest('base64'),'X-Shopify-Shop-Domain':'mango-shop.myshopify.com','X-Shopify-Topic':'carts/update','X-Shopify-Webhook-Id':'delivery-1','X-Shopify-Event-Id':'event-1',...options}});
}
function observation(name='product_viewed',eventId=crypto.randomUUID()){
  return {version:1,channel:'test-channel',id:eventId,name,timestamp:new Date(Date.now()-1000).toISOString(),privacy:{analytics:true,marketing:true,saleOfData:true},lines:[{productId:id('Product',21),variantId:id('ProductVariant',31),quantity:1}]};
}
async function proxy(f,body,context={}){
  const raw=JSON.stringify(body),params=new URLSearchParams({shop:'mango-shop.myshopify.com',logged_in_customer_id:'11',path_prefix:'/apps/mango-signals',timestamp:String(Math.floor(Date.now()/1000)),body_digest:digest(raw),event_id:body.id,...context});
  const canonical=[...params.keys()].map(key=>`${key}=${params.getAll(key).join(',')}`).sort().join('');
  params.set('signature',createHmac('sha256',secret).update(canonical).digest('hex'));
  return f.call(`/webhooks/commerce/shopify/observations?${params}`,{method:'POST',raw});
}

test('[STORE-004] native authenticated sync imports complete Shopify records and retains original purchase time through nested-page failures and retry',async()=>{
  const f=await shopifyRuntime();
  try{
    await seedShopify(f.fixture);const session=await f.owner();
    await f.fixture('products:',{data:{products:page([product()],'products-next')}});
    await f.fixture('products:products-next',{data:{products:page([product(22)])}});
    await f.fixture('inventoryItems:',{data:{inventoryItems:page([{...inventory,inventoryLevels:page(inventory.inventoryLevels.nodes,'levels-next')}])}});
    await f.fixture(`${inventory.id}:levels-next`,{data:{node:{inventoryLevels:page([{...inventory.inventoryLevels.nodes[0],id:'gid://shopify/InventoryLevel/101?inventory_item_id=41',location:{id:id('Location',2),name:'Sydney',isActive:true}}])}}});
    expect((await f.call('/api/store/sync',{method:'POST',body:{sourceType:'customer'}})).status).toBe(401);
    for(const type of ['customer','product','variant','inventory','order','refund'])expect(await sync(f,session,type)).toEqual([expect.objectContaining({ack:true})]);
    const rows=(await f.db.prepare('SELECT source_type,payload,occurred_at,contact_id FROM source_records ORDER BY source_type').all()).results;
    const imported=type=>rows.find(row=>row.source_type===type);
    expect(JSON.parse(imported('inventory').payload).levels).toHaveLength(2);
    expect(JSON.parse(imported('inventory').payload).levels[0].quantities).toContainEqual({name:'available',quantity:7});
    expect(JSON.parse(imported('order').payload)).toMatchObject({lines:[{productId:id('Product',21)},{productId:id('Product',22)}],returns:[{lines:[{line:{productId:id('Product',21)}}]}],received:{shop:{amount:'48.00',currency:'AUD'}},refunds:[{financialState:'SUCCESS',transactions:[{status:'SUCCESS'}]}]});
    expect(imported('order').occurred_at).toBe(Date.parse(at));
    await f.fixture(`node:${order.id}`,{data:{node:order}});
    expect((await webhook(f,{id:51,admin_graphql_api_id:order.id},{'X-Shopify-Topic':'orders/updated','X-Shopify-Webhook-Id':'admin-order','X-Shopify-Event-Id':'admin-order'})).status).toBe(204);
    expect(await f.db.prepare("SELECT count(*) n FROM source_records WHERE source_type='order'").first()).toEqual({n:1});
    const status=await (await f.call('/api/store',{cookie:session})).json();
    expect(status.sourceSyncs.filter(row=>['customer','product','variant','inventory','order','refund'].includes(row.sourceType)).every(row=>row.lastSuccessfulAt&&!row.lastError)).toBe(true);
    expect((await f.db.prepare("SELECT email_status,sms_status FROM contacts WHERE id=?").bind(imported('customer').contact_id).first())).toMatchObject({email_status:'non-subscribed',sms_status:'non-subscribed'});
    expect((await f.db.prepare("SELECT product_id FROM source_activities WHERE kind='order' ORDER BY product_id").all()).results).toEqual([{product_id:id('Product',21)},{product_id:id('Product',22)}]);
    const updated={...order,updatedAt:'2026-10-02T10:00:00.000Z',lineItems:page([line()],'more')};
    await f.fixture('orders:',{data:{orders:page([updated])}});
    await f.fixture(`${order.id}:more`,{errors:[{message:'access denied'}],data:{node:{lineItems:page([])}}});
    const failedDelivery=await sync(f,session,'order');
    expect(failedDelivery).toEqual([expect.objectContaining({ack:false})]);
    const failed=await f.db.prepare("SELECT last_successful_at,last_error FROM source_syncs WHERE source_type='order'").first();
    expect(failed.last_successful_at).not.toBeNull();expect(failed.last_error).toContain('GraphQL');
    const failedStatus=await (await f.call('/api/store',{cookie:session})).json();
    expect(failedStatus.syncRuns.find(run=>run.sourceType==='order')).toMatchObject({state:'failed',lastError:expect.stringContaining('GraphQL')});
    await f.fixture(`${order.id}:more`,{data:{node:{lineItems:page([line(62,22,32)])}}});
    const retried=await (await f.call('/test/run-queue',{method:'POST'})).json();
    expect(retried).toEqual([expect.objectContaining({ack:true,id:failedDelivery[0].id,command:failedDelivery[0].command,attempts:failedDelivery[0].attempts+1})]);
    expect(await f.db.prepare("SELECT count(*) n,min(occurred_at) t FROM source_records WHERE source_type='order'").first()).toEqual({n:1,t:Date.parse(at)});
    expect(await f.db.prepare("SELECT exhaustive FROM commerce_source_coverage WHERE source_type='order'").first()).toEqual({exhaustive:1});
    // Ten individually bounded Shopify child requests span longer than the
    // original lease. Progress must renew the actual D1 owner, not restart pages.
    const longOrder={...updated,totalPriceSet:bag('264.00'),currentTotalPriceSet:bag('252.00'),totalReceivedSet:bag('264.00'),lineItems:page([line()],'long-0')};
    await f.fixture('orders:',{data:{orders:page([longOrder])}});
    for(let index=0;index<10;index++)await f.fixture(`${order.id}:long-${index}`,{data:{node:{lineItems:page([line(1000+index,22,32)],index===9?undefined:`long-${index+1}`)}}},13000);
    expect(await sync(f,session,'order')).toEqual([expect.objectContaining({ack:true})]);
    const timed=(await f.db.prepare("SELECT * FROM test_shopify_http WHERE request_key LIKE '%:long-%' ORDER BY rowid").all()).results;
    expect(timed).toHaveLength(10);
    expect(timed.every(call=>call.ended_at<call.lease_expires_at)).toBe(true);
    expect(timed.at(-1).ended_at).toBeGreaterThan(timed[0].lease_expires_at);
    const hydrated=JSON.parse((await f.db.prepare("SELECT payload FROM source_records WHERE source_type='order' AND provider_source_id=?").bind(order.id).first()).payload);
    expect(hydrated.lines).toHaveLength(11);
    await f.fixture('products:',{data:{products:{pageInfo:{hasNextPage:false,endCursor:null}}}});
    expect(await sync(f,session,'product')).toEqual([expect.objectContaining({ack:false})]);
    // A rejected financial fact or conflicting receipt cannot import even the
    // buyer's identity or claim an existing portable opt-out before rollback.
    const buyer={...customer,id:id('Customer',111),email:'new-buyer@example.test',phone:'+61400000111',firstName:'New',lastName:'Buyer'};
    const nextOrder={...order,id:id('Order',151),customer:buyer,refunds:[],returns:page([])};
    const body={id:151,admin_graphql_api_id:nextOrder.id};
    const delivery={'X-Shopify-Topic':'orders/create','X-Shopify-Webhook-Id':'atomic-order','X-Shopify-Event-Id':'atomic-order'};
    await f.db.prepare("INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at) VALUES(?,?,'email','imported-opt-out',?,?,?)").bind('portable-new-buyer',portableHash(buyer.email),Date.parse(at),Date.parse(at),Date.parse(at)).run();
    const identities=async()=>Promise.all(['contacts','contact_email_addresses','contact_phones','audience_portable_hashes','surviving_opt_outs'].map(async table=>(await f.db.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all()).results));
    const pristine=await identities();
    await f.fixture(`node:${nextOrder.id}`,{data:{node:{...nextOrder,totalPriceSet:{shopMoney:{amount:'1.5',currencyCode:'JPY'},presentmentMoney:{amount:'1.5',currencyCode:'JPY'}}}}});
    expect((await webhook(f,body,delivery)).status).toBe(422);
    expect(await identities()).toEqual(pristine);
    await f.fixture(`node:${nextOrder.id}`,{data:{node:nextOrder}});
    await f.db.prepare("CREATE TRIGGER test_order_activity_failure BEFORE INSERT ON source_activities WHEN NEW.kind='order' BEGIN SELECT RAISE(ABORT,'injected source transaction failure'); END").run();
    expect((await webhook(f,body,delivery)).status).toBe(422);
    expect(await identities()).toEqual(pristine);
    expect(await f.db.prepare('SELECT count(*) n FROM source_records WHERE provider_source_id=?').bind(nextOrder.id).first()).toEqual({n:0});
    await f.db.prepare('DROP TRIGGER test_order_activity_failure').run();
    expect((await webhook(f,body,delivery)).status).toBe(204);
    expect((await webhook(f,body,delivery)).status).toBe(204);
    expect(await f.db.prepare('SELECT email_status,sms_status FROM contacts WHERE email=?').bind(buyer.email).first()).toEqual({email_status:'unsubscribed',sms_status:'non-subscribed'});
    const accepted=await identities();
    const collision={...nextOrder,id:id('Order',152),customer:{...buyer,id:id('Customer',112),email:'collision-buyer@example.test',phone:'+61400000112'}};
    await f.fixture(`node:${collision.id}`,{data:{node:collision}});
    expect((await webhook(f,{id:152,admin_graphql_api_id:collision.id},delivery)).status).toBe(422);
    expect(await identities()).toEqual(accepted);
    expect(await f.db.prepare('SELECT count(*) n FROM source_records WHERE provider_source_id=?').bind(collision.id).first()).toEqual({n:0});
    const access={shop:{myshopifyDomain:'mango-shop.myshopify.com',storefrontUrl:'https://store.example.test'},currentAppInstallation:{accessScopes:[{handle:'read_orders'}]}};
    await f.fixture('MangoAccess',{data:access});
    const denied=await f.call('/api/store/sync',{method:'POST',cookie:session,body:{sourceType:'order'}});expect(denied.status).toBe(409);
  }finally{await f.close();}
});

test('signed carts preserve string identity, multiple lines and ordering; conflicting delivery, tenant and topics cannot mutate source facts',async()=>{
  const f=await shopifyRuntime();
  try{
    await seedShopify(f.fixture);const session=await f.owner();await sync(f,session,'cart');
    const cart={id:'cart-capability?key=secret',token:'do-not-retain',created_at:at,updated_at:'2026-10-03T10:00:00.000Z',line_items:[{product_id:21,variant_id:31,quantity:2,price:'12.00'},{product_id:22,variant_id:32,quantity:1,price:'9.00'}],customer:{email:'forged@example.test'},abandoned_checkout_url:'https://shop.example/recover/secret'};
    expect((await webhook(f,cart)).status).toBe(204);expect((await webhook(f,cart)).status).toBe(204);
    const stored=await f.db.prepare("SELECT payload,contact_id,occurred_at FROM source_records WHERE source_type='cart'").first();
    expect(stored.contact_id).toBeNull();expect(stored.occurred_at).toBe(Date.parse(at));expect(JSON.parse(stored.payload).lines).toHaveLength(2);
    expect(stored.payload).not.toMatch(/secret|forged|token|recovery/);
    expect((await webhook(f,{...cart,line_items:[]},{'X-Shopify-Event-Id':'different-event'})).status).toBe(422);
    expect((await webhook(f,cart,{'X-Shopify-Shop-Domain':'other-shop.myshopify.com'})).status).toBe(401);
    expect((await webhook(f,cart,{'X-Shopify-Topic':'carts/delete'})).status).toBe(401);
    expect((await webhook(f,{...cart,updated_at:at,line_items:[]},{'X-Shopify-Webhook-Id':'older','X-Shopify-Event-Id':'older'})).status).toBe(204);
    expect((await f.db.prepare("SELECT payload FROM source_records WHERE source_type='cart'").first()).payload).toBe(stored.payload);
    // An identifier outside IEEE754's exact range is never rounded before GID conversion.
    const raw=JSON.stringify({...cart,id:'other-cart',line_items:[{product_id:'9007199254740993',variant_id:'9007199254740995',quantity:1}]}).replace('"9007199254740993"','9007199254740993').replace('"9007199254740995"','9007199254740995');
    expect((await webhook(f,raw,{'X-Shopify-Webhook-Id':'large','X-Shopify-Event-Id':'large'})).status).toBe(204);
    const payloads=JSON.stringify((await f.db.prepare("SELECT payload FROM source_records WHERE source_type='cart'").all()).results);
    expect(payloads).toContain('gid://shopify/Product/9007199254740993');
  }finally{await f.close();}
});

test('signed pixel collector binds actual proxy customer, rejects forged identity/catalog/purposes/replays and keeps quiet replay and withdrawal truthful',async()=>{
  const f=await shopifyRuntime();
  try{
    await seedShopify(f.fixture);const session=await f.owner();
    for(const type of ['customer','product','variant','browsing-event'])expect(await sync(f,session,type)).toEqual([expect.objectContaining({ack:true})]);
    expect(await f.db.prepare("SELECT last_observation_at FROM commerce_channels").first()).toEqual({last_observation_at:null});
    const fault=observation();
    await f.db.prepare("CREATE TRIGGER test_activity_failure BEFORE INSERT ON source_activities WHEN NEW.kind='browsing-event' BEGIN SELECT RAISE(ABORT,'test injected native write failure'); END").run();
    expect((await proxy(f,fault)).status).toBe(422);
    expect(await f.db.prepare("SELECT count(*) n FROM source_records WHERE source_type='browsing-event'").first()).toEqual({n:0});
    // The durable inbox survives a projection fault; the failed source/receipt
    // transaction rolls back. A repeat converges without a second observation.
    await f.db.prepare('DROP TRIGGER test_activity_failure').run();
    expect((await proxy(f,fault)).status).toBe(204);
    expect(await f.db.prepare("SELECT count(*) n FROM commerce_observations WHERE event_id=?").bind(fault.id).first()).toEqual({n:1});
    const event=observation();expect((await proxy(f,event)).status).toBe(204);expect((await proxy(f,event)).status).toBe(204);
    const contact=await f.db.prepare("SELECT contact_id FROM source_records WHERE source_type='customer'").first();
    expect(await f.db.prepare("SELECT count(*) n,contact_id FROM source_records WHERE source_type='browsing-event'").first()).toEqual({n:2,contact_id:contact.contact_id});
    expect((await proxy(f,event,{logged_in_customer_id:''})).status).toBe(422);
    expect((await proxy(f,{...event,name:'privacy_revoked',lines:[],privacy:{analytics:false,marketing:false,saleOfData:false}})).status).toBe(422);
    expect(await f.db.prepare("SELECT count(*) n FROM source_activities WHERE kind='browsing-event'").first()).toEqual({n:2});
    expect((await proxy(f,{...observation(),customerId:'999'})).status).toBe(422);
    expect((await proxy(f,{...observation(),privacy:{analytics:false,marketing:true,saleOfData:true}})).status).toBe(422);
    expect((await proxy(f,{...observation(),lines:[{productId:id('Product',22),variantId:id('ProductVariant',31),quantity:1}]})).status).toBe(422);
    expect((await proxy(f,observation(),{shop:'other.myshopify.com'})).status).toBe(422);
    expect((await proxy(f,observation(),{body_digest:'wrong'})).status).toBe(422);
    expect((await proxy(f,observation(),{timestamp:'1'})).status).toBe(422);
    const anon=observation();expect((await proxy(f,anon,{logged_in_customer_id:''})).status).toBe(204);
    expect(await f.db.prepare("SELECT contact_id FROM source_records WHERE provider_source_id=?").bind(`shopify-observation:${anon.id}`).first()).toEqual({contact_id:null});
    // Execute the shipped producer against the SDK/network edge. It must send
    // only the actual added line and no client ID, customer ID or cart token.
    const callbacks=new Map();let consentChanged;const produced=[];
    const source=await readFile('extensions/mango-pixel/src/index.js','utf8');
    const run=new Function('register','fetch',source.replace("import {register} from '@shopify/web-pixels-extension';",''));
    run(callback=>callback({analytics:{subscribe(name,fn){callbacks.set(name,fn);}},init:{data:{shop:{myshopifyDomain:'mango-shop.myshopify.com',storefrontUrl:'https://store.example.test'},customer:{id:'999'}},customerPrivacy:{analyticsProcessingAllowed:true,marketingAllowed:true,saleOfDataAllowed:true}},customerPrivacy:{subscribe(_name,fn){consentChanged=fn;}},settings:{channel:'test-channel',proxyPath:'/apps/mango-signals'}}),async(url,request)=>{
      const body=JSON.parse(request.body);const response=await proxy(f,body);produced.push({body,url:String(url),status:response.status});return response;
    });
    callbacks.get('product_added_to_cart')({id:'producer-add',name:'product_added_to_cart',timestamp:new Date().toISOString(),clientId:'not-a-customer',data:{cartLine:{quantity:2,merchandise:{id:id('ProductVariant',31),product:{id:id('Product',21)}}}}});
    await expect.poll(()=>produced.length).toBe(1);
    expect(produced[0].status).toBe(204);
    expect(new URL(produced[0].url).origin).toBe('https://store.example.test');
    expect(produced[0].body.lines).toEqual([{productId:id('Product',21),variantId:id('ProductVariant',31),quantity:2}]);
    expect(JSON.stringify(produced[0].body)).not.toMatch(/customer|clientId|token/);
    const cart={...observation('cart_viewed'),lines:[{productId:id('Product',21),variantId:id('ProductVariant',31),quantity:1},{productId:id('Product',22),variantId:id('ProductVariant',32),quantity:2}]};
    expect((await proxy(f,cart)).status).toBe(204);
    expect((await f.db.prepare("SELECT product_id FROM source_activities WHERE kind='cart' AND source_record_id=(SELECT id FROM source_records WHERE provider_source_id=?) ORDER BY product_id").bind(`shopify-observation:${cart.id}`).all()).results).toHaveLength(2);
    await f.db.batch(Array.from({length:101},(_,i)=>f.db.prepare("INSERT INTO commerce_observations(channel,event_id,source_type,source_id,contact_id,occurred_at,provider_updated_at,received_at,payload,digest) SELECT channel,event_id||?,source_type,source_id||?,contact_id,occurred_at,provider_updated_at,received_at,payload,digest FROM commerce_observations WHERE event_id=?").bind(`-page-${i}`,`-page-${i}`,event.id)));
    const range=await (await f.call('/api/store/observations?sourceType=browsing-event',{cookie:session})).json();
    expect(range.nextCursor).toBeTruthy();expect(range.coverage.exhaustive).toBe(false);
    const late=observation();expect((await proxy(f,late)).status).toBe(204);
    const rest=await (await f.call(`/api/store/observations?sourceType=browsing-event&cursor=${encodeURIComponent(range.nextCursor)}`,{cookie:session})).json();
    expect(rest.coverage.complete).toBe(true);expect(rest.coverage.through).toBe(range.coverage.through);
    expect(rest.records.some(record=>record.sourceId===`shopify-observation:${late.id}`)).toBe(false);
    // Health/sync never expires owner history, and a pinned cursor still reads it.
    const ancient=Date.parse('2000-01-01T00:00:00.000Z');
    await f.db.prepare('UPDATE commerce_channels SET coverage_start=?,retention_start=?').bind(ancient,ancient).run();
    await f.db.prepare('UPDATE commerce_observations SET received_at=?,occurred_at=?,provider_updated_at=? WHERE event_id=?').bind(ancient,ancient,ancient,`${event.id}-page-100`).run();
    const beforeExpiry=await (await f.call('/api/store/observations?sourceType=browsing-event',{cookie:session})).json();
    expect(beforeExpiry.nextCursor).toBeTruthy();
    expect(await sync(f,session,'browsing-event')).toEqual([expect.objectContaining({ack:true})]);
    expect(await f.db.prepare('SELECT count(*) n FROM commerce_observations WHERE event_id=?').bind(`${event.id}-page-100`).first()).toEqual({n:1});
    const retainedResponse=await f.call(`/api/store/observations?sourceType=browsing-event&cursor=${encodeURIComponent(beforeExpiry.nextCursor)}`,{cookie:session});
    expect(retainedResponse.status).toBe(200);
    const retained=await retainedResponse.json();
    expect(retained.coverage.from).toBe(ancient);
    expect(retained.records).toContainEqual(expect.objectContaining({sourceId:`shopify-observation:${event.id}-page-100`,occurredAt:new Date(ancient).toISOString()}));
    const revoked={...observation('privacy_revoked'),timestamp:new Date().toISOString(),privacy:{analytics:false,marketing:false,saleOfData:false},lines:[]};
    expect((await proxy(f,revoked)).status).toBe(204);
    expect(await f.db.prepare("SELECT count(*) n FROM source_activities WHERE contact_id=? AND kind IN ('cart','browsing-event')").bind(contact.contact_id).first()).toEqual({n:0});
    expect((await proxy(f,event)).status).toBe(422);
    expect(await sync(f,session,'browsing-event')).toEqual([expect.objectContaining({ack:true})]);
    // Fresh identifying history remains after explicit withdrawal, until the
    // operator erases this contact. Another person's history must survive.
    const erasable={...observation(),timestamp:new Date().toISOString()};
    expect((await proxy(f,erasable)).status).toBe(204);
    await f.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('unrelated-history','unrelated@example.test','Unrelated','non-subscribed','non-subscribed',1,1)").run();
    await f.db.prepare("INSERT INTO commerce_observations(channel,event_id,source_type,source_id,contact_id,occurred_at,provider_updated_at,received_at,payload,digest) SELECT channel,'unrelated-event',source_type,'unrelated-source','unrelated-history',?,?,?,payload,digest FROM commerce_observations WHERE event_id=?").bind(ancient,ancient,ancient,erasable.id).run();
    await f.db.prepare('UPDATE commerce_observations SET received_at=?,occurred_at=?,provider_updated_at=? WHERE event_id=?').bind(ancient,ancient,ancient,erasable.id).run();
    await f.db.batch(Array.from({length:101},(_,i)=>f.db.prepare("INSERT INTO commerce_observations(channel,event_id,source_type,source_id,contact_id,occurred_at,provider_updated_at,received_at,payload,digest) SELECT channel,event_id||?,source_type,source_id||?,contact_id,occurred_at,provider_updated_at,received_at,payload,digest FROM commerce_observations WHERE event_id=?").bind(`-erase-${i}`,`-erase-${i}`,erasable.id)));
    const beforeErasure=await (await f.call('/api/store/observations?sourceType=browsing-event',{cookie:session})).json();
    expect(beforeErasure.nextCursor).toBeTruthy();
    const unrelatedBefore=await f.db.prepare("SELECT * FROM commerce_observations WHERE contact_id='unrelated-history'").first();
    await f.call('/test/erasure-race/arm',{method:'POST'});
    const erased=await f.call(`/api/contacts/${contact.contact_id}`,{method:'DELETE',cookie:session});
    expect(erased.status,await erased.clone().text()).toBe(202);
    const receipt=(await erased.json()).receipt;
    // Hold the queued continuation after reading its revision, before its native
    // batch. HTTP then exercises both a real SQL failure and a winning commit.
    await f.call('/test/erasure-race/arrived',{method:'POST'});
    const heldRevision=(await f.db.prepare('SELECT revision FROM audience_erasures WHERE reference=?').bind(receipt.reference).first()).revision;
    const resume=()=>f.call(`/api/audience/erasures/${receipt.reference}/resume`,{method:'POST',cookie:session});
    const sessions=(await f.db.prepare('SELECT token_hash,expires_at FROM oa_sessions').all()).results;
    await f.call('/test/erasure-race/expire-authority',{method:'POST'});
    expect((await resume()).status).toBe(500);
    expect(await f.db.prepare('SELECT revision FROM audience_erasures WHERE reference=?').bind(receipt.reference).first()).toEqual({revision:heldRevision});
    expect(await f.db.prepare('SELECT count(*) n FROM audience_erasure_guard').first()).toEqual({n:0});
    for(const saved of sessions)await f.db.prepare('UPDATE oa_sessions SET expires_at=? WHERE token_hash=?').bind(saved.expires_at,saved.token_hash).run();
    await f.db.prepare("CREATE TRIGGER test_erasure_failure BEFORE UPDATE ON audience_erasures BEGIN SELECT RAISE(ABORT,'injected erasure write failure'); END").run();
    expect((await resume()).status).toBe(500);
    expect(await f.db.prepare('SELECT revision FROM audience_erasures WHERE reference=?').bind(receipt.reference).first()).toEqual({revision:heldRevision});
    expect(await f.db.prepare('SELECT count(*) n FROM audience_erasure_guard').first()).toEqual({n:0});
    await f.db.prepare('DROP TRIGGER test_erasure_failure').run();
    const winner=await resume();expect(winner.status).toBe(202);
    const won=(await f.db.prepare('SELECT revision FROM audience_erasures WHERE reference=?').bind(receipt.reference).first()).revision;
    expect(won).toBeGreaterThan(heldRevision);
    await f.call('/test/erasure-race/release',{method:'POST'});
    // The stale queue batch must roll back and acknowledge the newer authorized
    // receipt. Its subsequent actual continuations still have to finish erasure.
    const erasureOutcomes=await (await f.call('/test/run-queue',{method:'POST'})).json();
    expect(erasureOutcomes.length).toBeGreaterThan(0);
    let revision=heldRevision;
    for(const outcome of erasureOutcomes){
      expect(outcome).toMatchObject({ack:true,command:{kind:'contact.erase',payload:{reference:receipt.reference}}});
      expect(outcome.erasure.revision).toBeGreaterThanOrEqual(revision);
      if(outcome.erasure.state==='pending')expect(outcome.erasure.revision).toBeGreaterThan(revision);
      revision=outcome.erasure.revision;
    }
    const race=await (await f.call('/test/erasure-race/status')).json();
    expect(race.failures).toContainEqual(expect.stringMatching(/^D1_ERROR: CHECK constraint failed: value=1: SQLITE_CONSTRAINT(?: \(extended: SQLITE_CONSTRAINT_CHECK\))?$/));
    expect(race.failures).toContainEqual(expect.stringMatching(/^D1_ERROR: injected erasure write failure: SQLITE_CONSTRAINT(?: \(extended: SQLITE_CONSTRAINT_TRIGGER\))?$/));
    expect(race.failures).toContainEqual(expect.stringMatching(/^D1_ERROR: NOT NULL constraint failed: audience_erasure_guard\.value: SQLITE_CONSTRAINT(?: \(extended: SQLITE_CONSTRAINT_NOTNULL\))?$/));
    expect(await f.db.prepare('SELECT count(*) n FROM audience_erasure_guard').first()).toEqual({n:0});
    expect(erasureOutcomes.at(-1).erasure.state).toBe('complete');
    const observed=await f.call(`/api/audience/erasures/${receipt.reference}`,{cookie:session});
    expect(observed.status).toBe(200);
    const state=(await observed.json()).receipt;
    expect(state.state).toBe('complete');
    // Prove the completed-resume contract explicitly, including when the native
    // queue reaches completion before this caller observes its final page.
    const repeated=await f.call(`/api/audience/erasures/${receipt.reference}/resume`,{method:'POST',cookie:session});
    expect(repeated.status).toBe(200);
    expect((await repeated.json()).receipt).toEqual(state);
    expect((await f.db.prepare('SELECT revision FROM audience_erasures WHERE reference=?').bind(receipt.reference).first()).revision).toBe(revision);
    expect(await f.db.prepare('SELECT count(*) n FROM contacts WHERE id=?').bind(contact.contact_id).first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT count(*) n FROM commerce_observations WHERE contact_id=?').bind(contact.contact_id).first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT count(*) n FROM commerce_privacy_controls WHERE contact_id=?').bind(contact.contact_id).first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT count(*) n FROM source_records WHERE contact_id=?').bind(contact.contact_id).first()).toEqual({n:0});
    expect(await f.db.prepare("SELECT * FROM commerce_observations WHERE contact_id='unrelated-history'").first()).toEqual(unrelatedBefore);
    expect(await f.db.prepare("SELECT email FROM contacts WHERE id='unrelated-history'").first()).toEqual({email:'unrelated@example.test'});
    expect((await f.call(`/api/store/observations?sourceType=browsing-event&cursor=${encodeURIComponent(beforeErasure.nextCursor)}`,{cookie:session})).status).toBe(409);
    expect(await sync(f,session,'browsing-event')).toEqual([expect.objectContaining({ack:true})]);
    expect(await f.db.prepare('SELECT count(*) n FROM source_records WHERE contact_id=?').bind(contact.contact_id).first()).toEqual({n:0});
    await f.db.prepare('UPDATE commerce_channels SET healthy_at=0').run();
    expect((await proxy(f,observation())).status).toBe(422);
  }finally{
    try {
      const race=await (await f.call('/test/erasure-race/status')).json();
      await test.info().attach('native-erasure-race-failures',{body:JSON.stringify(race,null,2),contentType:'application/json'});
    }finally{try{await f.call('/test/erasure-race/release',{method:'POST'});}finally{await f.close();}}
  }
});

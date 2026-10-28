// @ts-nocheck -- Native Worker/D1 integration; only Shopify and mail network edges are doubled.
import {builtConnectionsSourceJourney} from '../go-live/built-source-journey';
import {exportedStoreRecords,assertSourceFacts} from '../store/source-export-proof';
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







export const walk0 = async()=>{
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
};

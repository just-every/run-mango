import {expect} from '@playwright/test';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation,json,sender} from '../go-live/harness';
import {syncSource} from '../go-live/source-edge';
import {performanceCommerce} from '../campaign-results/performance-fixture';
import {order,customer,id,page as shopifyPage,line,product} from '../shopify/fixtures';

/** Synthetic catalog placements; the second page of product 23's collections
 * holds Spring planting, so the condition depends on the drained connection. */
export const catalog={spring:id('Collection',801),tools:id('Collection',802),seeds:'Home & Garden > Lawn & Garden > Gardening > Seeds'};
function catalogProducts() {
  const products=new Map([[21,product(21)],[22,product(22)],[23,{...product(23,[id('Collection',810)],catalog.seeds),collections:shopifyPage([{id:id('Collection',810)}],'synthetic-mango-collections')}],
    [24,product(24,[catalog.tools],'Home & Garden > Lawn & Garden > Gardening > Gardening Tools')],[25,product(25,[catalog.spring],'Home & Garden > Lawn & Garden > Fertilizers')],[26,product(26,[],catalog.seeds)]]);
  return {products,commerce(request:Record<string,unknown>) {
    const query=String(request.query);
    if(query.includes('products(first:'))return {data:{products:shopifyPage(structuredClone([...products.values()]))}};
    if(query.includes('MangoNested')&&query.includes('on Product'))return {data:{node:{collections:shopifyPage([{id:catalog.spring}])}}};
  }};
}

export async function segmentFixture() {
  const commerce=performanceCommerce(),customers:typeof customer[]=[],products=catalogProducts();
  const edge=await providerEdge({commerce(request){return String(request.query).includes('customers(first:')?{data:{customers:shopifyPage(customers)}}:products.commerce(request)??commerce.commerce(request);}});
  const site=await installation(edge,eventSigner(),{commerce:true,providerKey:'synthetic-mango-1'});
  try {
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const {now}=await site.control('/_golive/clock',{hold:true});
    const credential=await json(await site.call('/api/settings/integrations',{method:'POST',cookie,body:{name:'Synthetic garden customers',scopes:['contacts:write']}}),201);
    const headers={Authorization:`Bearer ${credential.token}`};
    const people:Array<{id:string;email:string}>=[];
    for(let n=0;n<8;n++) {
      const pace=(await site.rows('SELECT max(next_at) due FROM provider_pacing'))[0]?.due??0,clock=await site.control('/_golive/clock');
      await site.control('/_golive/clock',{advanceMs:Math.max(1000,pace-clock.now+1),hold:true});
      const contact=await json(await site.call('/api/integrations/v1/contacts',{method:'PUT',headers,body:{
        email:`synthetic-mango-${n+1}@example.test`,displayName:`Garden customer ${n+1}`,segmentName:'Garden customers',
        fields:{interest:n===0?'vegetables':'flowers'},tags:n===0?['market','local']:['market'],subscribe:true,
        consent:{source:'Market signup',evidence:'Send the monthly garden letter.',brandOrLegalSender:sender.displayName,messageCategory:'newsletter',frequencyDisclosure:'Monthly',destinationJurisdiction:'US',consentVersion:'v1',occurredAt:new Date(now-1000).toISOString()},
      }}),200);
      expect(contact.contact.emailStatus).toBe('pending');
      const confirmation=edge.sends.findLast(send=>send.to===contact.contact.email&&send.body.subject==='Confirm your Mango Garden subscription');
      const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(confirmation!.body.content.find((part:any)=>part.type==='text/plain').value)![0];
      expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
      people.push(contact.contact);
      customers.push({...structuredClone(customer),id:id('Customer',n+100),email:contact.contact.email,phone:null as any,updatedAt:new Date(now).toISOString(),
        defaultAddress:{city:n===3?'New York':'San Francisco',provinceCode:n===3?'NY':'CA',countryCodeV2:'US',zip:n===3?'10001':n===4?'94103':'94102'}});
    }
    // Real purchase times arrive via Shopify sync. No commerce or contact row is inserted.
    const day=86400000;
    const histories=[[[1,51],[90-1/day,60]],[[1,60],[90+1/day,60]],[[1,60],[2,50]],[[1,60],[2,60]],[[1,70],[2,80],[3,49]],[[1,60]],[[1,60],[-1/day,60]],[]];
    // Catalog purchases by [person, order]: Spring planting and Seeds, only Tools,
    // Spring planting until it is removed, only Seeds (NY), and Seeds in a future order.
    const catalogLines=new Map([['0:0',23],['1:0',24],['2:0',25],['3:0',26],['6:1',23]]);
    let sequence=1000;
    for(const [person,history]of histories.entries())for(const [index,[days,value]]of history.entries()) {
      const at=new Date(now-days*day).toISOString(),observed=new Date(now).toISOString();
      const money=(amount:string)=>({shopMoney:{amount,currencyCode:'USD'},presentmentMoney:{amount,currencyCode:'USD'}});
      const record={...structuredClone(order),id:id('Order',++sequence),createdAt:at,processedAt:at,updatedAt:observed,
        displayFinancialStatus:'PAID',currencyCode:'USD',cancelledAt:null,refunds:[],returns:shopifyPage([]),
        customer:{...structuredClone(customer),id:id('Customer',person+100),email:people[person].email,phone:null,
          defaultAddress:{city:person===3?'New York':'San Francisco',provinceCode:person===3?'NY':'CA',countryCodeV2:'US',zip:person===3?'10001':person===4?'94103':'94102'}},
        totalPriceSet:money(value.toFixed(2)),currentTotalPriceSet:money(value.toFixed(2)),totalReceivedSet:money(value.toFixed(2)),totalRefundedSet:money('0'),
        lineItems:shopifyPage([line(),line(62,22,32),...(catalogLines.has(`${person}:${index}`)?[line(63,catalogLines.get(`${person}:${index}`),33)]:[])]),
      };
      commerce.orders.set(record.id,record);
    }
    await syncSource(site,cookie,'customer');
    await syncSource(site,cookie,'order');
    await syncSource(site,cookie,'refund');
    expect(await site.count('commerce_orders')).toBe(sequence-1000);
    return {site,edge,cookie,now,people,catalog:products.products,async close(){try{await site.runtime.close();}finally{await edge.close();}}};
  }catch(error){await site.runtime.close();await edge.close();throw error;}
}

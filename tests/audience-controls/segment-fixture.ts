import {expect} from '@playwright/test';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {installation,json,sender} from '../go-live/harness';
import {syncSource} from '../go-live/source-edge';
import {performanceCommerce} from '../campaign-results/performance-fixture';
import {order,customer,id,page as shopifyPage,line} from '../shopify/fixtures';

export async function segmentFixture() {
  const commerce=performanceCommerce(),customers:typeof customer[]=[];
  const edge=await providerEdge({commerce(request){return String(request.query).includes('customers(first:')?{data:{customers:shopifyPage(customers)}}:commerce.commerce(request);}});
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
      const contact=await json(await site.call('/api/integrations/v1/contacts',{method:'PUT',headers,body:{
        email:`synthetic-mango-${n+1}@example.test`,displayName:`Garden customer ${n+1}`,segmentName:'Garden customers',
        fields:{interest:n===0?'vegetables':'flowers'},tags:n===0?['market','local']:['market'],subscribe:true,
        consent:{source:'Market signup',evidence:'Send the monthly garden letter.',brandOrLegalSender:sender.displayName,messageCategory:'newsletter',frequencyDisclosure:'Monthly',destinationJurisdiction:'US',consentVersion:'v1',occurredAt:new Date(now-1000).toISOString()},
      }}),200);
      people.push(contact.contact);
      customers.push({...structuredClone(customer),id:id('Customer',n+100),email:contact.contact.email,phone:null as any,updatedAt:new Date(now).toISOString(),
        defaultAddress:{city:n===3?'New York':'San Francisco',provinceCode:n===3?'NY':'CA',countryCodeV2:'US',zip:n===3?'10001':n===4?'94103':'94102'}});
    }
    // Real purchase times arrive via Shopify sync. No commerce or contact row is inserted.
    const day=86400000;
    const histories=[[[1,51],[90-1/day,60]],[[1,60],[90+1/day,60]],[[1,60],[2,50]],[[1,60],[2,60]],[[1,70],[2,80],[3,49]],[[1,60]],[[1,60],[-1/day,60]],[]];
    let sequence=1000;
    for(const [person,history]of histories.entries())for(const [days,value]of history) {
      const at=new Date(now-days*day).toISOString(),observed=new Date(now).toISOString();
      const money=(amount:string)=>({shopMoney:{amount,currencyCode:'USD'},presentmentMoney:{amount,currencyCode:'USD'}});
      const record={...structuredClone(order),id:id('Order',++sequence),createdAt:at,processedAt:at,updatedAt:observed,
        displayFinancialStatus:'PAID',currencyCode:'USD',cancelledAt:null,refunds:[],returns:shopifyPage([]),
        customer:{...structuredClone(customer),id:id('Customer',person+100),email:people[person].email,phone:null,
          defaultAddress:{city:person===3?'New York':'San Francisco',provinceCode:person===3?'NY':'CA',countryCodeV2:'US',zip:person===3?'10001':person===4?'94103':'94102'}},
        totalPriceSet:money(value.toFixed(2)),currentTotalPriceSet:money(value.toFixed(2)),totalReceivedSet:money(value.toFixed(2)),totalRefundedSet:money('0'),
        lineItems:shopifyPage([line(),line(62,22,32)]),
      };
      commerce.orders.set(record.id,record);
    }
    await syncSource(site,cookie,'customer');
    await syncSource(site,cookie,'order');
    await syncSource(site,cookie,'refund');
    expect(await site.count('commerce_orders')).toBe(sequence-1000);
    return {site,edge,cookie,now,people,async close(){try{await site.runtime.close();}finally{await edge.close();}}};
  }catch(error){await site.runtime.close();await edge.close();throw error;}
}

import {createHmac} from 'node:crypto';
import {expect} from '@playwright/test';
import {customer,id,line,order,page} from '../shopify/fixtures';
import {sourceEdge} from '../go-live/source-edge';
import {syncSource} from '../go-live/source-edge';
import type {Installation} from '../go-live/harness';

export const channelPeople=Array.from({length:5},(_,index)=>({
  email:[`synthetic-mango-channel-${index+1}`,'example.test'].join('@'),
  phone:`+6141000000${index+1}`,name:`Market reader ${index+1}`,
}));

/** Only Shopify's network edge is substituted. Permission is never seeded. */
export function channelStateCommerce(){
  const source=sourceEdge();
  let at=new Date().toISOString();
  const customers=()=>channelPeople.map((person,index)=>({...structuredClone(customer),
    id:id('Customer',801+index),email:person.email,phone:person.phone,firstName:person.name,lastName:null,
    createdAt:at,updatedAt:at,
    emailMarketingConsent:{marketingState:'SUBSCRIBED',marketingOptInLevel:'CONFIRMED_OPT_IN',consentUpdatedAt:at},
    smsMarketingConsent:{marketingState:'SUBSCRIBED',marketingOptInLevel:'CONFIRMED_OPT_IN',consentUpdatedAt:at},
  }));
  const orders=()=>customers().map((person,index)=>({...structuredClone(order),id:id('Order',801+index),customer:person,
    createdAt:at,updatedAt:at,processedAt:at,displayFinancialStatus:'PAID',
    lineItems:page([line()]),returns:page([]),refunds:[],
  }));
  return {
    commerce(request:Record<string,unknown>){
      const query=String(request.query),variables=request.variables as {id?:string};
      if(query.includes('customers(first:'))return {data:{customers:page(customers())}};
      if(query.includes('orders(first:'))return {data:{orders:page(orders())}};
      if(query.includes('MangoNode')&&variables.id?.startsWith('gid://shopify/Order/')){
        const node=orders().find(value=>value.id===variables.id);
        if(!node)throw new Error('Unknown synthetic Mango channel order.');
        return {data:{node}};
      }
      return source.commerce(request);
    },
    async sync(site:Installation,cookie:string,now:number){
      at=new Date(now).toISOString();
      await syncSource(site,cookie,'customer');
    },
    async purchases(site:Installation,now:number){
      at=new Date(now).toISOString();
      for(const [index,value]of orders().entries()){
        const raw=JSON.stringify({admin_graphql_api_id:value.id}),delivery=`synthetic-mango-channel-order-${index+1}`;
        const response=await site.call('/webhooks/commerce/shopify',{method:'POST',raw,headers:{
          'X-Shopify-Hmac-Sha256':createHmac('sha256','synthetic-store-webhook-key').update(raw).digest('base64'),
          'X-Shopify-Shop-Domain':'mango-test.myshopify.com','X-Shopify-Topic':'orders/paid',
          'X-Shopify-Webhook-Id':delivery,'X-Shopify-Event-Id':delivery,
        }});
        expect(response.status,await response.clone().text()).toBe(204);
      }
    },
  };
}

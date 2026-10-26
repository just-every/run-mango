import {createHmac} from 'node:crypto';
import {expect} from '@playwright/test';
import {json,type Installation} from './harness';
import type {providerEdge} from './edge';
import type {wooCommerceEdge} from './woocommerce-edge';
import {exportedStoreRecords,assertSourceFacts} from '../store/source-export-proof';

/** Original synthetic-mango-421 facts arrive only through the Woo and Stripe edges. */
export async function builtStoreSourceJourney(site:Pick<Installation,'call'>,woo:ReturnType<typeof wooCommerceEdge>,edge:Awaited<ReturnType<typeof providerEdge>>,cookie:string,provider:string,cart:any,queue:(type:string)=>Promise<any>,finished:(id:string)=>Promise<void>){
 const began=Date.now(),mark=(phase:string)=>console.log(`Store facts phase ${phase} elapsed=${Date.now()-began}ms`);
 const name='synthetic-mango-421',identity=name.replaceAll('-','_'),customerId=identity+'_customer',chargeId=identity+'_charge';
 const browsing={version:1,id:crypto.randomUUID(),kind:'viewed_product',occurredAt:new Date(Date.now()-60000).toISOString(),customerId:'11',products:['21'],consent:{analytics:true,marketing:true},gpc:false};
 woo.state.observations.push(browsing);const run=await queue('browsing-event');await finished(run.runId);mark('browsing synced');
 const key=['rk','test',identity.replaceAll('_','')].join('_'),signingSecret=['whsec',identity.replaceAll('_','')].join('_');
 await json(await site.call('/api/settings/stripe',{method:'PUT',cookie,body:{key,signingSecret}}),200);
 mark('Stripe connected');
 expect((await json(await site.call('/api/settings/woocommerce',{cookie}),200)).connection.id).toBe(provider.slice('woocommerce:'.length));
 edge.stripe.customers[customerId]={email:woo.state.customer.email,name};
 const fixtures=[
  {type:'customer',event:'customer.created',object:{id:customerId,email:woo.state.customer.email,name}},
  {type:'payment',event:'payment_intent.succeeded',object:{id:identity+'_payment',customer:customerId,amount_received:1200,currency:'aud'}},
  {type:'checkout-session',event:'checkout.session.completed',object:{id:identity+'_checkout',customer:customerId,amount_total:1200,currency:'aud'}},
  {type:'subscription',event:'customer.subscription.created',object:{id:identity+'_subscription',customer:customerId,status:'active'}},
  {type:'refund',event:'refund.created',object:{id:identity+'_refund',charge:chargeId,amount:1200,currency:'aud'}},
 ];
 const stripeFacts=[];
 for(const [index,fixture] of fixtures.entries()){
  const created=Math.floor(Date.now()/1000)-3600-index,id='evt_'+identity+'_'+fixture.type,event={id,type:fixture.event,created,livemode:false,data:{object:fixture.object}};
  const raw=JSON.stringify(event),timestamp=Math.floor(Date.now()/1000),signature=createHmac('sha256',signingSecret).update(timestamp+'.'+raw).digest('hex');
  await json(await site.call('/webhooks/commerce/stripe',{method:'POST',raw,headers:{'Stripe-Signature':`t=${timestamp},v1=${signature}`}}),204);
  stripeFacts.push({type:fixture.type,id,at:new Date(created*1000).toISOString()});mark(fixture.type+' received');
 }
 const exported=await exportedStoreRecords(site.call,cookie);mark('export read');const declared=(await json(await site.call('/api/store',{cookie}),200)).sourceCapabilities.filter((row:any)=>row.available).map((row:any)=>row.sourceType);
 const storeId=provider.slice('woocommerce:'.length),sourceId=(type:string,id:string|number)=>`woocommerce:${storeId}:${type}:${id}`;
 const raw:Record<string,any>={customer:woo.state.customer,product:woo.state.product,order:woo.state.order,refund:woo.state.refund};
 const wooFacts=[...Object.entries(raw).map(([type,value])=>({type,id:sourceId(type,value.id),at:value.date_created_gmt+'Z'})),{type:'cart',id:sourceId('cart',cart.checkoutId),at:cart.occurredAt},{type:'browsing-event',id:sourceId('browsing-event',browsing.id),at:browsing.occurredAt}];
 assertSourceFacts(exported.sources,provider,wooFacts,declared);
 const stripe=await json(await site.call('/api/settings/stripe',{cookie}),200);expect(stripe.connection).not.toBeNull();assertSourceFacts(exported.sources,'stripe',stripeFacts,stripe.sourceTypes);
 const wooCustomer=exported.sources.find(row=>row.provider===provider&&row.source_type==='customer'),stripeCustomer=exported.sources.find(row=>row.provider==='stripe'&&row.source_type==='customer');
 expect(wooCustomer?.contact_id).toBeTruthy();expect(stripeCustomer?.contact_id).toBe(wooCustomer!.contact_id);expect(exported.contacts.filter(row=>row.email===woo.state.customer.email)).toHaveLength(1);
 for(const fact of stripeFacts)expect(exported.sources.find(row=>row.provider==='stripe'&&row.provider_source_id===fact.id)?.contact_id).toBe(wooCustomer!.contact_id);
 const contact=await json(await site.call('/api/contacts/'+wooCustomer!.contact_id,{cookie}),200);expect(contact.contact.id).toBe(wooCustomer!.contact_id);expect(contact.timeline.some((row:any)=>row.source.startsWith(provider+' · '))).toBe(true);expect(contact.timeline.some((row:any)=>row.source.startsWith('stripe · '))).toBe(true);
 console.log(`Built store source proof: WooCommerce=${declared.length} Stripe=${stripe.sourceTypes.length}; one shared contact; all identifiers, connections and edge occurrence times read through the owner export`);
}

import {expect} from '@playwright/test';
import {providerEdge} from './edge';
import {wooCommerceEdge} from './woocommerce-edge';
import {eventSigner} from './sendgrid-events';
import {json,sender} from './harness';
import {sourceRuntime} from './source-runtime.mjs';
import {builtStoreSourceJourney} from './store-source-journey';

export async function builtConnectionsSourceJourney(){
 const woo=wooCommerceEdge(),identity='synthetic-mango-421'.replaceAll('-','_');
 const edge=await providerEdge({links:{'https://woo.example.test/':{}},woo:async(url,request,response)=>{
  if(url.hostname==='api.stripe.com'&&url.pathname==='/v1/charges/'+identity+'_charge'&&request.method==='GET'){
   response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify({id:identity+'_charge',customer:identity+'_customer'}));return true;
  }
  return woo.handle(url,request,response);
 }});
 const site=await sourceRuntime(edge,eventSigner());
 try{
  const cookie=await site.open();await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
  await json(await site.call('/api/settings/woocommerce',{method:'PUT',cookie,body:{url:'https://woo.example.test/',key:'synthetic-mango-1',secret:'synthetic-mango-2',signingSecret:'synthetic-mango-3',exclusiveSecret:true,pluginEnabled:true}}),200);
  const connection=await json(await site.call('/api/settings/woocommerce',{cookie}),200),provider='woocommerce:'+connection.connection.id;
  const queue=async(sourceType:string)=>json(await site.call('/api/store/sync',{method:'POST',cookie,body:{sourceType}}),202);
  const finished=async(id:string)=>{await expect.poll(async()=>{const state=await json(await site.call('/api/store',{cookie}),200);return state.syncRuns.find((row:any)=>row.id===id)?.state;}).toBe('completed');};
  const now=Date.now(),cart={version:1,id:crypto.randomUUID(),kind:'abandoned_checkout',occurredAt:new Date(now-60000).toISOString(),customerId:'11',checkoutId:crypto.randomUUID(),checkoutStartedAt:new Date(now-3600000).toISOString(),products:['21'],consent:{analytics:true,marketing:true},gpc:false};
  woo.state.observations.push(cart);
  for(const type of ['customer','product','order','refund','cart']){const run=await queue(type);await finished(run.runId);}
  await builtStoreSourceJourney(site,woo,edge,cookie,provider,cart,queue,finished);
  expect(edge.unexpected).toEqual([]);
 }finally{await site.close();await edge.close();}
}

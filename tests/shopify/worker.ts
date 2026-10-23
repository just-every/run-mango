import {erasureRace,raceDatabase} from './erasure-race';
import productionWorker from '../../src/core/app/worker';
// Test-only elapsed time advances at the Shopify HTTP boundary. Native D1 and
// production lease ownership remain authoritative; no wall-clock sleep is used.
const SystemDate=Date;let edgeClockOffset=0;
globalThis.Date=new Proxy(SystemDate,{
  construct(target,args,newTarget){return Reflect.construct(target,args.length?args:[SystemDate.now()+edgeClockOffset],newTarget);},
  get(target,key,receiver){return key==='now'?()=>SystemDate.now()+edgeClockOffset:Reflect.get(target,key,receiver);},
  apply(){return new SystemDate(SystemDate.now()+edgeClockOffset).toString();},
});
function installNetworkEdge(env){
    globalThis.fetch=async(url,options)=>{
      if(String(url)==='https://api.sendgrid.com/v3/mail/send'){
        await env.DB.prepare('INSERT INTO test_mail(body) VALUES(?)').bind(options.body).run();return new Response(null,{status:202,headers:{'x-message-id':'test-mail'}});
      }
      if(String(url)==='https://mango-shop.myshopify.com/admin/oauth/access_token'){
        await env.DB.prepare('INSERT INTO test_shopify_http(request_key,started_at,ended_at) VALUES(?,?,?)').bind('OAuthToken',Date.now(),Date.now()).run();
        const row=await env.DB.prepare("SELECT body FROM test_shopify WHERE id='OAuthToken'").first();
        if(!row)throw new Error('OAuth token edge not configured');return new Response(row.body,{headers:{'Content-Type':'application/json'}});
      }
      if(String(url)!=='https://mango-shop.myshopify.com/admin/api/2026-07/graphql.json')throw new Error('Unexpected network edge');
      const {query,variables}=JSON.parse(options.body);
      const operation=query.match(/(?:query|mutation) (\w+)/)?.[1];
      if(operation==='MangoCreatePixel') {
        const row=await env.DB.prepare("SELECT body FROM test_shopify WHERE id='MangoInstalledAccess'").first();
        const body=JSON.parse(row.body),pixel={id:'gid://shopify/WebPixel/2',settings:variables.pixel.settings};body.data.webPixel=pixel;
        await env.DB.prepare("UPDATE test_shopify SET body=? WHERE id='MangoInstalledAccess'").bind(JSON.stringify(body)).run();
        return Response.json({data:{webPixelCreate:{webPixel:pixel,userErrors:[]}}});
      }
      if(operation==='MangoCreateSubscription') {
        const stored=await env.DB.prepare("SELECT body FROM test_shopify WHERE id='MangoSubscriptions'").first();
        const body=JSON.parse(stored.body),nodes=body.data.webhookSubscriptions.nodes;
        const created={id:'gid://shopify/WebhookSubscription/'+(nodes.length+100),topic:variables.topic,uri:variables.subscription.uri,filter:null,includeFields:[],format:'JSON',apiVersion:{handle:'2026-07'}};
        nodes.push(created);await env.DB.prepare("UPDATE test_shopify SET body=? WHERE id='MangoSubscriptions'").bind(JSON.stringify(body)).run();
        return Response.json({data:{webhookSubscriptionCreate:{webhookSubscription:created,userErrors:[]}}});
      }
      const connection=query.match(/\{ (customers|products|productVariants|inventoryItems|orders)\(/)?.[1];
      const key=operation==='MangoSource'?`${connection}:${variables.cursor??''}`:operation==='MangoNested'?`${variables.id}:${variables.cursor}`:operation==='MangoNode'?`node:${variables.id}`:operation;
      const result=await env.DB.prepare('SELECT body,elapsed_ms FROM test_shopify WHERE id=?').bind(key).first();
      if(!result)throw new Error(`Unconfigured Shopify network edge ${key}`);
      const started=Date.now();
      const lease=await env.DB.prepare("SELECT lease_expires_at FROM source_sync_runs WHERE state='running' LIMIT 1").first();
      edgeClockOffset+=result.elapsed_ms;
      await env.DB.prepare('INSERT INTO test_shopify_http(request_key,started_at,ended_at,lease_expires_at) VALUES(?,?,?,?)').bind(key,started,Date.now(),lease?.lease_expires_at??null).run();
      return new Response(result.body,{headers:{'Content-Type':'application/json'}});
    };
}
export default {
  async fetch(envelope,env,context){
    installNetworkEdge(env);
    const input=await envelope.json();
    if(input.url.includes('/test/erasure-race/'))return Response.json(await erasureRace(new URL(input.url).pathname.split('/').at(-1)!));
    if(input.url.endsWith('/test/clock')){edgeClockOffset+=JSON.parse(input.body??'{}').advanceMs??0;return Response.json({now:Date.now()});}
    env={...env,DB:raceDatabase(env.DB)};
    return productionWorker.fetch(new Request(input.url,{method:input.method,headers:input.headers,...(input.body!==undefined?{body:input.body}:{})}),env,context);
  },
  async queue(batch,env){
    env={...env,DB:raceDatabase(env.DB)};
    installNetworkEdge(env);
    const outcomes=[];
    // Observe native acknowledgements without changing delivery or retry policy.
    const messages=batch.messages.map(message=>new Proxy(message,{get(target,key){
      if(key==='ack')return ()=>{target.ack();outcomes.push({id:target.id,ack:true,attempts:target.attempts,command:target.body});};
      if(key==='retry')return options=>{target.retry(options);outcomes.push({id:target.id,ack:false,attempts:target.attempts,delaySeconds:options?.delaySeconds,command:target.body});};
      return Reflect.get(target,key,target);
    }}));
    await productionWorker.queue({...batch,messages},env);
    for(const outcome of outcomes){
      if(outcome.command.kind==='contact.erase')outcome.erasure=await env.DB.prepare('SELECT revision,state FROM audience_erasures WHERE reference=?').bind(outcome.command.payload.reference).first();
      await env.DB.prepare('INSERT INTO test_queue_outcomes(body) VALUES(?)').bind(JSON.stringify(outcome)).run();
    }
  },
};

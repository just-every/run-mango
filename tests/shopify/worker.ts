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
      if(String(url)!=='https://mango-shop.myshopify.com/admin/api/2026-07/graphql.json')throw new Error('Unexpected network edge');
      const {query,variables}=JSON.parse(options.body);
      const operation=query.match(/query (\w+)/)?.[1];
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
    return productionWorker.fetch(new Request(input.url,{method:input.method,headers:input.headers,...(input.body!==undefined?{body:input.body}:{})}),env,context);
  },
  async queue(batch,env){
    installNetworkEdge(env);
    const outcomes=[];
    // Observe native acknowledgements without changing delivery or retry policy.
    const messages=batch.messages.map(message=>new Proxy(message,{get(target,key){
      if(key==='ack')return ()=>{target.ack();outcomes.push({id:target.id,ack:true,attempts:target.attempts,command:target.body});};
      if(key==='retry')return options=>{target.retry(options);outcomes.push({id:target.id,ack:false,attempts:target.attempts,delaySeconds:options?.delaySeconds,command:target.body});};
      return Reflect.get(target,key,target);
    }}));
    await productionWorker.queue({...batch,messages},env);
    for(const outcome of outcomes)await env.DB.prepare('INSERT INTO test_queue_outcomes(body) VALUES(?)').bind(JSON.stringify(outcome)).run();
  },
};

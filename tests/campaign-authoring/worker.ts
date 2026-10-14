import { testIdentity } from '../support/test-identity';
import { recordProposalClaims } from '../support/record-proposal-claims';
// Isolated authoring test entry. Actual API, D1, native sessions and SSR; sends disabled.
import { createFixturePlatform } from '../support/local-platform';
import { createApp, createAppServices } from '../../src/core/app/app';
import { dispatchDocuments } from '../../src/core/app/document-dispatch';
import { fixtureVerification } from '../support/sender-verification';
import type { LocalAppBindings } from '../support/fixture-app';
import { createShopifyAdapter } from '../../src/core/platform/adapters/shopify';
import { createLinkInspector } from '../../src/core/platform/link-inspector';
import { consumeLifecycleQueue, type LifecycleQueueBatch } from '../../src/core/features/lifecycle';
import { designCommandKinds, isDesignCommand } from '../../src/core/features/design-generation/advance';
import { acknowledgeHealthProbe } from '../../src/core/features/health/queue-probe';
// The network edge for one destination host: DNS answers a documentation address and HEAD succeeds; anything else is refused.
const linkEdge=(host:string):typeof fetch=>async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  if(url.hostname==='cloudflare-dns.com') return Response.json(url.searchParams.get('name')===host&&url.searchParams.get('type')==='A'?{Answer:[{data:'203.0.113.10'}]}:{});
  if(url.hostname===host&&(init?.method??'GET')==='HEAD') return new Response(null,{status:200});
  return new Response('Refused by the test network edge.',{status:502});
};
export default {async fetch(request:Request,bindings:LocalAppBindings,context:ExecutionContext) {
  const platform=createFixturePlatform(bindings,bindings.LOCAL_BOOTSTRAP_TOKEN);
  const sender=platform.config.mailSender={displayName:'Authoring test',fromEmail:'offers@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Test Street'};
  const evidence=fixtureVerification(bindings.DB,platform.config);
  const linkHost=(bindings as {AUTHORING_LINK_HOST?:string}).AUTHORING_LINK_HOST;
  if(linkHost){platform.config.allowedLinkHosts.push(linkHost);platform.linkInspector=createLinkInspector(platform.config.allowedLinkHosts,linkEdge(linkHost));}
  platform.mailer={channel:'email',async capabilities(){return {configured:true,canSendMarketing:true,effectiveDeduplication:true,effectiveReconciliation:true,deduplicationWindowMs:30*86400000,reconciliationWindowMs:30*86400000,detail:'Test sender; sends disabled.'};},inspectSender:value=>evidence.inspect(value),async validateSender(){return {ready:true,detail:'Test only.'};},async send(){throw new Error('Authoring tests never send.');},async reconcile(){return {facts:[],exhausted:true};},async verifyWebhook(){throw new Error('No webhook fixture.');}};
  // Health probes and design runs use the real local queue; domain jobs are only recorded.
  const queue=platform.jobs;
  platform.jobs={async enqueue(job){if(job.kind==='health.probe'||isDesignCommand(job))return queue.enqueue(job);await bindings.DB.prepare('INSERT INTO task_authoring_jobs (kind,payload) VALUES (?,?)').bind(job.kind,JSON.stringify(job.payload)).run();},async retry(job,delay){if(isDesignCommand(job))return queue.retry(job,delay);throw new Error('Tests never dispatch.');}};
  const path=new URL(request.url).pathname;
  if(await bindings.DB.prepare("SELECT name FROM sqlite_master WHERE name='task_authoring_commerce'").first()) platform.commerce=createShopifyAdapter({storeUrl:new URL('https://shop.example.test'),accessToken:'test-no-network',webhookSecret:'test-no-network'});
  const services=createAppServices(platform);
  if(path.startsWith('/_authoring/')) {
    if(request.headers.get('X-Test-Token')!==bindings.LOCAL_BOOTSTRAP_TOKEN) return new Response('Forbidden',{status:403});
    if(path==='/_authoring/open') {
      await bindings.DB.prepare('CREATE TABLE IF NOT EXISTS task_authoring_jobs (kind TEXT,payload TEXT)').run();
      await testIdentity(platform).importLocalDemoOperator({id:'authoring-operator',email:'author@example.test',displayName:'Author'},new Date());
      const session=await testIdentity(platform).createTestSession('authoring-operator');
      for(const name of ['subscribed','opted-out']) await services.audienceService.captureConsent({idempotencyKey:`authoring-${name}`,contact:{email:`${name}@example.test`,displayName:name},channel:'email',brandOrLegalSender:sender.displayName,messageCategory:'newsletter',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',captureMethod:'test-fixture',captureSource:'authoring-test',consentText:'Receive this test newsletter',consentVersion:'v1',occurredAt:new Date(),confirmationRequired:false});
      await services.audienceService.recordChannelOptOut({channel:'email',destination:'opted-out@example.test',occurredAt:new Date(),reason:'test-optout'});
      return Response.json({token:session.token});
    }
    if(path==='/_authoring/source') {
      await bindings.DB.prepare('CREATE TABLE IF NOT EXISTS task_authoring_commerce (id TEXT)').run();
      await services.storeService.recordSourceCapabilities([{sourceType:'product',available:true,detail:'Recorded test source'}]);
      await services.storeService.ingestSuccessfulCommerceBatch('shopify',[{sourceType:'product',providerSourceId:'gid://shopify/Product/1',payload:{id:'gid://shopify/Product/1',title:'Garden linen',handle:'garden-linen',status:'ACTIVE'},occurredAt:new Date()}],'full',['product'],true,new Date());
      return Response.json({ok:true});
    }
    if(path==='/_authoring/stale') {await bindings.DB.prepare("UPDATE source_syncs SET last_successful_at=? WHERE source_type='product'").bind(Date.now()-25*3600000).run();return Response.json({ok:true});}
    if(path==='/_authoring/proposal') {
      const id=crypto.randomUUID(),now=Date.now(),rules=JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'}]});
      await bindings.DB.prepare("INSERT INTO proposals (id,state,title,summary,evidence,audience_rule,source_data_as_of,send_by_at,inclusion_rule_json,exclusion_rules_json,created_at,updated_at) VALUES (?, 'proposed', 'Recorded suggestion', 'A recorded suggestion', 'Test source evidence', 'Subscribed email contacts', ?, ?, ?, '[]', ?, ?)").bind(id,now,now+86400000,rules,now,now).run();
      await recordProposalClaims(bindings.DB,id,now);
      return Response.json({id});
    }
    if(path==='/_authoring/state') return Response.json({jobs:(await bindings.DB.prepare('SELECT * FROM task_authoring_jobs').all()).results,recipients:(await bindings.DB.prepare('SELECT * FROM recipient_steps').all()).results,approvals:(await bindings.DB.prepare('SELECT * FROM campaign_approval_requests').all()).results});
  }
  return dispatchDocuments(request,bindings,context,platform,createApp(bindings,platform,undefined,true));
},
// Acknowledge probes before composing domain services, then run local design commands.
async queue(batch,bindings:LocalAppBindings){
  const messages=(batch as unknown as LifecycleQueueBatch).messages.filter(message=>!acknowledgeHealthProbe(message));
  if(!messages.length)return;
  const platform=createFixturePlatform(bindings,bindings.LOCAL_BOOTSTRAP_TOKEN);
  await consumeLifecycleQueue({messages},createAppServices(platform).lifecycleRuntime,designCommandKinds);
}} satisfies ExportedHandler<LocalAppBindings>;

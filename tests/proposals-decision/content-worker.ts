import {createApp,createAppServices} from '../../src/core/app/app';
import {dispatchDocuments} from '../../src/core/app/document-dispatch';
import {createFixturePlatform} from '../support/local-platform';
import {testIdentity} from '../support/test-identity';
import type {LocalAppBindings} from '../support/fixture-app';
import {proposalGenerationEdge} from './generation-edge';
import {proposalCommerce,synchronizeProposalSource} from './shopify-edge';
import {smsProgramme} from '../go-live/sms-bindings';

// An isolated native installation. Only AI and commerce provider edges are doubled;
// this proof grants no SMS registration or transport qualification.
export default {async fetch(request:Request,bindings:LocalAppBindings,context:ExecutionContext) {
  const platform=createFixturePlatform(bindings,bindings.LOCAL_BOOTSTRAP_TOKEN);
  platform.config.modules.sms={enabled:true,requiredInputs:[],missingInputs:[],config:{
    providerApiKey:'synthetic-mango-1',webhookSecret:'synthetic-mango-2',confirmationSender:'MANGO',
    programme:smsProgramme(),testAllowlist:[],handoffsPerMinute:1,
  }};
  platform.config.modules.ai={enabled:true,requiredInputs:[],missingInputs:[],config:{providerApiKey:'synthetic-mango-4',model:'fixture-model'}};
  platform.config.modules.commerce={enabled:true,requiredInputs:[],missingInputs:[],config:{storeUrl:new URL('https://proposal-fixture.myshopify.com'),apiToken:'synthetic-mango-5',webhookSecret:'synthetic-mango-6',exclusiveShop:'proposal-fixture.myshopify.com'}};
  platform.sms={channel:'sms',async capabilities(){return {configured:false,canSendMarketing:false,effectiveDeduplication:false,effectiveReconciliation:false,detail:'Synthetic unavailable transport; content editing only.'};},async validateSender(){return {ready:false,detail:'No qualified transport.'};},async send(){throw new Error('Content proof never sends SMS.');},async reconcile(){return {facts:[],exhausted:true};},async verifyWebhook(){throw new Error('Content proof has no SMS webhook.');}};
  platform.commerce=proposalCommerce();
  const {ai,controls}=proposalGenerationEdge(platform.config.mailSender);
  controls.alter=output=>{
    output.sms={body:'Synthetic garden news for your phone. https://example.test/synthetic-mango-7'};
    output.steps.push({...output.steps[0],channel:'sms'});
  };
  platform.ai=ai;
  const queue=platform.jobs;
  platform.jobs={async enqueue(job){if(job.kind==='health.probe')return queue.enqueue(job);await bindings.DB.prepare('INSERT INTO task_content_jobs(kind,payload) VALUES(?,?)').bind(job.kind,JSON.stringify(job.payload)).run();},async retry(){throw new Error('Content proof never dispatches.');}};
  if(new URL(request.url).pathname==='/_proposal/open') {
    if(request.headers.get('X-Test-Token')!==bindings.LOCAL_BOOTSTRAP_TOKEN)return new Response('Forbidden',{status:403});
    await bindings.DB.prepare('CREATE TABLE task_content_jobs(kind TEXT,payload TEXT)').run();
    const identity=testIdentity(platform),email=['synthetic-mango-3','example.test'].join('@');
    await identity.importLocalDemoOperator({id:'synthetic-mango-3',email,displayName:'Synthetic Mango Owner'},new Date());
    await synchronizeProposalSource(createAppServices(platform));
    const session=await identity.createTestSession('synthetic-mango-3');
    return Response.json({token:session.token});
  }
  return dispatchDocuments(request,bindings,context,platform,createApp(bindings,platform,undefined,true));
}} satisfies ExportedHandler<LocalAppBindings>;

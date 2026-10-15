import { createFixturePlatform } from '../support/local-platform';
import { testIdentity } from '../support/test-identity';
import { createApp, createAppServices } from '../../src/core/app/app';
import { dispatchDocuments } from '../../src/core/app/document-dispatch';
import type { LocalAppBindings } from '../../src/core/app/local-app';
import { recordExternalCost } from '../../src/core/features/insights/cost-recording';
import { cancelHandoffCost, prepareHandoffCost } from '../../src/core/features/insights/cost-handoff';
import { createDesignRepository } from '../../src/core/features/design-generation/repository';

// Actual app routes, D1 and SSR. Only external AI, commerce and mail providers are doubles.
export default { async fetch(request: Request, bindings: LocalAppBindings, context: ExecutionContext) {
  const platform = createFixturePlatform(bindings, bindings.LOCAL_BOOTSTRAP_TOKEN);
  platform.config.testEmailAllowlist = ['costs@example.test'];
  platform.ai = { costIdentity: {provider:'openai',model:'cost-test'}, async generateGroundedJson() {
    const mode = await bindings.DB.prepare('SELECT mode FROM cost_test_control').first<{mode:string}>();
    if (mode?.mode === 'failed') throw new Error('Provider connection interrupted');
    return {provider:'openai',model:'cost-test',output:null,billableUnits:mode?.mode==='unknown'?null:17,unitKind:'tokens'};
  } };
  platform.commerce = {capabilities:()=>({provider:'cost-test',sourceTypes:['product'],detail:'Fixture provider'}),async synchronize(){return {records:[]};},async verifyWebhook(){throw new Error('No webhook');}};
  platform.mailer = {...platform.mailer,
    async capabilities(){return {provider:'cost-mail',configured:true,canSendMarketing:true,effectiveDeduplication:false,effectiveReconciliation:true,deduplicationWindowMs:0,reconciliationWindowMs:86400000,detail:'Test provider'};},
    async send(delivery){
      await bindings.DB.prepare('INSERT INTO cost_test_sends (key) VALUES (?)').bind(delivery.idempotencyKey).run();
      return {providerMessageId:crypto.randomUUID(),disposition:'accepted',providerAcceptedAt:new Date(),cost:{billableUnits:1,unitKind:'messages',reportedCostMicros:1250,currency:'USD'}};
    },
  };
  const services = createAppServices(platform);
  const path = new URL(request.url).pathname;
  if (path.startsWith('/_costs/')) {
    if(request.headers.get('X-Test-Token')!==bindings.LOCAL_BOOTSTRAP_TOKEN) return new Response('Forbidden',{status:403});
    if(path==='/_costs/open') {
      await bindings.DB.batch([bindings.DB.prepare('CREATE TABLE cost_test_control (mode TEXT)'),bindings.DB.prepare('CREATE TABLE cost_test_sends (key TEXT)'),bindings.DB.prepare("INSERT INTO cost_test_control VALUES ('invalid')")]);
      await testIdentity(platform).importLocalDemoOperator({id:'cost-operator',email:'costs@example.test',displayName:'Costs operator'},new Date());
      const session=await testIdentity(platform).createTestSession('cost-operator');
      await services.storeService.recordSourceCapabilities([{sourceType:'product',available:true,detail:'Fixture product source'}]);
      await services.storeService.ingestSuccessfulCommerceBatch('cost-test',[{sourceType:'product',providerSourceId:'product-1',payload:{id:'product-1',title:'Garden linen',status:'ACTIVE'},occurredAt:new Date()}],'full',['product'],true,new Date());
      return Response.json({token:session.token});
    }
    if(path==='/_costs/mode') {const {mode}=await request.json() as {mode:string};await bindings.DB.prepare('UPDATE cost_test_control SET mode=?').bind(mode).run();return Response.json({ok:true});}
    if(path==='/_costs/confirmation') {
      await services.audienceService.captureConsent({idempotencyKey:'cost-confirmation',contact:{email:'confirm-costs@example.test'},channel:'email',brandOrLegalSender:'Mango local',messageCategory:'newsletter',destinationJurisdiction:'AU',frequencyDisclosure:'Weekly',captureMethod:'test',captureSource:'cost-test',consentText:'Receive this newsletter',consentVersion:'v1',occurredAt:new Date('2026-01-01T00:00:00Z'),confirmationRequired:true});
      return Response.json({ok:true});
    }
    if(path==='/_costs/records') return Response.json({costs:(await bindings.DB.prepare('SELECT * FROM external_cost_facts').all()).results,sends:(await bindings.DB.prepare('SELECT * FROM cost_test_sends').all()).results});
    if(path==='/_costs/reports') {
      const {campaignId}=await request.json() as {campaignId:string};
      const day1=new Date('2031-10-04T23:59:59.999Z'),day2=new Date('2031-10-05T00:00:00Z');
      const facts=[
        {key:'priced-usd',billableUnits:2,unitKind:'messages',reportedCostMicros:3000,currency:'USD',occurredAt:day1},
        {key:'priced-eur',billableUnits:3,unitKind:'messages',reportedCostMicros:6000,currency:'EUR',occurredAt:day2},
        {key:'unpriced-usd',billableUnits:4,unitKind:'messages',currency:'USD',occurredAt:day1},
        {key:'segments-usd',billableUnits:5,unitKind:'segments',reportedCostMicros:7000,currency:'USD',occurredAt:day1},
      ];
      for(const fact of facts) for(let replay=0;replay<2;replay++) await recordExternalCost(platform.database,{...fact,campaignId,provider:'reported-mail',operation:'provider-handoff',modelOrChannel:'email'});
      for(let replay=0;replay<2;replay++) await createDesignRepository(bindings.DB).recordCost({key:'design-one',campaignId,provider:'12ui',operation:'design-draft',tier:'standard',units:1},+day2);
      const denied={key:'refused-cost',provider:'cost-mail',campaignId,operation:'test-handoff' as const};
      await prepareHandoffCost(platform.database,platform.mailer,{recipientStepId:'refused',idempotencyKey:'refused',handoffStartedAt:day2,to:'costs@example.test',sender:'Sender',content:{text:'Refused before transport'},callbackUrl:'https://example.test'},denied);
      await cancelHandoffCost(platform.database,denied.key);
      return Response.json({ok:true});
    }
  }
  return dispatchDocuments(request,bindings,context,platform,createApp(bindings,platform,undefined,true));
} } satisfies ExportedHandler<LocalAppBindings>;

import { seedRetention } from './retention-fixture';
import { seedReporting } from './reporting-fixture';
// Dedicated test entry: real native sessions, D1, API and SSR with an injected read clock.
import { presentationPlatform } from './presentation-platform';
import { acknowledgeHealthProbe } from '../../src/core/features/health/queue-probe';
import type { LifecycleQueueBatch } from '../../src/core/features/lifecycle';
import { testIdentity } from '../support/test-identity';
import { createFixturePlatform } from '../support/local-platform';
import { createApp } from '../../src/core/app/app';
import { dispatchDocuments } from '../../src/core/app/document-dispatch';
import type { LocalAppBindings } from '../../src/core/app/local-app';
import { createCampaignService } from '../../src/core/features/campaigns/service';
import { createCampaignRepository } from '../../src/core/features/campaigns/repository';
import { createCampaignCompositionRepository } from '../../src/core/features/campaigns/composition-repository';
import { createCampaignRoutes } from '../../src/core/features/campaigns/routes';
import { createAuthoringService } from '../../src/core/features/campaigns/authoring-service';
import { createLifecycleServices } from '../../src/core/features/lifecycle';
import { fixedNow, seedCampaign, seedOutcomes, states, clearCampaigns } from './fixtures';
export default {async fetch(request:Request,bindings:LocalAppBindings,context:ExecutionContext) {
  const platform=presentationPlatform(createFixturePlatform(bindings,bindings.LOCAL_BOOTSTRAP_TOKEN),bindings.DB);
  const app=createApp(bindings,platform,(app,services)=>{
    app.all('/_results/:action',async context=>{
      if(context.req.header('X-Test-Token')!==bindings.LOCAL_BOOTSTRAP_TOKEN) return context.json({error:'forbidden'},403);
      const action=context.req.param('action');
      if(action==='open') {
        await testIdentity(platform).importLocalDemoOperator({id:'results-operator',email:'results@example.test',displayName:'Results operator'},fixedNow);
        const session=await testIdentity(platform).createTestSession('results-operator');return context.json({token:session.token});
      }
      if(action==='presentation') {
        await bindings.DB.prepare('CREATE TABLE IF NOT EXISTS presentation_jobs(payload TEXT NOT NULL)').run();
        await services.storeService.importLocalDemo([],['customer'],fixedNow);
        await services.storeService.recordSourceCapabilities([{sourceType:'customer',available:true,detail:'Local test customer source.'}],fixedNow);
        return context.json({ok:true});
      }
      if(action==='jobs') return context.json((await bindings.DB.prepare('SELECT payload FROM presentation_jobs').all()).results);
      if(action==='counts') return context.json((await bindings.DB.prepare(`SELECT campaign_id,revision_id,step_id,transport_disposition disposition,skip_reason reason,COUNT(*) count FROM recipient_steps GROUP BY campaign_id,revision_id,step_id,transport_disposition,skip_reason`).all()).results);
      await clearCampaigns(bindings.DB);
      if(action==='retention') return context.json(await seedRetention(bindings.DB));
      if(action==='reporting') return context.json(await seedReporting(bindings.DB,platform));
      if(action==='outcomes') await seedOutcomes(bindings.DB);
      if(action==='filters') for(const state of states) for(const channels of [['email'],['sms'],['email','sms']]) await seedCampaign(bindings.DB,`${state}-${channels.join('-')}`,state,channels);
      if(action==='single') await seedCampaign(bindings.DB,'only-email','draft');
      return context.json({ok:true});
    });
    app.use('/api/campaigns*',async(context,next)=>{
      const operator=await services.authService.authenticate(context.req.raw);
      if(!operator)return context.json({error:'unauthenticated'},401);
      context.set('operator',operator);await next();
    });
    const disabledSms=new URL(request.url).searchParams.has('smsDisabled')
      || (request.headers.get('X-Test-Token')===bindings.LOCAL_BOOTSTRAP_TOKEN && request.headers.get('X-Test-Sms-Disabled')==='true');
    const service=createCampaignService(createCampaignRepository(platform.database),createCampaignCompositionRepository(platform.database),services.storeService,{smsEnabled:!disabledSms,now:()=>fixedNow});
    // Native campaign routes own all reads. Lifecycle cancellation remains on the real app below.
    const routes=createCampaignRoutes(service,createAuthoringService(platform,services.lifecycleRuntime,services.storeService),platform.config.publicBaseUrl.origin,
      (campaignId,revisionId)=>createLifecycleServices(services.lifecycleRuntime).approval.preview({campaignId,revisionId}));
    app.route('/api',routes);
  },true);
  if(new URL(request.url).pathname.startsWith('/_results/')) return app.fetch(request,bindings,context);
  // The same authenticated fault reaches document snapshots and browser refreshes.
  const transport={fetch:(resource:Request,env:LocalAppBindings,ctx:ExecutionContext)=>
    resource.headers.get('X-Test-Token')===bindings.LOCAL_BOOTSTRAP_TOKEN
      && new URL(resource.url).pathname===resource.headers.get('X-Test-Unavailable-Resource')
      ? new Response(null,{status:503}) : app.fetch(resource,env,ctx)};
  return dispatchDocuments(request,bindings,context,platform,transport);
},
// Presentation domain jobs are recorded; only harmless transport probes reach this consumer.
async queue(batch){
  for(const message of (batch as unknown as LifecycleQueueBatch).messages) {
    if(!acknowledgeHealthProbe(message))message.retry();
  }
}} satisfies ExportedHandler<LocalAppBindings>;

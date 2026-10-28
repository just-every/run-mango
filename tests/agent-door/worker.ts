import {createApp} from '../../src/core/app/app';
import {createLifecycleServices} from '../../src/core/features/lifecycle';
import type {AppBindings} from '../../src/core/shared/platform';
import {composeFixture} from '../sender-verification/test-runtime';

// Test entry only. Application routes, native authority and D1 run in workerd;
// the existing sender fixture replaces only provider/receiver network I/O.
let runtime:ReturnType<typeof compose>;
function compose(environment:AppBindings){
 const fixture=composeFixture(environment.DB,false),bindings={...fixture.bindings,...environment};
 const platform=fixture.platform;
 platform.config.authSetupToken='synthetic-native-claim-setup-at-least-thirty-two-bytes';
 platform.config.initialOperatorEmails=['owner@example.test'];
 platform.config.publicBaseUrl=new URL('https://mango.example.test');
 const app=createApp(bindings,platform);
 return {fixture,platform,app,bindings};
}
export default {async fetch(request:Request,environment:AppBindings,execution:ExecutionContext){
 const headers=new Headers(request.headers);headers.set('Host','mango.example.test');
 request=new Request(new Request(new URL(new URL(request.url).pathname+new URL(request.url).search,'https://mango.example.test'),request),{headers});
 runtime??=compose(environment);
 const {fixture,app,bindings,platform}=runtime,path=new URL(request.url).pathname;
 if(path==='/__test/agent/outbound')return Response.json(fixture.outbound);
 if(path==='/__test/agent/sender-proof') {await fixture.prove();return new Response(null,{status:204});}
 if(path==='/__test/agent/dispatch-step'){
  await createLifecycleServices(app.mangoServices.lifecycleRuntime).delivery.dispatchStep(await request.json());
  return new Response(null,{status:204});
 }
 if(path==='/__test/agent/invoke'){
  const {name,args,principal}=await request.json() as {name:string;args:Record<string,unknown>;principal:Parameters<NonNullable<typeof platform.agentDoor>['invoke']>[2]};
  return Response.json(await platform.agentDoor!.invoke(name,args,principal));
 }
 return app.fetch(request,bindings,execution);
}};

import { bootstrapSession } from '../support/operator-session';
// Test-only Worker entry: production services/routes and D1; only external
// provider/DNS/receiver transports and the prior-release data setup are fixtures.
import {composeFixture} from '../sender-verification/test-runtime';
import {legacyApproval} from './legacy';
import {createApp} from '../../src/core/app/app';
import {createAuthService} from '../../src/core/features/auth/service';
import {createAuthRepository} from '../../src/core/features/auth/repository';
export default {async fetch(request:Request,env:{DB:D1Database}) {
  const headers = new Headers(request.headers); headers.set('Host', 'mango.example.test');
  request = new Request(new Request(new URL(new URL(request.url).pathname + new URL(request.url).search, 'https://mango.example.test'), request), { headers });
  const f=composeFixture(env.DB);
  try {
    const path=new URL(request.url).pathname;
    if(path==='/test/legacy') {
      const campaign=await legacyApproval(f);
      const session = await bootstrapSession(f.platform);
      const operator = session.operator;
      return Response.json({campaign,operatorId:operator.id,session:session.token});
    }
    if(path==='/test/prove') {await f.prove();return Response.json({calls:f.outbound.length});}
    if(path==='/test/dispatch') {await f.lifecycle.delivery.dispatchStep(await request.json());return Response.json({outbound:f.outbound});}
    return await createApp(f.bindings,f.platform).fetch(request,f.bindings);
  } finally {await f.dispose();}
}};

import { bootstrapSession } from '../support/operator-session';
// Test-only setup routes surround the actual authenticated production API.
// Provider, DNS, and receiver calls are trapped by the unchanged test transport.
import {composeFixture,draft} from '../sender-verification/test-runtime';
import {createApp} from '../../src/core/app/app';
import {createAuthService} from '../../src/core/features/auth/service';
import {createAuthRepository} from '../../src/core/features/auth/repository';
export default {async fetch(request:Request,env:{DB:D1Database}) {
  const headers = new Headers(request.headers); headers.set('Host', 'mango.example.test');
  request = new Request(new Request(new URL(new URL(request.url).pathname + new URL(request.url).search, 'https://mango.example.test'), request), { headers });
  const f=composeFixture(env.DB);
  try {
    const path=new URL(request.url).pathname;
    if(path==='/fixture') {
      const campaign=await draft(f);
      await f.prove();
      const session = await bootstrapSession(f.platform);
      const operator = session.operator;
      return Response.json({campaign,session:session.token});
    }
    if(path==='/inspect') return Response.json(await f.verifier.inspect('Mango <offers@example.test>'));
    if(path==='/dispatch') {
      await f.lifecycle.delivery.dispatchStep(await request.json());
      return Response.json({outbound:f.outbound,calls:f.calls});
    }
    return await createApp(f.bindings,f.platform).fetch(request,f.bindings);
  } finally {await f.dispose();}
}};

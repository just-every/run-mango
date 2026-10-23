import {proveRenewal} from './renewal-proof';
import { bootstrapSession } from '../support/operator-session';
// Test-only Worker entry. All provider/receiver I/O is intercepted here; no test
// connector, fixture or endpoint is imported by the production entry.
import { composeFixture, draft } from './test-runtime';
import { createApp } from '../../src/core/app/app';
import { createAuthService } from '../../src/core/features/auth/service';
import { createAuthRepository } from '../../src/core/features/auth/repository';
export default { async fetch(request: Request, env: { DB: D1Database }) {
  const headers = new Headers(request.headers); headers.set('Host', 'mango.example.test');
  request = new Request(new Request(new URL(new URL(request.url).pathname + new URL(request.url).search, 'https://mango.example.test'), request), { headers });
  const f = composeFixture(env.DB);
  try {
    const path = new URL(request.url).pathname;
    if(path==='/test-renewal-proof')return Response.json(await proveRenewal(f));
    if (path === '/test-proof') {
      const challenge = await f.prove();
      const campaign = await draft(f);
      const approval = await f.lifecycle.approval.approve(campaign);
      if (approval.kind !== 'approved') return Response.json({ approval }, { status: 409 });
      await f.lifecycle.delivery.dispatchStep({ ...campaign, channel: 'email' });
      const session = await bootstrapSession(f.platform);
      const operator = session.operator;
      return Response.json({ campaign, challengeId: challenge.id, approval, session: session.token, outbound: f.outbound });
    }
    return await createApp(f.bindings, f.platform).fetch(request, f.bindings);
  } finally { await f.dispose(); }
} };

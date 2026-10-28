import worker from './worker';
import { createFixturePlatform } from '../support/local-platform';
import { testIdentity } from '../support/test-identity';
import type { LocalAppBindings } from '../support/fixture-app';

// Native identity bootstrap only; all campaign/check/acknowledgement calls use the production routes.
export default {
  ...worker,
  async fetch(request: Request, bindings: LocalAppBindings, context: ExecutionContext) {
    if (new URL(request.url).pathname === '/_advisory/second-operator') {
      if (request.headers.get('X-Test-Token') !== bindings.LOCAL_BOOTSTRAP_TOKEN) return new Response('Forbidden', {status: 403});
      const identity = testIdentity(createFixturePlatform(bindings, bindings.LOCAL_BOOTSTRAP_TOKEN));
      await identity.importLocalDemoOperator({id: 'advisory-second-operator', email: 'second@example.test', displayName: 'Second operator'}, new Date());
      return Response.json(await identity.createTestSession('advisory-second-operator'));
    }
    return worker.fetch(request, bindings, context);
  },
} satisfies ExportedHandler<LocalAppBindings>;

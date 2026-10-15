import { installSignupChallengeEdge } from './signup-challenge-edge';
import { signupFixtureMailer } from './signup-mail-edge';
import { dispatchDocuments } from '../../src/core/app/document-dispatch';
import { createFixturePlatform } from './local-platform';
import { createLocalApp } from './fixture-app';
import type { LocalAppBindings } from './fixture-app';
import authoringWorker from '../campaign-authoring/advisory-worker';

interface FixtureBindings extends LocalAppBindings {
  AUTHORING_DB: D1Database;
  MANGO_FIXTURE_TURNSTILE?: string;
}

export default {
  fetch(request, environment, executionContext) {
    const bindings = environment as FixtureBindings;
    if (request.headers.has('X-Mango-Authoring-Fixture')) {
      if (request.headers.get('X-Mango-Authoring-Fixture') !== bindings.LOCAL_BOOTSTRAP_TOKEN) return new Response('Forbidden', { status: 403 });
      // Only fixture selection uses this token. The unchanged authoring worker
      // still authenticates every product route with its native session cookie.
      return authoringWorker.fetch(request, { ...bindings, DB: bindings.AUTHORING_DB }, executionContext);
    }
    const platform = createFixturePlatform(bindings, bindings.LOCAL_BOOTSTRAP_TOKEN);
    if (bindings.MANGO_FIXTURE_TURNSTILE === '1') {
      installSignupChallengeEdge();
      platform.config.signupTurnstile = {siteKey:'fixture-public-site',secretKey:'fixture-server-secret'};
      platform.mailer = signupFixtureMailer();
    }
    return dispatchDocuments(request, bindings, executionContext, platform, createLocalApp(bindings, platform));
  },
} satisfies ExportedHandler<FixtureBindings>;

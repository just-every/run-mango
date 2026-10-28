import { installSignupChallengeEdge } from './signup-challenge-edge';
import { signupFixtureMailer } from './signup-mail-edge';
import { dispatchDocuments } from '../../src/core/app/document-dispatch';
import { createFixturePlatform } from './local-platform';
import { createLocalApp } from './fixture-app';
import type { LocalAppBindings } from './fixture-app';

interface FixtureBindings extends LocalAppBindings {
  MANGO_FIXTURE_TURNSTILE?: string;
  MANGO_FIXTURE_SIGNUP_MAIL?: string;
}

export default {
  fetch(request, environment, executionContext) {
    const bindings = environment as FixtureBindings;
    const platform = createFixturePlatform(bindings, bindings.LOCAL_BOOTSTRAP_TOKEN);
    if (bindings.MANGO_FIXTURE_TURNSTILE === '1') {
      installSignupChallengeEdge();
      platform.config.signupTurnstile = {siteKey:'fixture-public-site',secretKey:'fixture-server-secret'};
    }
    if (bindings.MANGO_FIXTURE_SIGNUP_MAIL === '1' || bindings.MANGO_FIXTURE_TURNSTILE === '1') {
      platform.confirmationMailer = signupFixtureMailer(() => platform.config.mailSender);
      if (bindings.MANGO_FIXTURE_TURNSTILE === '1') platform.mailer = platform.confirmationMailer;
    }
    return dispatchDocuments(request, bindings, executionContext, platform, createLocalApp(bindings, platform));
  },
} satisfies ExportedHandler<FixtureBindings>;

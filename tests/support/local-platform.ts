import { createLocalPlatform } from '../../src/core/platform/runtime';
import type { AppBindings } from '../../src/core/shared/platform';

// Existing fixture identities retain their recorded hash authority explicitly.
// Production/local application entrypoints must supply their own configuration.
export function createFixturePlatform(bindings: AppBindings, signingKey: string) {
  const platform = createLocalPlatform({ ...bindings, MANGO_LOCAL_HASH_AUTHORITY: 'contact-salt-v1', CONTACT_HASH_SALT: signingKey }, signingKey);
  // Operator fixtures represent an installation that has completed sender setup.
  // Fresh rer journeys use the real local entrypoint and its incomplete identity.
  platform.config.mailSender = {
    displayName: 'Mango local',
    fromEmail: 'newsletter@example.test',
    replyToEmail: 'reply@example.test',
    physicalAddress: '123 Test Street, Brisbane QLD 4000, Australia',
  };
  return platform;
}

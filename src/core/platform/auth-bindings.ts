import type { AppBindings } from '@/core/shared/platform';

/** Base setup fields and Mango's released deployment fields are explicit configuration profiles. */
export function authBindings(environment: AppBindings): AppBindings {
  const origin = environment.AUTH_ORIGIN?.trim();
  if (origin) {
    if (environment.MANGO_PUBLIC_BASE_URL?.trim() && environment.MANGO_PUBLIC_BASE_URL.trim() !== origin) {
      throw new Error('Application origin declarations conflict. Use the same installation origin.');
    }
    environment = {...environment, MANGO_PUBLIC_BASE_URL: origin};
  }
  if (!['OWNER_EMAIL','SESSION_SECRET','SETUP_TOKEN'].some(name => Object.hasOwn(environment,name))) return environment;
  for (const name of ['OWNER_EMAIL','SESSION_SECRET'] as const) {
    if (!environment[name]?.trim()) throw new Error(`${name} is required for the Base setup configuration profile.`);
  }
  if ((environment.INITIAL_OPERATOR_EMAILS && environment.INITIAL_OPERATOR_EMAILS !== environment.OWNER_EMAIL)
    || (environment.SESSION_SIGNING_KEY && environment.SESSION_SIGNING_KEY !== environment.SESSION_SECRET)
    || (environment.AUTH_SETUP_TOKEN && environment.AUTH_SETUP_TOKEN !== environment.SETUP_TOKEN)) {
    throw new Error('Auth configuration profiles conflict. Restore the matching installation configuration.');
  }
  // In this profile the owner is the test-send recipient unless MANGO_TEST_EMAIL_ALLOWLIST names others.
  return {...environment,MANGO_TEST_EMAIL_ALLOWLIST:environment.MANGO_TEST_EMAIL_ALLOWLIST?.trim()||environment.OWNER_EMAIL!,INITIAL_OPERATOR_EMAILS:environment.OWNER_EMAIL!,SESSION_SIGNING_KEY:environment.SESSION_SECRET!,AUTH_SETUP_TOKEN:environment.SETUP_TOKEN};
}

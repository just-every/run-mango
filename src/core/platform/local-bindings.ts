import type { AppBindings } from '@/core/shared/platform';

/** Local format 2 uses Base's canonical command fields. Production bindings are unchanged. */
export function localBindings(environment: AppBindings): AppBindings {
  if (environment.MANGO_LOCAL_CONFIG_VERSION !== '2') return environment;
  for (const name of ['OWNER_EMAIL', 'SESSION_SECRET', 'SETUP_TOKEN', 'AUTH_ORIGIN'] as const) {
    if (!environment[name]?.trim()) throw new Error(`${name} is required for local configuration format 2.`);
  }
  return { ...environment, INITIAL_OPERATOR_EMAILS: environment.OWNER_EMAIL!,
    SESSION_SIGNING_KEY: environment.SESSION_SECRET!, AUTH_SETUP_TOKEN: environment.SETUP_TOKEN,
    MANGO_PUBLIC_BASE_URL: environment.RER_DEV_ORIGIN || environment.AUTH_ORIGIN! };
}

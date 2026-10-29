import type { AppBindings, AppConfig } from '@/core/shared/platform';
import { demoModules } from './demo/modules';

/** Demo configuration never consumes the installation's provider credentials. */
export function demoConfig(env: AppBindings): AppConfig {
  if (env.RER_DEMO !== '1' || !env.SESSION_SECRET || !env.OWNER_EMAIL) throw new Error('Demo identity is missing.');
  const origin = new URL(env.RER_DEV_ORIGIN || env.MANGO_PUBLIC_BASE_URL || env.AUTH_ORIGIN!);
  return {
    demo: true, local: ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname),
    sessionSigningKey: env.SESSION_SECRET, authSetupToken: env.SETUP_TOKEN,
    initialOperatorEmails: [env.OWNER_EMAIL], contactHashSalt: env.SESSION_SECRET,
    modules: demoModules(),
    mailProvider: 'resend', mailProviderApiKey: 'demo-only', mailAuthFrom: 'hello@example.test', mailWebhookSecret: '', mailWebhookId: '',
    // The sample letters link to the demo's own pages (demo-links.ts).
    publicBaseUrl: origin, appVersion: 'demo', allowedLinkHosts: [origin.hostname],
    testEmailAllowlist: [env.OWNER_EMAIL], providerReconciliationIntervalMinutes: 15,
    unresolvedProviderOutcomeHours: 1, emailHandoffsPerMinute: 10, deliverabilityReportingWindowDays: 30,
    mailSender: { displayName: 'Mango Sample Store', fromEmail: 'hello@example.test', replyToEmail: 'hello@example.test',
      physicalAddress: '1 Sample Street, Brisbane QLD 4000, Australia' },
    // The public form exercises its real verification call. This public verification read runs for real with published test keys.
    signupTurnstile: { siteKey: '1x00000000000000000000AA', secretKey: '1x0000000000000000000000000000000AA' },
  };
}

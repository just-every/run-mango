import type { AppBindings, AppConfig } from '@/core/shared/platform';
import { optionalModuleInputs, unavailableModule } from './config';

/** Demo configuration never consumes the installation's provider credentials. */
export function demoConfig(env: AppBindings): AppConfig {
  if (env.RER_DEMO !== '1' || !env.SESSION_SECRET || !env.OWNER_EMAIL) throw new Error('Demo identity is missing.');
  const origin = new URL(env.RER_DEV_ORIGIN || env.MANGO_PUBLIC_BASE_URL || env.AUTH_ORIGIN!);
  return {
    demo: true, local: ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname),
    sessionSigningKey: env.SESSION_SECRET, authSetupToken: env.SETUP_TOKEN,
    initialOperatorEmails: [env.OWNER_EMAIL], contactHashSalt: env.SESSION_SECRET,
    modules: {
      commerce: unavailableModule('Commerce', optionalModuleInputs.commerce),
      sms: unavailableModule('SMS', optionalModuleInputs.sms),
      ai: unavailableModule('AI', optionalModuleInputs.ai),
      design: unavailableModule('Design', optionalModuleInputs.design),
    },
    mailProviderApiKey: '', mailAuthFrom: 'hello@example.test', mailWebhookSecret: '', mailWebhookId: '',
    publicBaseUrl: origin, appVersion: 'demo', allowedLinkHosts: ['example.test'],
    testEmailAllowlist: [env.OWNER_EMAIL], providerReconciliationIntervalMinutes: 15,
    unresolvedProviderOutcomeHours: 1, emailHandoffsPerMinute: 10, deliverabilityReportingWindowDays: 30,
    mailSender: { displayName: 'Mango Sample Store', fromEmail: 'hello@example.test', replyToEmail: 'hello@example.test',
      physicalAddress: '1 Sample Street, Brisbane QLD 4000, Australia' },
    // The public form exercises its real verification call. The demo guard refuses it.
    signupTurnstile: { siteKey: '1x00000000000000000000AA', secretKey: '1x0000000000000000000000000000000AA' },
  };
}

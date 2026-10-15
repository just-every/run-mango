import type { AppConfig } from '@/core/shared/platform';

/** Non-secret demo accounts; never consume an installation's provider credentials. */
export function demoModules(): AppConfig['modules'] {
  const enabled = <T>(config: T) => ({ enabled: true as const, requiredInputs: [], missingInputs: [] as [], config });
  const now = Date.now(), windows = [{ days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440 }];
  return {
    commerce: enabled({ storeUrl: new URL('https://mango-sample.myshopify.com'), apiToken: 'demo-only', webhookSecret: 'demo-only', exclusiveShop: 'mango-sample.myshopify.com' }),
    sms: enabled({ providerApiKey: 'demo:demo', webhookSecret: 'demo-only', confirmationSender: 'MangoSample', testAllowlist: ['+61400000000'], handoffsPerMinute: 10,
      programme: { brand: 'Mango Sample Store', programme: 'Store notes', category: 'Store newsletter', frequency: 'Monthly', jurisdiction: 'AU', support: 'hello@example.test',
        providerAlreadyReplies: false, policySource: 'https://example.com/', policyVerifiedAt: new Date(now).toISOString(), policyExpiresAt: new Date(now + 86400000).toISOString(),
        providerWindows: windows, jurisdictionWindows: windows, recipientWindows: windows } }),
    ai: enabled({ providerApiKey: 'demo-only', model: 'demo' }),
    design: enabled({ providerApiKey: 'demo-only', origin: new URL('https://12ui.com') }),
  };
}

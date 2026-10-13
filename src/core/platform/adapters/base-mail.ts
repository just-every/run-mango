// @ts-expect-error Base mail ships portable ESM; its interface is validated at runtime.
import { createMailSender } from '@/vendor/base/mail/index.mjs';
import type { MailSender } from '@/vendor/base/operator-auth/index.mjs';
import type { AppConfig } from '@/core/shared/platform';
export function createBaseMailSender(config: Pick<AppConfig, 'mailProvider' | 'mailProviderApiKey'>): MailSender {
  return createMailSender({ provider: config.mailProvider, mode: 'production', apiKey: config.mailProviderApiKey });
}

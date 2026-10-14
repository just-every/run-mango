// @ts-expect-error Base mail ships portable ESM; its interface is validated at runtime.
import { createMailSender } from '@/vendor/base/mail/index.mjs';
import type { MailSender } from '@/vendor/base/operator-auth/index.mjs';
import type { AppConfig } from '@/core/shared/platform';
import type { Database } from '@/core/platform/db/client';
import { prepareAuthMailCost } from '@/core/features/auth/mail-cost';

export function createBaseMailSender(config: Pick<AppConfig, 'mailProvider' | 'mailProviderApiKey'>, database: Pick<Database, '$client'>): MailSender {
  const sender: MailSender = createMailSender({ provider: config.mailProvider, mode: 'production', apiKey: config.mailProviderApiKey });
  const provider = config.mailProvider;
  if (!provider) throw new Error('Mail provider is not configured.');
  return { async send(message) {
    // Base owns the token, authorization and envelope. Accounting never changes or retries its transport.
    const settle = await prepareAuthMailCost(database, provider, message.deliveryId);
    let result: Awaited<ReturnType<MailSender['send']>>;
    try { result = await sender.send(message); }
    catch (error) { await settle('unknown').catch(() => {}); throw error; }
    // Keep the provider receipt unchanged if enrichment fails: the durable prepared fact remains visible.
    await settle(result.status === 'accepted' ? 'accepted'
      : result.status === 'rejected' || result.status === 'rate_limited' ? 'rejected' : 'unknown').catch(() => {});
    return result;
  } };
}

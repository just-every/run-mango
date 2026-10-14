import {senderDomain} from '@/core/features/lifecycle/provider-holds';
import { reserveTransport } from '@/core/features/lifecycle/transport-pacing';
import { boundPolicy } from '@/core/features/lifecycle/transport-policy';
import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
// @ts-expect-error Base mail ships portable ESM; its interface is validated at runtime.
import { createMailSender } from '@/vendor/base/mail/index.mjs';
import type { MailSender } from '@/vendor/base/operator-auth/index.mjs';
import type { AppConfig } from '@/core/shared/platform';
import type { Database } from '@/core/platform/db/client';
import { prepareAuthMailCost } from '@/core/features/auth/mail-cost';

export function createBaseMailSender(config: Pick<AppConfig, 'mailProvider' | 'mailProviderApiKey' | 'emailHandoffsPerMinute' | 'deliveryPolicies'>, database: Pick<Database, '$client'>): MailSender {
  const sender: MailSender = createMailSender({ provider: config.mailProvider, mode: 'production', apiKey: config.mailProviderApiKey });
  const provider = config.mailProvider;
  if (!provider) throw new Error('Mail provider is not configured.');
  return { async send(message) {
    // Base owns the token, authorization and envelope. Accounting never changes or retries its transport.
    const policy=await boundPolicy(config.deliveryPolicies?.[provider],config.mailProviderApiKey);
    if(config.deliveryPolicies?.[provider]&&!policy)throw new ProviderDeferredError(new Date(Date.now()+60000),'provider-policy-unavailable');
    const held=await database.$client.prepare("SELECT 1 FROM provider_holds WHERE provider=? AND held=1 AND (scope='account' OR scope=?)").bind(provider,`domain:${senderDomain(message.from)}`).first();
    const outage=await database.$client.prepare("SELECT 1 FROM provider_outages WHERE channel='email' AND state='paused'").first();
    if(held||outage)throw new ProviderDeferredError(new Date(Date.now()+60000),held?'provider-hold':'provider-outage');
    await reserveTransport(database,`${provider}:${policy?.account??'installation'}`,Math.min(config.emailHandoffsPerMinute,policy?.providerPerMinute??config.emailHandoffsPerMinute));
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

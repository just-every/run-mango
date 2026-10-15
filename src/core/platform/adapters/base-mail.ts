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

export function createBaseMailSender(config: Pick<AppConfig, 'mailProvider' | 'mailProviderApiKey' | 'mailRelayUrl' | 'emailHandoffsPerMinute' | 'deliveryPolicies'>, database: Pick<Database, '$client'>): MailSender {
  let retryAfterSeconds = 0;
  const sender = createMailSender({ provider: config.mailProvider, mode: 'production', apiKey: config.mailProviderApiKey,
    ...(config.mailProvider === 'rer' ? { relayUrl: config.mailRelayUrl } : {}) }, {
    fetch: async (url: string, init: RequestInit) => {
      const response = await fetch(url, init);
      if (response.status === 429) {
        const seconds = Number(response.headers.get('retry-after'));
        if (Number.isFinite(seconds) && seconds > 0) retryAfterSeconds = seconds;
      }
      return response;
    },
  });
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
    // The Managed relay owns the envelope; Base auth's Auto-Submitted header is not a relay feature.
    const { deliveryId, from, to, subject, text, html } = message;
    try { result = await sender.send(provider === 'rer'
      ? { deliveryId, from, to, subject, text, ...(html ? { html } : {}) } : message); }
    catch (error) { await settle('unknown').catch(() => {}); throw error; }
    // Keep the provider receipt unchanged if enrichment fails: the durable prepared fact remains visible.
    await settle(result.status === 'accepted' ? 'accepted'
      : result.status === 'rejected' || result.status === 'rate_limited' ? 'rejected' : 'unknown').catch(() => {});
    if (provider === 'rer' && result.status === 'rate_limited' && retryAfterSeconds) {
      // Native auth revokes the refused link. A fresh request may retry after the provider's cooldown.
      await database.$client.prepare('UPDATE provider_pacing SET next_at=MAX(next_at,?) WHERE scope=?')
        .bind(Date.now() + retryAfterSeconds * 1000, `${provider}:${policy?.account ?? 'installation'}`).run();
    }
    return result;
  } };
}

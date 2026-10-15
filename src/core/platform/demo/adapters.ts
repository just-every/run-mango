import type { AppBindings, AppConfig, Platform, SenderAdapter } from '@/core/shared/platform';
import { createResendAdapter } from '../adapters/resend';
import { createMobileMessageAdapter } from '../adapters/mobile-message';
import { createShopifyAdapter } from '../adapters/shopify';
import { createOpenAiAdapter } from '../adapters/openai';
import { createTwelveUiAdapter } from '../adapters/twelve-ui';
import { createDatabase } from '../db/client';
import { createSenderVerification } from '@/core/features/sender-verification/service';
import { demoVerification } from './verification';
import { sha256 } from '@/core/shared/ids';
import { demoResult } from './effect';
import { demoProposal } from './proposal';
import { demoDesign } from './design';

function sender(real: SenderAdapter): SenderAdapter {
  return { ...real,
    probeHealth: signal => demoResult(() => real.probeHealth!(signal), () => ({ reachable: true, code: 'ok', observedAt: new Date(), evidence: 'demo' })),
    capabilities: () => demoResult(() => real.capabilities(), async () => ({ ...await real.capabilities(), effectiveDeduplication: true, effectiveReconciliation: true, deduplicationWindowMs: 30 * 86400000, reconciliationWindowMs: 30 * 86400000 })),
    reconcile: (request, state) => demoResult(() => real.reconcile(request, state), async () => ({ exhausted: true, facts: [{ identity: `demo:${request.idempotencyKey}`, providerMessageId: state.providerMessageId, kind: 'delivered' as const, occurredAt: new Date(), payloadDigest: await sha256(request.idempotencyKey), detail: { demo: true } }] })),
    validateSender: (value, country) => demoResult(() => real.validateSender(value, country), () => ({ ready: true, detail: 'Sender is ready.' })),
    // SMS has a provider-specific receipt shape, unlike the guard's generic JSON response.
    ...(real.channel === 'sms' ? { send: (request: Parameters<SenderAdapter['send']>[0]) => demoResult(() => real.send(request), () => ({
      providerMessageId: `demo_${crypto.randomUUID()}`, disposition: 'accepted' as const, providerAcceptedAt: new Date(), actualSender: request.sender,
    })) } : {}),
  };
}

export function createDemoAdapters(env: AppBindings, config: AppConfig): Pick<Platform, 'mailer' | 'sms' | 'commerce' | 'ai' | 'design'> {
  if (env.RER_DEMO !== '1') throw new Error('Demo adapters require RER_DEMO.');
  const database = createDatabase(env.DB);
  const verification = demoVerification(createSenderVerification({ database, config }), database, config);
  const commerce = createShopifyAdapter({ storeUrl: new URL('https://mango-sample.myshopify.com'), accessToken: 'demo-only', webhookSecret: 'demo-only' });
  const ai = createOpenAiAdapter({ apiKey: 'demo-only', model: 'demo' });
  return {
    mailer: sender(createResendAdapter({ apiKey: 'demo-only', webhookSecret: 'demo-only', webhookId: 'demo', verification })),
    sms: sender(createMobileMessageAdapter({ credentials: 'demo:demo', webhookSecret: 'demo-only' })),
    commerce: { ...commerce,
      refreshHealth: () => demoResult(() => commerce.refreshHealth!(), () => undefined),
      synchronize: (...args) => demoResult(() => commerce.synchronize(...args), async () => {
        const [{ sampleData }, { demoCustomerRecords }] = await Promise.all([import('@/core/features/bootstrap/sample-data'), import('@/core/features/bootstrap/demo-audience')]);
        return { records: args[0] === 'customer' ? demoCustomerRecords(sampleData, new Date()) : [], coverage: { mode: 'snapshot' as const, exhaustive: true, complete: true } };
      }),
    },
    ai: { costIdentity: ai.costIdentity, generateGroundedJson: request => demoResult(() => ai.generateGroundedJson(request), () => demoProposal(request, config)) },
    design: demoDesign(createTwelveUiAdapter({ apiKey: 'demo-only', origin: new URL('https://12ui.com') }), env),
  };
}

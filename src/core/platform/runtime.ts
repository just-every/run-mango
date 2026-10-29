import { pacedAdapter } from '@/core/features/lifecycle/transport-pacing';
import { readDeliveryPolicies } from '@/core/features/lifecycle/transport-policy';
import { createReceiptConnector } from '@/core/features/sender-verification/qa-inbox';
import { createSendgridAdapter } from './adapters/sendgrid';
import { createDatabase, type Database } from '@/core/platform/db/client';
import { localBindings } from './local-bindings';
import { createSenderVerification } from '@/core/features/sender-verification/service';
import type {
  AppBindings,
  AppConfig,
  Platform,
  SenderAdapter,
} from '@/core/shared/platform';

import { createMobileMessageAdapter } from './adapters/mobile-message';
import { createOpenAiAdapter } from './adapters/openai';
import { createResendAdapter } from './adapters/resend';
import { createRerAdapter } from './adapters/rer';
import { createShopifyAdapter } from './adapters/shopify';
import { createTwelveUiAdapter } from './adapters/twelve-ui';
import { createBlobStore } from './blobs';
import { optionalModuleInputs, readDesignModule, readProductionConfig, unavailableModule } from './config';
import { createJobDispatcher } from './jobs';
import { createLinkInspector } from './link-inspector';
import { createPublicTokenSigner } from './public-tokens';
import { localContactHashSalt } from './local-contact-authority';
import { suppressedSenderInspection } from './suppressed-inspection';
import { configuredLinkHosts } from '@/core/features/settings/link-hosts-validation';
import { sha256 } from '@/core/shared/ids';

/** Local mail is silently suppressed: a send, a test or an approved campaign succeeds quietly and nothing leaves this computer. */
function localSender(database: Database, config: AppConfig): SenderAdapter {
  const unavailable = () => {
    throw new Error('A copy running on your computer receives no provider events.');
  };
  const days = 30 * 86400000;
  return {
    channel: 'email',
    async capabilities() {
      return {
        configured: true,
        canSendMarketing: true,
        effectiveDeduplication: true,
        effectiveReconciliation: true,
        deduplicationWindowMs: days,
        reconciliationWindowMs: days,
        detail: 'Mail is suppressed on this computer.',
      };
    },
    async probeHealth() {
      return { reachable: true, code: 'ok', observedAt: new Date(), evidence: 'local' };
    },
    async validateSender() {
      return { ready: true, detail: 'Sender is ready.' };
    },
    inspectSender: sender => suppressedSenderInspection(database, config, sender, 'local'),
    async send(request) {
      return { providerMessageId: `local-suppressed:${request.idempotencyKey}`, disposition: 'accepted', providerAcceptedAt: new Date() };
    },
    async reconcile(request, state) {
      return { exhausted: true, facts: [{ identity: `local:${request.idempotencyKey}`, providerMessageId: state.providerMessageId, kind: 'delivered', occurredAt: new Date(), payloadDigest: await sha256(request.idempotencyKey), detail: { local: true } }] };
    },
    verifyWebhook: unavailable,
  };
}

/** The design adapter exists only when its module is enabled (DESIGN-001); otherwise nothing is constructed or contacted. */
function designAdapter(module: AppConfig['modules']['design']) {
  return module.enabled ? { design: createTwelveUiAdapter({ apiKey: module.config.providerApiKey, origin: module.config.origin }) } : {};
}

export function compose(environment: AppBindings, config: AppConfig, adapters: Pick<Platform, 'commerce' | 'ai' | 'design' | 'mailer' | 'confirmationMailer' | 'sms'>): Platform {
  return {
    database: createDatabase(environment.DB),
    config,
    ...adapters,
    jobs: createJobDispatcher(environment.MANGO_JOBS),
    blobs: createBlobStore(environment.ASSETS_BUCKET),
    linkInspector: createLinkInspector(config.allowedLinkHosts),
    publicTokens: createPublicTokenSigner(config.sessionSigningKey),
  };
}

export function createProductionPlatform(environment: AppBindings): Platform {
  const config = readProductionConfig(environment);
  config.deliveryPolicies = readDeliveryPolicies(environment.MANGO_DELIVERY_POLICY_JSON);
  const verification = createSenderVerification({ database: createDatabase(environment.DB), config,
    receiver: config.mailboxReceiptUrl ? createReceiptConnector(config.mailboxReceiptUrl, config.mailboxReceiptRecipient) : undefined });
  const adapters: Pick<Platform, 'commerce' | 'ai' | 'design' | 'mailer' | 'confirmationMailer' | 'sms'> = {
    ...designAdapter(config.modules.design),
    mailer: config.mailProvider === 'rer' ? createRerAdapter(config)
      : config.mailProvider === 'sendgrid' ? createSendgridAdapter({ apiKey: config.mailProviderApiKey, webhookPublicKey: config.mailWebhookSecret, verification }) : createResendAdapter({
      apiKey: config.mailProviderApiKey,
      webhookSecret: config.mailWebhookSecret,
      webhookId: config.mailWebhookId,
      verification,
      retentionPolicy:config.deliveryPolicies?.resend,
    }),
  };
  if (config.modules.commerce.enabled) {
    adapters.commerce = createShopifyAdapter({
      storeUrl: config.modules.commerce.config.storeUrl,
      accessToken: config.modules.commerce.config.apiToken,
      webhookSecret: config.modules.commerce.config.webhookSecret,
      exclusiveShop: config.modules.commerce.config.exclusiveShop,
      observations: config.modules.commerce.config.observations,
      database: createDatabase(environment.DB),
    });
  }
  if (config.modules.ai.enabled) {
    adapters.ai = createOpenAiAdapter({
      apiKey: config.modules.ai.config.providerApiKey,
      model: config.modules.ai.config.model,
    });
  }
  if (config.modules.sms.enabled) {
    adapters.sms = createMobileMessageAdapter({
      credentials: config.modules.sms.config.providerApiKey,
      webhookSecret: config.modules.sms.config.webhookSecret,
      retentionPolicy:config.deliveryPolicies?.['mobile-message'],
    });
  }
  const database=createDatabase(environment.DB);
  adapters.mailer=pacedAdapter(adapters.mailer,database,config);
  if (config.authMail) {
    const transactional = {...config, mailProvider: config.authMail.provider, mailProviderApiKey: config.authMail.apiKey, mailRelayUrl: config.authMail.relayUrl};
    adapters.confirmationMailer = pacedAdapter(createRerAdapter(transactional), database, transactional);
  }
  if(adapters.sms) adapters.sms=pacedAdapter(adapters.sms,database,config);
  return { ...compose(environment, config, adapters), senderVerification: verification };
}

export function createLocalPlatform(environment: AppBindings, localSigningKey: string): Platform {
  environment = localBindings(environment);
  if (environment.MANGO_LOCAL_CONFIG_VERSION === '2') localSigningKey = environment.SESSION_SIGNING_KEY;
  // A copy running on a computer may try design generation with the owner's own key in .dev.vars (decision D8a).
  const design = readDesignModule(environment, { local: true });
  const config: AppConfig = {
    sessionSigningKey: localSigningKey,
    initialOperatorEmails: (environment.INITIAL_OPERATOR_EMAILS ?? "").split(",").filter(Boolean),
    authSetupToken: environment.AUTH_SETUP_TOKEN,
    contactHashSalt: localContactHashSalt(environment),
    modules: {
      commerce: unavailableModule('Commerce', optionalModuleInputs.commerce),
      sms: unavailableModule('SMS', optionalModuleInputs.sms),
      ai: unavailableModule('AI', optionalModuleInputs.ai),
      design,
    },
    mailProviderApiKey: '',
    mailAuthFrom: 'auth@localhost.test',
    mailWebhookSecret: '',
    mailWebhookId: '',
    publicBaseUrl: new URL(environment.MANGO_PUBLIC_BASE_URL || 'http://127.0.0.1'),
    appVersion: 'local',
    local: true,
    allowedLinkHosts: configuredLinkHosts(environment.MANGO_ALLOWED_LINK_HOSTS, new URL(environment.MANGO_PUBLIC_BASE_URL || 'http://127.0.0.1')),
    testEmailAllowlist: ['local@example.test'],
    providerReconciliationIntervalMinutes: 15,
    unresolvedProviderOutcomeHours: 1,
    emailHandoffsPerMinute: 1,
    deliverabilityReportingWindowDays: 30,
    mailSender: {
      // Local installations start with no sender identity; /setup collects the real one.
      displayName: '',
      fromEmail: '',
      replyToEmail: '',
      physicalAddress: '',
    },
  };
  return compose(environment, config, {
    ...designAdapter(design),
    mailer: localSender(createDatabase(environment.DB), config),
  });
}

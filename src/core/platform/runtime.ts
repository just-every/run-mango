import { demoConfig } from './demo-config';
import { createDemoAdapters } from './demo/adapters';
import { pacedAdapter } from '@/core/features/lifecycle/transport-pacing';
import { readDeliveryPolicies } from '@/core/features/lifecycle/transport-policy';
import { createReceiptConnector } from '@/core/features/sender-verification/qa-inbox';
import { createSendgridAdapter } from './adapters/sendgrid';
import { createDatabase } from '@/core/platform/db/client';
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
import { createShopifyAdapter } from './adapters/shopify';
import { createTwelveUiAdapter } from './adapters/twelve-ui';
import { createBlobStore } from './blobs';
import { optionalModuleInputs, readDesignModule, readProductionConfig, unavailableModule } from './config';
import { createJobDispatcher } from './jobs';
import { createLinkInspector } from './link-inspector';
import { createPublicTokenSigner } from './public-tokens';
import { localContactHashSalt } from './local-contact-authority';
import { configuredLinkHosts } from '@/core/features/settings/link-hosts-validation';
import { createD1DevelopmentOutbox } from '@/vendor/base/mail/src/development/index.mjs';

/** A copy on a computer sends no marketing. Consent confirmations land in the local
 * development outbox beside sign-in mail, so signup can be completed locally. */
function localSender(database: D1Database): SenderAdapter {
  const outbox = createD1DevelopmentOutbox({ db: database });
  const unavailable = () => {
    throw new Error('Sending is off on a copy running on your computer. Deploy Mango with a mail provider to send email.');
  };
  return {
    channel: 'email',
    async capabilities() {
      return {
        configured: false,
        canSendMarketing: false,
        effectiveDeduplication: false,
        effectiveReconciliation: false,
        deduplicationWindowMs: 0,
        reconciliationWindowMs: 0,
        detail: 'Sending is off on a copy running on your computer. Drafts, previews, imports and signup work here; deploy Mango with a mail provider to send letters.',
      };
    },
    async validateSender() {
      return { ready: false, detail: 'Sending is off on a copy running on your computer.' };
    },
    async send(request) {
      if (request.purpose !== 'consent-confirmation') unavailable();
      await outbox.put({ deliveryId: request.idempotencyKey, from: request.sender, to: [request.to], subject: request.content.subject ?? '',
        text: request.content.text, ...(request.content.html ? { html: request.content.html } : {}),
        ...(request.content.replyTo ? { replyTo: request.content.replyTo } : {}) });
      return { providerMessageId: `local-outbox:${request.idempotencyKey}`, disposition: 'accepted', providerAcceptedAt: new Date() };
    },
    reconcile: unavailable,
    verifyWebhook: unavailable,
  };
}

/** The design adapter exists only when its module is enabled (DESIGN-001); otherwise nothing is constructed or contacted. */
function designAdapter(module: AppConfig['modules']['design']) {
  return module.enabled ? { design: createTwelveUiAdapter({ apiKey: module.config.providerApiKey, origin: module.config.origin }) } : {};
}

function compose(environment: AppBindings, config: AppConfig, adapters: Pick<Platform, 'commerce' | 'ai' | 'design' | 'mailer' | 'sms'>): Platform {
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
  if (environment.RER_DEMO === '1') {
    const config = demoConfig(environment);
    return compose(environment, config, createDemoAdapters(environment, config));
  }
  const config = readProductionConfig(environment);
  config.deliveryPolicies = readDeliveryPolicies(environment.MANGO_DELIVERY_POLICY_JSON);
  const verification = createSenderVerification({ database: createDatabase(environment.DB), config,
    receiver: config.mailboxReceiptUrl ? createReceiptConnector(config.mailboxReceiptUrl, config.mailboxReceiptRecipient) : undefined });
  const adapters: Pick<Platform, 'commerce' | 'ai' | 'design' | 'mailer' | 'sms'> = {
    ...designAdapter(config.modules.design),
    mailer: config.mailProvider === 'sendgrid' ? createSendgridAdapter({ apiKey: config.mailProviderApiKey, webhookPublicKey: config.mailWebhookSecret, verification }) : createResendAdapter({
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
  if(adapters.sms) adapters.sms=pacedAdapter(adapters.sms,database,config);
  return { ...compose(environment, config, adapters), senderVerification: verification };
}

export function createLocalPlatform(environment: AppBindings, localSigningKey: string): Platform {
  if (environment.RER_DEMO === '1') {
    const config = demoConfig(environment);
    return compose(environment, config, createDemoAdapters(environment, config));
  }
  environment = localBindings(environment);
  if (environment.MANGO_LOCAL_CONFIG_VERSION === '2') localSigningKey = environment.SESSION_SIGNING_KEY;
  // A copy running on a computer may try design generation with the owner's own key in .dev.vars (decision D8a).
  const design = readDesignModule(environment, { local: true });
  return compose(environment, {
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
  }, {
    ...designAdapter(design),
    mailer: localSender(environment.DB),
  });
}

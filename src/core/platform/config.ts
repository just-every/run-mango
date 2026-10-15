import { smsProgrammeSchema } from '../features/sms/policy.ts';
import type { AppBindings, AppConfig, OptionalModuleConfig } from '@/core/shared/platform';
import { authBindings } from './auth-bindings.ts';

export const optionalModuleInputs = {
  commerce: ['COMMERCE_STORE_URL', 'COMMERCE_API_TOKEN', 'COMMERCE_WEBHOOK_SECRET', 'COMMERCE_EXCLUSIVE_SHOP'],
  sms: [
    'SMS_PROVIDER_API_KEY',
    'SMS_WEBHOOK_SECRET',
    'SMS_CONFIRMATION_SENDER',
    'SMS_PROGRAMME_POLICY',
    'MANGO_TEST_SMS_ALLOWLIST',
    'MANGO_SMS_HANDOFFS_PER_MINUTE',
  ],
  ai: ['AI_PROVIDER_API_KEY', 'AI_PROVIDER_MODEL'],
  design: ['DESIGN_PROVIDER_API_KEY', 'DESIGN_PROVIDER_ORIGIN'],
} as const satisfies Record<string, readonly (keyof AppBindings)[]>;

export function unavailableModule<Config>(name: string, requiredInputs: readonly string[]): OptionalModuleConfig<Config> {
  const inputs = [...requiredInputs];
  return {
    enabled: false,
    requiredInputs: inputs,
    missingInputs: inputs,
    detail: `${name} is unavailable until ${inputs.join(', ')} are configured.`,
  };
}

function required(environment: AppBindings, name: keyof AppBindings): string {
  const value = environment[name];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

function requiredUrl(environment: AppBindings, name: keyof AppBindings): URL {
  const value = required(environment, name);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTPS URL.`);
  }
  if (url.protocol !== 'https:') throw new Error(`${name} must be an absolute HTTPS URL.`);
  return url;
}

function emails(value: string, name: string): string[] {
  const parsed = value
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (parsed.length === 0 || parsed.some((email) => !/^\S+@\S+\.\S+$/.test(email))) {
    throw new Error(`${name} must be a comma-separated list of email addresses.`);
  }
  return [...new Set(parsed)];
}

function commaValues(environment: AppBindings, name: keyof AppBindings): string[] {
  const values = required(environment, name).split(',').map((value) => value.trim()).filter(Boolean);
  if (values.length === 0) throw new Error(`${name} must contain at least one comma-separated value.`);
  return [...new Set(values)];
}

function positiveInteger(environment: AppBindings, name: keyof AppBindings): number {
  const value = Number(required(environment, name));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer.`);
  return value;
}

function linkHosts(environment: AppBindings): string[] {
  const hosts = commaValues(environment, 'MANGO_ALLOWED_LINK_HOSTS').map((value) => value.toLowerCase());
  if (hosts.some((host) => !/^[a-z0-9.-]+$/i.test(host))) {
    throw new Error('MANGO_ALLOWED_LINK_HOSTS must be a comma-separated list of DNS host names.');
  }
  return hosts;
}

function optionalModule<Config, Name extends keyof AppBindings & string>(
  environment: AppBindings,
  name: string,
  inputs: readonly Name[],
  parse: () => Config,
): OptionalModuleConfig<Config> {
  const missing = inputs.filter((input) => {
    const value = environment[input];
    return typeof value !== 'string' || value.trim() === '';
  });
  if (missing.length === inputs.length) return unavailableModule(name, inputs);
  if (missing.length) throw new Error(`${name} configuration is incomplete; missing: ${missing.join(', ')}.`);
  return {
    enabled: true,
    requiredInputs: [...inputs],
    missingInputs: [],
    config: parse(),
  };
}

const loopbackHosts = new Set(['127.0.0.1', 'localhost', '[::1]']);

/** The design service's origin (DESIGN-001): an HTTPS origin with no path, such as https://12ui.com. A copy running
 * on a computer may also name a loopback http origin, so it can be tried against a local stand-in service. */
function designOrigin(environment: AppBindings, allowLoopbackHttp: boolean): URL {
  const message = 'DESIGN_PROVIDER_ORIGIN must be an HTTPS origin with no path, such as https://12ui.com.';
  let url: URL;
  try { url = new URL(required(environment, 'DESIGN_PROVIDER_ORIGIN')); } catch (error) {
    if (error instanceof Error && error.message.endsWith('is required.')) throw error;
    throw new Error(message);
  }
  const loopback = allowLoopbackHttp && url.protocol === 'http:' && loopbackHosts.has(url.hostname);
  if ((url.protocol !== 'https:' && !loopback) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error(message);
  return url;
}

/** The optional design module (DESIGN-001). Production and local copies read the same two inputs; only a local copy
 * accepts a loopback http origin. */
export function readDesignModule(environment: AppBindings, { local = false } = {}) {
  return optionalModule(environment, 'Design', optionalModuleInputs.design, () => ({
    providerApiKey: required(environment, 'DESIGN_PROVIDER_API_KEY'),
    origin: designOrigin(environment, local),
  }));
}

export function readProductionConfig(environment: AppBindings): AppConfig {
  environment = authBindings(environment);
  const siteKey = environment.TURNSTILE_SITE_KEY?.trim();
  const secretKey = environment.TURNSTILE_SECRET_KEY?.trim();
  if (Boolean(siteKey) !== Boolean(secretKey)) throw new Error('Turnstile requires both TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY.');
  const mailboxReceiptUrl = environment.MAILBOX_RECEIPT_URL?.trim();
  const mailboxReceiptRecipient = environment.MAILBOX_RECEIPT_RECIPIENT?.trim();
  if (Boolean(mailboxReceiptUrl) !== Boolean(mailboxReceiptRecipient)) throw new Error('Mailbox receiver requires both MAILBOX_RECEIPT_URL and MAILBOX_RECEIPT_RECIPIENT.');

  const signingKey = required(environment, 'SESSION_SIGNING_KEY');
  if (signingKey.length < 32 || signingKey.length > 1024) throw new Error('SESSION_SIGNING_KEY must contain 32–1024 characters.');
  if (environment.AUTH_SETUP_TOKEN !== undefined && (environment.AUTH_SETUP_TOKEN.length < 32 || environment.AUTH_SETUP_TOKEN.length > 1024)) throw new Error('AUTH_SETUP_TOKEN must contain 32–1024 characters.');
  const mailProvider = required(environment, 'MAIL_PROVIDER');
  if (!['resend', 'sendgrid'].includes(mailProvider)) throw new Error('MAIL_PROVIDER must be resend or sendgrid.');
  const modules: AppConfig['modules'] = {
    commerce: optionalModule(environment, 'Commerce', optionalModuleInputs.commerce, () => ({
      storeUrl: requiredUrl(environment, 'COMMERCE_STORE_URL'),
      apiToken: required(environment, 'COMMERCE_API_TOKEN'),
      webhookSecret: required(environment, 'COMMERCE_WEBHOOK_SECRET'),
      exclusiveShop: required(environment, 'COMMERCE_EXCLUSIVE_SHOP'),
      observations: commerceObservations(environment),
    })),
    sms: optionalModule(environment, 'SMS', optionalModuleInputs.sms, () => ({
      providerApiKey: required(environment, 'SMS_PROVIDER_API_KEY'),
      webhookSecret: required(environment, 'SMS_WEBHOOK_SECRET'),
      confirmationSender: smsConfirmationSender(environment),
      programme: readSmsProgramme(environment),
      testAllowlist: commaValues(environment, 'MANGO_TEST_SMS_ALLOWLIST'),
      handoffsPerMinute: positiveInteger(environment, 'MANGO_SMS_HANDOFFS_PER_MINUTE'),
    })),
    ai: optionalModule(environment, 'AI', optionalModuleInputs.ai, () => ({
      providerApiKey: required(environment, 'AI_PROVIDER_API_KEY'),
      model: required(environment, 'AI_PROVIDER_MODEL'),
    })),
    design: readDesignModule(environment),
  };
  return {
    sessionSigningKey: required(environment, 'SESSION_SIGNING_KEY'),
    authSetupToken: environment.AUTH_SETUP_TOKEN,
    mailProvider: mailProvider as 'resend' | 'sendgrid',
    mailboxReceiptUrl,
    mailboxReceiptRecipient,
    ...(siteKey && secretKey ? {signupTurnstile:{siteKey,secretKey}} : {}),
    initialOperatorEmails: emails(required(environment, 'INITIAL_OPERATOR_EMAILS'), 'INITIAL_OPERATOR_EMAILS'),
    contactHashSalt: required(environment, 'CONTACT_HASH_SALT'),
    modules,
    mailProviderApiKey: required(environment, 'MAIL_PROVIDER_API_KEY'),
    mailAuthFrom: required(environment, 'MAIL_AUTH_FROM'),
    mailWebhookSecret: required(environment, 'MAIL_WEBHOOK_SECRET'),
    mailWebhookId: mailProvider === 'resend' ? required(environment, 'MAIL_WEBHOOK_ID') : environment.MAIL_WEBHOOK_ID?.trim() ?? '',
    publicBaseUrl: requiredUrl(environment, 'MANGO_PUBLIC_BASE_URL'),
    appVersion: required(environment, 'MANGO_APP_VERSION'),
    allowedLinkHosts: linkHosts(environment),
    testEmailAllowlist: emails(required(environment, 'MANGO_TEST_EMAIL_ALLOWLIST'), 'MANGO_TEST_EMAIL_ALLOWLIST'),
    providerReconciliationIntervalMinutes: positiveInteger(environment, 'MANGO_RECONCILIATION_INTERVAL_MINUTES'),
    unresolvedProviderOutcomeHours: positiveInteger(environment, 'MANGO_UNRESOLVED_OUTCOME_HOURS'),
    emailHandoffsPerMinute: positiveInteger(environment, 'MANGO_EMAIL_HANDOFFS_PER_MINUTE'),
    deliverabilityReportingWindowDays: positiveInteger(environment, 'MANGO_DELIVERABILITY_WINDOW_DAYS'),
    mailSender: {
      displayName: environment.MAIL_SENDER_NAME?.trim() ?? '',
      fromEmail: required(environment, 'MAIL_AUTH_FROM'),
      replyToEmail: environment.MAIL_REPLY_TO?.trim() ?? '',
      physicalAddress: environment.MAIL_PHYSICAL_ADDRESS?.trim() ?? '',
    },
  };
}

function readSmsProgramme(environment: AppBindings) {
 try {return smsProgrammeSchema.parse(JSON.parse(required(environment,'SMS_PROGRAMME_POLICY')));}
 catch {throw new Error('SMS_PROGRAMME_POLICY is incomplete or invalid.');}
}

function commerceObservations(environment: AppBindings) {
  const keys = ['COMMERCE_OBSERVATION_CHANNEL','COMMERCE_APP_INSTALLATION_ID','COMMERCE_PIXEL_ID','COMMERCE_PROXY_PATH'] as const;
  if (!keys.some(key => environment[key]?.trim())) return undefined;
  const [channel, installationId, pixelId, proxyPath] = keys.map(key => required(environment,key));
  if (!/^\/apps\/[a-z0-9-]+$/.test(proxyPath)) throw new Error('COMMERCE_PROXY_PATH must be the configured /apps/name path.');
  return {channel, installationId, pixelId, proxyPath, webhookUrl: new URL('/webhooks/commerce/shopify',requiredUrl(environment,'MANGO_PUBLIC_BASE_URL')).toString()};
}

function smsConfirmationSender(environment: AppBindings){
 const value=required(environment,'SMS_CONFIRMATION_SENDER');
 if(!/^\+?61\d{9}$/.test(value))throw new Error('SMS_CONFIRMATION_SENDER must be an Australian dedicated number.');
 return value.replace(/^\+/,'');
}

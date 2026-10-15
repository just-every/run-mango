import type { Database } from '@/core/platform/db/client';
import type { SenderInspection } from '@/core/features/sender-verification/types';

export type Channel = 'email' | 'sms';

export type DeliveryRequest = {
  smsAuthority?: {policyDigest:string;expiresAt:number};
  purpose?: 'marketing' | 'consent-confirmation' | 'sms-compliance';
  recipientStepId: string;
  idempotencyKey: string;
  handoffStartedAt: Date;
  to: string;
  sender: string;
  content: {
    /** Set only by the authenticated diagnostic send route. */
    test?: boolean;
    subject?: string;
    html?: string;
    text: string;
    preheader?: string;
    from?: { name: string; email: string };
    replyTo?: string;
    headers?: Record<string, string>;
  };
  callbackUrl: string;
};

export type ProviderHealth = {reachable:boolean; code:string; observedAt:Date; evidence:string};

export type ProviderHandoff = {
  actualSender?: string;
  complianceHold?: {scope:string; reason:string};
  cost?: { billableUnits: number | null; unitKind: string; reportedCostMicros?: number; currency?: string };
  providerMessageId: string;
  disposition: 'accepted' | 'handoff-unknown';
  providerAcceptedAt?: Date;
};

export type ProviderFact = {
  identity: string;
  providerMessageId?: string;
  kind: 'accepted' | 'delivered' | 'bounced' | 'complained' | 'suppressed' | 'unsubscribed' | 'failed' | 'sms-reply';
  occurredAt: Date;
  payloadDigest: string;
  detail: Record<string, unknown>;
};

export type ProviderReconciliation = {
  facts: ProviderFact[];
  cursor?: string;
  exhausted: boolean;
};

export type SenderCapabilities = {
  handoffPolicy?: 'single-attempt';
  configured: boolean;
  canSendMarketing: boolean;
  effectiveDeduplication: boolean;
  effectiveReconciliation: boolean;
  deduplicationWindowMs: number;
  reconciliationWindowMs: number;
  detail: string;
  provider?: string;
  authentication?: { spf: boolean; dkim: boolean; dmarc: boolean; aligned: boolean };
  registeredSenders?: string[];
  registeredCountries?: string[];
};

export type SenderValidation = { ready: boolean; detail: string };

export type ProviderTransportFailure = {
  outcome: 'known-not-accepted';
  permanent: boolean;
  code: string;
  detail: string;
  retryAfterSeconds?: number;
  restriction?: 'hard-bounce'|'complained'|'suppressed';
  hold?: {scope:string; reason:string};
};

export class ProviderTransportError extends Error {
  readonly failure: ProviderTransportFailure;

  constructor(failure: ProviderTransportFailure) {
    super(failure.detail);
    this.name = 'ProviderTransportError';
    this.failure = failure;
  }
}

export type VerifiedWebhook = {
  provider?: 'sendgrid';
  providerEventId?: string;
  rawBody: string;
  receivedAt: Date;
};

export interface SenderAdapter {
  channel: Channel;
  capabilities(): Promise<SenderCapabilities>;
  probeHealth?(signal?: AbortSignal): Promise<ProviderHealth>;
  validateSender(sender: string, jurisdiction: string): Promise<SenderValidation>;
  inspectSender?(sender: string): Promise<SenderInspection>;
  send(request: DeliveryRequest): Promise<ProviderHandoff>;
  reconcile(request: DeliveryRequest, state: { providerMessageId?: string; cursor?: string }): Promise<ProviderReconciliation>;
  verifyWebhook(request: Request): Promise<VerifiedWebhook>;
}

export type SourceRecordInput = {
  updatedAt?: Date;
  contactId?: string;
  sourceType: string;
  sourceId: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
};

export type VerifiedCommerceWebhook = VerifiedWebhook & {
  records?: SourceRecordInput[];
  receipt?: {ids: string[]; digest: string};
  sourceType: string;
  sourceId: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
};

export type CommerceCoverage = {mode:'snapshot'|'observations'; exhaustive:boolean; from?:number; channel?:string; through?:number; complete:boolean};

export interface CommerceStore {
  collectObservation?(request: Request): Promise<VerifiedCommerceWebhook>;
  refreshHealth?(progress?: () => Promise<void>): Promise<void>;
  recordObservation?(record: SourceRecordInput, eventId: string, digest: string): Promise<void>;
  capabilities(): { provider?: string; sourceTypes: string[]; detail: string };
  synchronize(type: string, cursor?: string, progress?: () => Promise<void>): Promise<{ records: SourceRecordInput[]; nextCursor?: string; coverage?: CommerceCoverage }>;
  verifyWebhook(request: Request): Promise<VerifiedCommerceWebhook>;
}

export type GroundedGenerationRequest = {
  instructions: string;
  evidence: unknown;
  schema: Record<string, unknown>;
};

export type AiGenerationResult = {
  output: unknown;
  provider: 'openai';
  model: string;
  billableUnits: number | null;
  unitKind?: string;
  reportedCostMicros?: number;
  currency?: string;
};

export interface AiProvider {
  costIdentity?: { provider: 'openai'; model: string };
  generateGroundedJson(request: GroundedGenerationRequest): Promise<AiGenerationResult>;
}

/** One candidate slot of a design run, as the design service reports it. */
export type DesignCandidateStatus = 'pending' | 'dispatched' | 'succeeded' | 'failed';
export type DesignRun = { runId: string; candidates: { slot: string; status: DesignCandidateStatus }[] };
export type DesignLayout = { layoutId: string; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'expired'; resultSha256?: string };
export type DesignProviderFailure = 'provider_unauthorized' | 'provider_rejected' | 'provider_quota' | 'provider_unavailable' | 'provider_invalid';

/** A refusal or outage at the design service. The message is Mango's own; provider text is never kept. */
export class DesignProviderError extends Error {
  constructor(readonly code: DesignProviderFailure, readonly status: number, readonly retryAfterSeconds?: number) {
    super(`Design provider request failed (${code}${status ? `, HTTP ${status}` : ''}).`);
    this.name = 'DesignProviderError';
  }
}

/** design.provider.v1 (DESIGN-001..003): candidate designs from a brief, and a chosen candidate's layout as a
 * LayerDoc. Every paid POST carries the caller's idempotency key, so a replay never buys twice. */
export interface DesignProvider {
  readonly provider: string;
  startDraft(input: { concept: string; slots: string[] }, idempotencyKey: string): Promise<DesignRun>;
  dispatchCandidate(runId: string, slot: string, idempotencyKey: string): Promise<'dispatched' | 'unconfirmed'>;
  readDraft(runId: string): Promise<DesignRun>;
  candidateImage(runId: string, slot: string): Promise<Uint8Array<ArrayBuffer>>;
  startLayout(image: Blob, idempotencyKey: string): Promise<DesignLayout>;
  readLayout(layoutId: string): Promise<DesignLayout>;
  /** The settled layout's LayerDoc text, checked against the digest the service published. */
  layoutDocument(layout: DesignLayout): Promise<string>;
}

export type QueueCommand = {
  kind: 'health.probe' | 'contact.erase' | 'campaign.dispatch' | 'delivery.reconcile' | 'provider.outage-probe' | 'source.sync' | 'design.draft' | 'design.layout';
  idempotencyKey: string;
  payload: Record<string, unknown>;
};

export interface JobDispatcher {
  enqueue(command: QueueCommand): Promise<void>;
  retry(command: QueueCommand, delaySeconds: number): Promise<void>;
}

export interface BlobStore {
  head(key: string): ReturnType<R2Bucket['head']>;
  get(key: string, options?: R2GetOptions): ReturnType<R2Bucket['get']>;
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob, options?: R2PutOptions): ReturnType<R2Bucket['put']>;
  delete(key: string | string[]): ReturnType<R2Bucket['delete']>;
  list(options?: R2ListOptions): ReturnType<R2Bucket['list']>;
}

export type LinkInspection = {
  ok: boolean;
  finalUrl?: string;
  detail: string;
};

export interface LinkInspector {
  inspect(url: string): Promise<LinkInspection>;
}

export type PublicTokenClaims = {
  id: string;
  purpose: string;
  expiresAt: Date;
};

export interface PublicTokenSigner {
  issue(claims: PublicTokenClaims): Promise<string>;
  verify(token: string, purpose: string, now?: Date): Promise<PublicTokenClaims>;
  digest(token: string): Promise<string>;
}

export type DeliveryPolicy = {
  credentialDigest: string;
  account: string;
  evidence: string;
  lookupWindowMs?: number;
  scopes?: string[];
  webhookId?:string;
  lookupHistorySince?:string;
  providerPerMinute?: number;
  carrierPerMinute?: number;
  carrierScope?: string;
};

export type AppConfig = {
  demo?: boolean;
  deliveryPolicies?: Partial<Record<'resend'|'sendgrid'|'mobile-message',DeliveryPolicy>>;
  /** Set only by the local Worker composition, never from an environment binding. */
  local?: boolean;
  sessionSigningKey: string;
  authSetupToken?: string;
  mailboxReceiptUrl?: string;
  mailboxReceiptRecipient?: string;
  signupTurnstile?: { siteKey: string; secretKey: string };
  mailProvider?: 'resend' | 'sendgrid';
  initialOperatorEmails: string[];
  contactHashSalt: string;
  modules: {
    commerce: OptionalModuleConfig<{
      storeUrl: URL;
      apiToken: string;
      webhookSecret: string;
      exclusiveShop: string;
      observations?: {channel: string; installationId: string; pixelId: string; proxyPath: string; webhookUrl: string};
    }>;
    sms: OptionalModuleConfig<{
      providerApiKey: string;
      webhookSecret: string;
      confirmationSender: string;
      programme: import('@/core/features/sms/policy').SmsProgramme;
      testAllowlist: string[];
      handoffsPerMinute: number;
    }>;
    ai: OptionalModuleConfig<{
      providerApiKey: string;
      model: string;
    }>;
    design: OptionalModuleConfig<{
      providerApiKey: string;
      origin: URL;
    }>;
  };
  mailProviderApiKey: string;
  mailAuthFrom: string;
  mailWebhookSecret: string;
  mailWebhookId: string;
  publicBaseUrl: URL;
  appVersion: string;
  allowedLinkHosts: string[];
  testEmailAllowlist: string[];
  providerReconciliationIntervalMinutes: number;
  unresolvedProviderOutcomeHours: number;
  emailHandoffsPerMinute: number;
  deliverabilityReportingWindowDays: number;
  mailSender: {
    displayName: string;
    fromEmail: string;
    replyToEmail: string;
    physicalAddress: string;
  };
};

export type OptionalModuleConfig<Config> =
  | {
      enabled: false;
      requiredInputs: readonly string[];
      missingInputs: readonly string[];
      detail: string;
    }
  | {
      enabled: true;
      requiredInputs: readonly string[];
      missingInputs: readonly [];
      config: Config;
    };

export interface Platform {
  database: Database;
  config: AppConfig;
  commerce?: CommerceStore;
  ai?: AiProvider;
  design?: DesignProvider;
  mailer: SenderAdapter;
  sms?: SenderAdapter;
  jobs: JobDispatcher;
  blobs: BlobStore;
  linkInspector: LinkInspector;
  publicTokens: PublicTokenSigner;
}

export interface AppBindings {
  RER_DEMO?: string;
  RER_OWNER_CLAIM_INSTALLATION_ID?: string;
  MANGO_DELIVERY_POLICY_JSON?: string;
  MANGO_LOCAL_CONFIG_VERSION?: string;
  OWNER_EMAIL?: string;
  SESSION_SECRET?: string;
  SETUP_TOKEN?: string;
  AUTH_ORIGIN?: string;
  AUTH_LOCAL?: string;
  RER_DEV_ORIGIN?: string;
  /** Local runtimes only: the checkout's key gate and dev identity switch. Deploy refuses both. */
  RER_DEV_KEY?: string;
  RER_DEV_IDENTITY?: string;
  RER_MANAGEMENT_ORIGIN?: string;
  RER_INSTALLATION_ID?: string;
  RER_OWNER_CLAIM_ISSUER?: string;
  RER_OWNER_CLAIM_PUBLIC_KEYS?: string;
  /** Owner-controlled maintenance mode: restart all writers before restoring. */
  MANGO_RESTORE_MODE?: string;
  RER_DEPLOY_SOURCE?: string;
  RER_DEPLOY_FINGERPRINT?: string;
  RER_VERSION?: { id: string };
  ASSETS: Fetcher;
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  MANGO_JOBS: Queue<QueueCommand>;
  SESSION_SIGNING_KEY: string;
  AUTH_SETUP_TOKEN?: string;
  MAILBOX_RECEIPT_URL?: string;
  MAILBOX_RECEIPT_RECIPIENT?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  MAIL_PROVIDER?: 'resend' | 'sendgrid';
  INITIAL_OPERATOR_EMAILS: string;
  CONTACT_HASH_SALT: string;
  MANGO_LOCAL_HASH_AUTHORITY?: string;
  COMMERCE_STORE_URL?: string;
  COMMERCE_API_TOKEN?: string;
  COMMERCE_WEBHOOK_SECRET?: string;
  COMMERCE_EXCLUSIVE_SHOP?: string;
  COMMERCE_OBSERVATION_CHANNEL?: string;
  COMMERCE_APP_INSTALLATION_ID?: string;
  COMMERCE_PIXEL_ID?: string;
  COMMERCE_PROXY_PATH?: string;
  AI_PROVIDER_API_KEY?: string;
  AI_PROVIDER_MODEL?: string;
  DESIGN_PROVIDER_API_KEY?: string;
  DESIGN_PROVIDER_ORIGIN?: string;
  MAIL_PROVIDER_API_KEY: string;
  MAIL_AUTH_FROM: string;
  MAIL_WEBHOOK_SECRET: string;
  MAIL_WEBHOOK_ID: string;
  SMS_PROVIDER_API_KEY?: string;
  SMS_WEBHOOK_SECRET?: string;
  SMS_CONFIRMATION_SENDER?: string;
  SMS_PROGRAMME_POLICY?: string;
  MANGO_PUBLIC_BASE_URL: string;
  MANGO_APP_VERSION: string;
  MANGO_ALLOWED_LINK_HOSTS: string;
  MANGO_TEST_EMAIL_ALLOWLIST: string;
  MANGO_TEST_SMS_ALLOWLIST?: string;
  MANGO_RECONCILIATION_INTERVAL_MINUTES: string;
  MANGO_UNRESOLVED_OUTCOME_HOURS: string;
  MANGO_EMAIL_HANDOFFS_PER_MINUTE: string;
  MANGO_SMS_HANDOFFS_PER_MINUTE?: string;
  MANGO_DELIVERABILITY_WINDOW_DAYS: string;
  MAIL_SENDER_NAME: string;
  MAIL_REPLY_TO: string;
  MAIL_PHYSICAL_ADDRESS: string;
}

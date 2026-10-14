import type { AppBindings } from '../../src/core/shared/platform';
import type { LocalAppBindings } from '../support/fixture-app';

export const receiptUrl='https://receiver.example.test/receipts?token=synthetic-receiver-capability';
export const receiptRecipient='receiver@example.test';

type GoLiveBindings = LocalAppBindings & {
  GO_LIVE_PROVIDER_KEY: string;
  GO_LIVE_WEBHOOK_KEY: string;
  GO_LIVE_PUBLIC_ORIGIN: string;
};

/** The test installation's credentials and resources, supplied to the unmodified
 * production Worker exports. Provider and DNS requests still cross the network edge. */
export function productionBindings(bindings: GoLiveBindings): AppBindings {
  return {
    ...bindings,
    SESSION_SIGNING_KEY: bindings.LOCAL_BOOTSTRAP_TOKEN,
    INITIAL_OPERATOR_EMAILS: 'owner@example.test',
    CONTACT_HASH_SALT: bindings.LOCAL_BOOTSTRAP_TOKEN,
    MAIL_PROVIDER: 'sendgrid',
    MAIL_PROVIDER_API_KEY: bindings.GO_LIVE_PROVIDER_KEY,
    MAIL_AUTH_FROM: 'news@example.test',
    MAIL_WEBHOOK_SECRET: bindings.GO_LIVE_WEBHOOK_KEY,
    MAIL_WEBHOOK_ID: 'go-live-webhook',
    MAILBOX_RECEIPT_URL: receiptUrl,
    MAILBOX_RECEIPT_RECIPIENT: receiptRecipient,
    MANGO_PUBLIC_BASE_URL: bindings.GO_LIVE_PUBLIC_ORIGIN,
    MANGO_APP_VERSION: 'go-live',
    MANGO_ALLOWED_LINK_HOSTS: 'localhost',
    MANGO_TEST_EMAIL_ALLOWLIST: 'tester@example.test,receiver@example.test',
    MANGO_RECONCILIATION_INTERVAL_MINUTES: '15',
    MANGO_UNRESOLVED_OUTCOME_HOURS: '1',
    MANGO_EMAIL_HANDOFFS_PER_MINUTE: '50',
    MANGO_DELIVERABILITY_WINDOW_DAYS: '30',
  };
}

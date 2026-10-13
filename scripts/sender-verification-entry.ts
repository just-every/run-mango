import { readProductionConfig } from '../src/core/platform/config';
import { createDatabase } from '../src/core/platform/db/client';
import { createSenderVerification } from '../src/core/features/sender-verification/service';
import { createReceiptConnector } from '../src/core/features/sender-verification/qa-inbox';
import { configuredFrom } from '../src/core/features/sender-verification/identity';
import { createSendgridAdapter } from '../src/core/platform/adapters/sendgrid';
import { createResendAdapter } from '../src/core/platform/adapters/resend';
import type { AppBindings } from '../src/core/shared/platform';
import { loadSenderSettings } from '../src/core/features/settings/sender-persistence';
import { senderIdentitySchema } from '../src/core/features/settings/sender-validation';

function senderConfiguration(bindings: AppBindings) {
  const config = readProductionConfig(bindings);
  if (!config.mailboxReceiptUrl) throw new Error('MAILBOX_RECEIPT_URL is required.');
  if (!config.mailboxReceiptRecipient) throw new Error('MAILBOX_RECEIPT_RECIPIENT is required.');
  const receiver = createReceiptConnector(config.mailboxReceiptUrl, config.mailboxReceiptRecipient);
  return { config, receiver };
}

/** Only local configuration is inspected here; never forward operational or provider error text. */
export function senderVerificationInputError(bindings: AppBindings): string | undefined {
  try { senderConfiguration(bindings); }
  catch (error) {
    const message = error instanceof Error ? error.message : '';
    const names = [...new Set(message.match(/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/g) ?? [])];
    if (names.length) return `${names.join(', ')} configuration is missing or invalid.`;
    if (message === 'receiver-configuration-invalid') return 'MAILBOX_RECEIPT_URL or MAILBOX_RECEIPT_RECIPIENT is invalid.';
    if (message.startsWith('Auth configuration profiles conflict.')) return 'Auth configuration profiles conflict. Restore the matching installation configuration.';
    return 'Sender verification runtime configuration is invalid.';
  }
}

export async function senderVerificationCommand(bindings: AppBindings, action: string, challengeId?: string) {
  const { config, receiver } = senderConfiguration(bindings);
  senderIdentitySchema.parse(await loadSenderSettings({database: createDatabase(bindings.DB), config}));
  const verification = createSenderVerification({database:createDatabase(bindings.DB),config,receiver});
  if (action === 'prepare') {
    const challenge = await verification.prepareChallenge({recipient:receiver.recipient,
      subject: 'Mango sender verification', text: 'Approved diagnostic mail for this Mango installation. No customer or commerce data.'});
    return {id:challenge.id, expiresAt:challenge.expiresAt};
  }
  if (action === 'inspect') {
    const status = await verification.inspect(configuredFrom(config));
    return {ready:status.ready,reason:status.reason,authentication:status.authentication};
  }
  if (!challengeId) throw new Error('A prepared challenge ID is required.');
  if (action === 'observe') return verification.acquireObservation(challengeId);
  if (action === 'send') {
    const adapter=config.mailProvider==='sendgrid'?createSendgridAdapter({apiKey:config.mailProviderApiKey,webhookPublicKey:config.mailWebhookSecret,verification})
      :createResendAdapter({apiKey:config.mailProviderApiKey,webhookSecret:config.mailWebhookSecret,webhookId:config.mailWebhookId,verification});
    const challenge=await verification.sendChallenge(challengeId,adapter);
    return {id:challenge.id,providerMessageId:challenge.providerMessageId,sentAt:challenge.sentAt};
  }
  throw new Error('Unknown sender verification command.');
}

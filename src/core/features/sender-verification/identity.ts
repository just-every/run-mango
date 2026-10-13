import { hmacSha256, sha256 } from '@/core/platform/crypto';
import type { AppConfig, DeliveryRequest } from '@/core/shared/platform';
import { VerificationError, type SenderBinding } from './types';

export const transportVersion = 'resend-api-emails:v1:mango-signing-v1';
export function domainName(value: string): string {
  const domain = value.toLowerCase().replace(/\.$/, '');
  if (domain.length > 253 || !domain.includes('.') || !domain.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new VerificationError('invalid-domain');
  return domain;
}
export function mailbox(value: string): string {
  if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$/.test(value)) throw new VerificationError('invalid-from');
  const at = value.lastIndexOf('@');
  return `${value.slice(0, at)}@${domainName(value.slice(at + 1))}`;
}
export function serializedFrom(request: Pick<DeliveryRequest, 'content' | 'sender'>): string {
  return request.content.from ? `${request.content.from.name} <${request.content.from.email}>` : request.sender;
}
export function configuredFrom(config: AppConfig): string {
  if (/[\r\n<>]/.test(config.mailSender.displayName)) throw new VerificationError('invalid-from');
  return `${config.mailSender.displayName} <${mailbox(config.mailSender.fromEmail)}>`;
}
export async function senderBinding(config: AppConfig, connectorId?: string): Promise<SenderBinding> {
  const deployment = config.publicBaseUrl.origin;
  const credentialGeneration = await hmacSha256(config.sessionSigningKey, JSON.stringify(['sender-credential-v2', deployment, config.mailProviderApiKey, config.mailboxReceiptUrl ?? null, config.mailboxReceiptRecipient ?? null]));
  return { deployment, from: configuredFrom(config), mailbox: mailbox(config.mailSender.fromEmail),
    domain: domainName(config.mailSender.fromEmail.split('@')[1]), provider: config.mailProvider ?? 'resend',
    accountScope: credentialGeneration, credentialGeneration, transport: config.mailProvider === 'sendgrid' ? 'base-sendgrid-single-attempt:v1' : transportVersion, connectorId: connectorId ?? null };
}
export const digest = (value: unknown) => sha256(JSON.stringify(value));

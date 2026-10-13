import { z } from 'zod';
import type { ConfigurationInspection } from './configuration';
import { digest } from './identity';
import type { Challenge, SenderBinding } from './types';
import { VerificationError } from './types';

const token = z.string().min(1).max(1024);
const receipt = z.object({
  receiptId: token, originalDigest: token, receivedAt: z.number().int().nonnegative(), from: token, to: token,
  providerMessageId: token, requestDigest: token, nonce: token,
  signedBody: z.object({ digest: token, complete: z.boolean(), nonce: token }).strict(),
  authentication: z.object({
    spf: z.object({ result: token, mailFromDomain: token }).strict(),
    dkim: z.object({ result: token, domain: token, selector: token, keyDigest: token }).strict(),
    dmarc: z.object({ result: token, fromDomain: token, semantics: z.literal('rfc9989') }).strict(),
  }).strict(),
}).strict();
export type ObservationResult = { authentication: { spf: boolean; dkim: boolean; dmarc: boolean; aligned: boolean }; reason: string };
export async function validateReceiverMaterial(value: unknown, challenge: Challenge, binding: SenderBinding,
  configuration: ConfigurationInspection, now: number) {
  const parsed = receipt.safeParse(value);
  if (!parsed.success) throw new VerificationError('receiver-material-malformed');
  const material = parsed.data;
  if (!challenge.sentAt || !challenge.providerMessageId || material.receivedAt < challenge.sentAt || material.receivedAt > now
    || material.receivedAt >= challenge.expiresAt || now >= challenge.expiresAt
    || material.from !== binding.from || material.to !== challenge.recipient
    || material.providerMessageId !== challenge.providerMessageId || material.requestDigest !== challenge.requestDigest
    || material.nonce !== challenge.nonce || material.signedBody.nonce !== challenge.nonce || !material.signedBody.complete
    || material.signedBody.digest !== await digest(challenge.request.content.text)) throw new VerificationError('receiver-correlation-mismatch');
  const auth = material.authentication;
  if (auth.spf.mailFromDomain !== configuration.spfDomain || !configuration.signingKeys.some(key => key.signingDomain === auth.dkim.domain && key.selector === auth.dkim.selector && key.keyDigest === auth.dkim.keyDigest)
    || auth.dmarc.fromDomain !== binding.domain) throw new VerificationError('receiver-path-mismatch');
  const authentication = { spf: auth.spf.result === 'pass', dkim: auth.dkim.result === 'pass',
    dmarc: auth.dmarc.result === 'pass', aligned: configuration.aligned };
  return { material, result: { authentication, reason: Object.values(authentication).every(Boolean) ? 'authentication-observed' : 'authentication-failed' } satisfies ObservationResult };
}

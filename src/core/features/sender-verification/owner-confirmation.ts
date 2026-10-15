import { timingSafeEqual } from '@/core/platform/crypto';
import type { SenderAdapter } from '@/core/shared/platform';
import { digest, mailbox } from './identity';
import type { VerificationRepository } from './repository';
import type { VerificationOptions } from './service';
import { insertChallenge, observationStatements, readChallenge, type Context } from './challenges';
import { VerificationError, ownerConnectorId, type Challenge } from './types';

/** An owner confirmation lasts until the provider or DNS evidence changes, and at most this long. */
export const ownerConfirmationLifetimeMs = 30 * 86_400_000;
const linkLifetimeMs = 86_400_000;
const keyPattern = /^[A-Za-z0-9_-]{43}$/;

function newKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function ownerConfirmationLink(origin: string, challenge: Pick<Challenge, 'id' | 'nonce'>) {
  return new URL(`/sender-check/${encodeURIComponent(challenge.id)}?key=${challenge.nonce}`, origin).toString();
}

/**
 * The default receiving mailbox: the signed-in operator's own inbox. Mango sends one
 * diagnostic message from the configured From through the provider; the operator opens
 * it and presses Confirm on its one-time link. Provider and DNS evidence (SPF, DKIM,
 * DMARC and alignment) are still inspected fresh at every approval and handoff; this
 * records only that a real mailbox received the message the provider accepted.
 */
export function createOwnerConfirmation(input: { options: VerificationOptions; repository: VerificationRepository;
  currentConfiguration: () => Promise<Context>; clock: () => number;
  sendChallenge: (id: string, adapter: Pick<SenderAdapter, 'send' | 'reconcile'>) => Promise<Challenge> }) {
  const { options, repository, clock } = input, db = repository.db;
  async function ownerChallenge(id: string, key: string) {
    if (!keyPattern.test(key) || id.length > 64) throw new VerificationError('challenge-missing');
    const challenge = await readChallenge(db, id);
    if (challenge.connectorId !== ownerConnectorId || !timingSafeEqual(key, challenge.nonce)) throw new VerificationError('challenge-missing');
    return challenge;
  }
  return {
    /** Sends the check to the operator's own address; nothing is approved by sending it. */
    async sendOwnerConfirmation(recipient: string, adapter: Pick<SenderAdapter, 'send' | 'reconcile'>) {
      const to = mailbox(recipient.trim().toLowerCase());
      const context = await input.currentConfiguration();
      const id = crypto.randomUUID(), key = newKey();
      const link = ownerConfirmationLink(options.config.publicBaseUrl.origin, { id, nonce: key });
      const name = options.config.mailSender.displayName;
      const request = { recipientStepId: `sender-probe:${id}`, idempotencyKey: `sender-probe:${id}`, handoffStartedAt: new Date(context.now),
        sender: context.binding.from, to, callbackUrl: options.config.publicBaseUrl.origin, content: {
          subject: `Confirm ${name} can send newsletters`,
          text: [`Mango sent this check from ${context.binding.from} through your mail provider, to the address you sign in with.`,
            '', 'If this email is in your inbox (not spam or junk), confirm it here:', link, '',
            'The link works once and expires in 24 hours. If the email landed in spam, do not confirm it: check the SPF, DKIM and DMARC records your mail provider gave you, then send another check from Settings.',
          ].join('\n') } };
      const challenge = await insertChallenge(db, context, { id, nonce: key, request, recipient: to, connectorId: ownerConnectorId, lifetimeMs: linkLifetimeMs });
      const sent = await input.sendChallenge(challenge.id, adapter);
      return { sentTo: to, expiresAt: sent.expiresAt };
    },
    /** What the confirmation page shows before the operator presses Confirm. */
    async previewOwnerConfirmation(id: string, key: string) {
      const challenge = await ownerChallenge(id, key);
      const confirmed = await db.prepare('SELECT 1 FROM sender_verification_observations WHERE challenge_id = ?').bind(id).first();
      if (confirmed) return { kind: 'confirmed' as const, from: challenge.request.sender };
      if (!challenge.providerMessageId || challenge.expiresAt <= clock()) return { kind: 'expired' as const };
      return { kind: 'pending' as const, from: challenge.request.sender, to: challenge.recipient };
    },
    /** Records the owner's confirmation as the current observation for the unchanged configuration. */
    async confirmOwnerReceipt(id: string, key: string) {
      const challenge = await ownerChallenge(id, key);
      if (await digest(challenge.request) !== challenge.requestDigest) throw new VerificationError('challenge-content-mismatch');
      const previous = await db.prepare('SELECT id FROM sender_verification_observations WHERE challenge_id = ?').bind(id).first<{ id: string }>();
      if (previous) return { id: previous.id, replay: true };
      if (!challenge.providerMessageId || !challenge.sentAt) throw new VerificationError('challenge-not-sent');
      const { bindingDigest, state, configuration, now } = await input.currentConfiguration();
      if (now >= challenge.expiresAt) throw new VerificationError('challenge-expired');
      // A transient inspection failure bumps the generation without changing any evidence; it
      // must not cancel the owner's pending link. Changed evidence, a revocation or a newer
      // observation does.
      const current = state.observation_id ? await repository.observation(state.observation_id) : null;
      if (bindingDigest !== challenge.bindingDigest || configuration.configurationDigest !== challenge.configurationDigest
        || state.revoked_at || (current && current.observed_at >= challenge.createdAt)) throw new VerificationError('challenge-superseded');
      const authentication = { spf: true, dkim: true, dmarc: true, aligned: configuration.aligned };
      const reason = configuration.aligned ? 'owner-confirmed' : 'authentication-failed';
      const observationId = crypto.randomUUID();
      const receipt = { connectorId: ownerConnectorId, challengeId: id, recipient: challenge.recipient, providerMessageId: challenge.providerMessageId, confirmedAt: now };
      const [inserted, promoted] = await db.batch(observationStatements(db, state, { id: observationId, challengeId: id,
        receiptKey: await digest([ownerConnectorId, challenge.recipient, id]), receiptDigest: await digest(receipt),
        resultJson: JSON.stringify({ authentication, reason, owner: receipt }), reason,
        observedAt: now, expiresAt: now + ownerConfirmationLifetimeMs, now, promote: true }));
      if (!inserted.meta.changes || !promoted.meta.changes) throw new VerificationError('challenge-superseded');
      return { id: observationId, replay: false };
    },
  };
}

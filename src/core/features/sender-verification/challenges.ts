import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
import { ProviderTransportError, type DeliveryRequest, type ProviderHandoff, type SenderAdapter } from '@/core/shared/platform';
import { recordExternalCost } from '@/core/features/insights/cost-recording';
import { digest, serializedFrom } from './identity';
import { validateReceiverMaterial } from './receiver';
import type { VerificationRepository, AuthorityState } from './repository';
import type { ConfigurationInspection } from './configuration';
import type { VerificationOptions } from './service';
import { VerificationError, ownerConnectorId, type Challenge, type SenderBinding } from './types';

export type Context = { binding: SenderBinding; bindingDigest: string; state: AuthorityState; configuration: ConfigurationInspection; now: number };
const currentGuard = `EXISTS (SELECT 1 FROM sender_verification_state WHERE id = ? AND generation = ?
  AND binding_digest = ? AND configuration_digest = ?)`;
const currentValues = (state: AuthorityState) => [state.id, state.generation, state.binding_digest, state.configuration_digest];
export async function readChallenge(db: D1Database, id: string): Promise<Challenge> {
  const row = await db.prepare('SELECT * FROM sender_verification_challenges WHERE id = ?').bind(id).first<Record<string, unknown>>();
  if (!row) throw new VerificationError('challenge-missing');
  const request = JSON.parse(String(row.request_json));
  request.handoffStartedAt = new Date(request.handoffStartedAt);
  return { id, stateId: String(row.state_id), generation: Number(row.generation), bindingDigest: String(row.binding_digest),
    configurationDigest: String(row.configuration_digest), recipient: String(row.recipient), connectorId: String(row.connector_id),
    nonce: String(row.nonce), request, requestDigest: String(row.request_digest),
    reconciliationCursor: row.reconcile_cursor == null ? undefined : String(row.reconcile_cursor),
    providerMessageId: row.provider_message_id == null ? undefined : String(row.provider_message_id),
    sentAt: row.sent_at == null ? undefined : Number(row.sent_at), createdAt: Number(row.created_at), expiresAt: Number(row.expires_at) };
}
/** Stores one diagnostic request under the current authority generation before any handoff. */
export async function insertChallenge(db: D1Database, context: Context, input: { recipient: string; connectorId: string;
  nonce: string; id: string; request: DeliveryRequest; lifetimeMs: number }) {
  const { bindingDigest, state, configuration, now } = context;
  const requestDigest = await digest(input.request);
  const result = await db.prepare(`INSERT INTO sender_verification_challenges
    (id,state_id,binding_digest,configuration_digest,generation,recipient,connector_id,nonce,request_json,request_digest,expires_at,created_at,updated_at)
    SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? WHERE ${currentGuard}`)
    .bind(input.id, state.id, bindingDigest, configuration.configurationDigest, state.generation, input.recipient, input.connectorId,
      input.nonce, JSON.stringify(input.request), requestDigest, now + input.lifetimeMs, now, now, ...currentValues(state)).run();
  if (!result.meta.changes) throw new VerificationError('challenge-superseded');
  return readChallenge(db, input.id);
}
/** Stores one observation and, when promoted, makes it the current authority, both under the generation fence. */
export function observationStatements(db: D1Database, state: AuthorityState, input: { id: string; challengeId: string;
  receiptKey: string; receiptDigest: string; resultJson: string; reason: string; observedAt: number; expiresAt: number; now: number; promote: boolean }) {
  return [db.prepare(`INSERT INTO sender_verification_observations
    (id,challenge_id,receipt_key,receipt_digest,binding_digest,configuration_digest,result_json,observed_at,expires_at,created_at)
    SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${currentGuard}`)
    .bind(input.id, input.challengeId, input.receiptKey, input.receiptDigest, state.binding_digest, state.configuration_digest,
      input.resultJson, input.observedAt, input.expiresAt, input.now, ...currentValues(state)),
  db.prepare(`UPDATE sender_verification_state SET observation_id = ?, generation = generation + 1,
    revoked_at = NULL, reason = ?, updated_at = ? WHERE ${currentGuard} AND id = ?
    AND EXISTS (SELECT 1 FROM sender_verification_observations WHERE id = ?) AND ?`)
    .bind(input.id, input.reason, input.now, ...currentValues(state), state.id, input.id, input.promote ? 1 : 0)];
}
export function createChallengeService(input: { options: VerificationOptions; repository: VerificationRepository;
  currentConfiguration: () => Promise<Context>; clock: () => number }) {
  const { options, repository, clock } = input, db = repository.db;
  const read = (id: string) => readChallenge(db, id);
  function receiver() {
    if (!options.receiver) throw new VerificationError('receiver-not-configured');
    if (!options.config.testEmailAllowlist.includes(options.receiver.recipient)) throw new VerificationError('receiver-not-allowlisted');
    return options.receiver;
  }
  return {
    /** Internal protected-runner operation; deliberately no HTTP/upload route.
     * The caller approves this exact diagnostic body and recipient before calling.
     * Sending is separate so the saved request can be inspected before handoff. */
    async prepareChallenge(approval: { recipient: string; subject: string; text: string }) {
      const connector = receiver();
      if (approval.recipient !== connector.recipient || !approval.subject.trim() || !approval.text.trim()
        || /[\r\n]/.test(approval.subject)) throw new VerificationError('probe-approval-invalid');
      const context = await input.currentConfiguration();
      const id = crypto.randomUUID(), nonce = crypto.randomUUID();
      const request = { recipientStepId: `sender-probe:${id}`, idempotencyKey: `sender-probe:${id}`, handoffStartedAt: new Date(context.now),
        sender: context.binding.from, to: approval.recipient, content: { subject: `[Mango sender check] ${approval.subject}`,
          text: `${approval.text}\n\nMango sender verification challenge: ${nonce}` }, callbackUrl: options.config.publicBaseUrl.origin };
      return insertChallenge(db, context, { id, nonce, request, recipient: approval.recipient, connectorId: connector.id, lifetimeMs: 3_600_000 });
    },
    async sendChallenge(id: string, adapter: Pick<SenderAdapter, 'send' | 'reconcile'>) {
      const challenge = await read(id);
      if (challenge.connectorId !== ownerConnectorId) receiver();
      if (challenge.providerMessageId) return challenge;
      const { binding, bindingDigest, state, configuration, now } = await input.currentConfiguration();
      if (challenge.bindingDigest !== bindingDigest || challenge.configurationDigest !== configuration.configurationDigest
        || challenge.generation !== state.generation || challenge.expiresAt <= now || serializedFrom(challenge.request) !== binding.from
        || await digest(challenge.request) !== challenge.requestDigest) throw new VerificationError('challenge-superseded');
      const costOccurredAt = new Date(challenge.sentAt ?? clock());
      const recordCost = (outcome: string, cost?: ProviderHandoff['cost']) => recordExternalCost(options.database, {
        key: `sender-verification:${id}`, provider: binding.provider, operation: 'sender-verification-handoff',
        modelOrChannel: 'email', billableUnits: cost?.billableUnits ?? null, unitKind: cost?.unitKind,
        reportedCostMicros: cost?.reportedCostMicros, currency: cost?.currency, outcome,
        occurredAt: costOccurredAt,
      });
      if (challenge.sentAt !== undefined) {
        // An uncertain handoff is only reconciled; never blindly resent.
        const result = await adapter.reconcile(challenge.request, { cursor: challenge.reconciliationCursor });
        const accepted = result.facts.find(fact => fact.kind === 'accepted' && fact.providerMessageId);
        if (!accepted) {
          if (!result.exhausted) {
            if (!result.cursor || result.cursor === challenge.reconciliationCursor) throw new VerificationError('probe-reconciliation-incomplete', 'unknown');
            await db.prepare('UPDATE sender_verification_challenges SET reconcile_cursor = ?, updated_at = ? WHERE id = ? AND reconcile_cursor IS ? AND provider_message_id IS NULL')
              .bind(result.cursor, clock(), id, challenge.reconciliationCursor ?? null).run();
          }
          throw new VerificationError('probe-handoff-unresolved', 'unknown');
        }
        await db.prepare(`UPDATE sender_verification_challenges SET provider_message_id = ?, updated_at = ?
          WHERE id = ? AND provider_message_id IS NULL`).bind(accepted.providerMessageId!, clock(), id).run();
        // Receipt authority is durable before accounting; missing enrichment leaves an explicit unknown cost.
        await recordCost('accepted').catch(() => {});
        return read(id);
      }
      // Prepare accounting before the final generation fence. A stale caller may
      // resume after another caller's definite no-POST release, so revive and stamp
      // its unspent cost only with its successful claim, in the same transaction.
      await recordCost('prepared');
      const claimedAt = clock();
      const [claimed] = await db.batch([
        db.prepare(`UPDATE sender_verification_challenges SET sent_at = ?, updated_at = ?
          WHERE id = ? AND sent_at IS NULL AND expires_at > ? AND ${currentGuard}`)
          .bind(claimedAt, claimedAt, id, claimedAt, ...currentValues(state)),
        db.prepare(`UPDATE external_cost_facts SET outcome='prepared',occurred_at=?
          WHERE id=? AND outcome IN ('prepared','not-sent')
          AND changes()=1 AND EXISTS (SELECT 1 FROM sender_verification_challenges
            WHERE id=? AND sent_at=? AND provider_message_id IS NULL)`)
          .bind(claimedAt, `sender-verification:${id}`, id, claimedAt),
      ]);
      if (!claimed.meta.changes) {
        // A competing caller may own this same attempt. Exclude it only when nobody claimed the handoff.
        await db.prepare(`UPDATE external_cost_facts SET outcome='not-sent' WHERE id=? AND outcome='prepared'
          AND NOT EXISTS (SELECT 1 FROM sender_verification_challenges WHERE id=? AND sent_at IS NOT NULL)`)
          .bind(`sender-verification:${id}`, id).run().catch(() => {});
        throw new VerificationError('probe-handoff-unresolved', 'unknown');
      }
      let sent: ProviderHandoff;
      try { sent = await adapter.send(challenge.request); }
      catch (error) {
        if(error instanceof ProviderDeferredError) {
          // This exact error certifies no provider request. Release only this
          // caller's claim and its unspent cost together; ambiguous outcomes
          // retain sent_at and can only reconcile. A later call rechecks all
          // current binding, generation, approval and expiry guards above.
          await db.batch([
            db.prepare(`UPDATE external_cost_facts SET outcome='not-sent'
              WHERE id=? AND outcome='prepared' AND EXISTS (
                SELECT 1 FROM sender_verification_challenges WHERE id=? AND sent_at=? AND provider_message_id IS NULL)`)
              .bind(`sender-verification:${id}`,id,claimedAt),
            db.prepare(`UPDATE sender_verification_challenges SET sent_at=NULL,updated_at=?
              WHERE id=? AND sent_at=? AND provider_message_id IS NULL`)
              .bind(clock(),id,claimedAt),
          ]);
        } else await recordCost(error instanceof ProviderTransportError ? 'rejected' : 'unknown').catch(() => {});
        throw error;
      }
      await db.prepare(`UPDATE sender_verification_challenges SET provider_message_id = ?, updated_at = ?
        WHERE id = ? AND provider_message_id IS NULL`).bind(sent.providerMessageId, clock(), id).run();
      await recordCost(sent.disposition === 'accepted' ? 'accepted' : 'unknown', sent.cost).catch(() => {});
      return read(id);
    },
    async acquireObservation(id: string) {
      const connector = receiver(), challenge = await read(id);
      if (await digest(challenge.request) !== challenge.requestDigest) throw new VerificationError('challenge-content-mismatch');
      if (challenge.connectorId !== connector.id || challenge.recipient !== connector.recipient) throw new VerificationError('receiver-binding-mismatch');
      // Only this configured connector supplies material. There is no receipt
      // argument, shared secret header, upload route or env-based pass switch.
      const material = await connector.acquire(Object.freeze(challenge));
      const receiptDigest = await digest(material);
      const receiptKey = await digest([connector.id, connector.recipient, material.receiptId]);
      const previous = await db.prepare('SELECT * FROM sender_verification_observations WHERE receipt_key = ? OR challenge_id = ?')
        .bind(receiptKey, id).first<{ id: string; receipt_digest: string; receipt_key: string; challenge_id: string }>();
      if (previous) {
        if (previous.receipt_digest !== receiptDigest || previous.receipt_key !== receiptKey || previous.challenge_id !== id) {
          const state = await repository.state(challenge.stateId);
          if (state) await repository.invalidate(state, 'receiver-replay-conflict', clock(), true);
          throw new VerificationError('receiver-replay-conflict');
        }
        return { id: previous.id, replay: true };
      }
      const { binding, bindingDigest, state, configuration, now } = await input.currentConfiguration();
      if (bindingDigest !== challenge.bindingDigest
        || configuration.configurationDigest !== challenge.configurationDigest) throw new VerificationError('challenge-superseded');
      let validated;
      try { validated = await validateReceiverMaterial(material, challenge, binding, configuration, now); }
      catch (error) {
        await repository.invalidate(state, 'receiver-material-rejected', clock(), true);
        throw error;
      }
      // A later failing receipt from a concurrently prepared challenge must not
      // leave an older pass authoritative. Superseded positive probes cannot
      // clear a later failure/revocation; a newly prepared challenge is required.
      if (state.generation !== challenge.generation && validated.result.reason === 'authentication-observed') throw new VerificationError('challenge-superseded');
      const currentObservation = state.observation_id ? await repository.observation(state.observation_id) : null;
      const promote = !currentObservation || material.receivedAt >= currentObservation.observed_at;
      const observationId = crypto.randomUUID();
      const expiresAt = validated.material.receivedAt + 86_400_000;
      const statements = observationStatements(db, state, { id: observationId, challengeId: id, receiptKey, receiptDigest,
        resultJson: JSON.stringify({ ...validated.result, receiver: { connectorId: connector.id, receiptId: material.receiptId, originalDigest: material.originalDigest, authentication: material.authentication, signedBodyDigest: material.signedBody.digest } }),
        reason: validated.result.reason, observedAt: material.receivedAt, expiresAt, now, promote });
      let result;
      try { result = await db.batch(statements); }
      catch (error) {
        // Reconcile a concurrent identical receipt commit. A storage error with
        // no committed receipt still propagates and leaves no partial authority.
        const committed = await db.prepare('SELECT id,receipt_digest,receipt_key,challenge_id FROM sender_verification_observations WHERE receipt_key = ? OR challenge_id = ?')
          .bind(receiptKey, id).first<{ id: string; receipt_digest: string; receipt_key: string; challenge_id: string }>();
        if (committed?.receipt_digest === receiptDigest && committed.receipt_key === receiptKey && committed.challenge_id === id) return { id: committed.id, replay: true };
        throw error;
      }
      if (!result[0].meta.changes || promote && !result[1].meta.changes) throw new VerificationError('challenge-superseded');
      return { id: observationId, replay: false };
    },
  };
}

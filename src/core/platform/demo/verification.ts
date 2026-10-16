import type { Database } from '../db/client';
import type { AppConfig } from '@/core/shared/platform';
import type { SenderVerification } from '@/core/features/sender-verification/service';
import type { SenderInspection } from '@/core/features/sender-verification/types';
import { createVerificationRepository } from '@/core/features/sender-verification/repository';
import { demoResult } from './effect';

/** Mock the provider's verification, retaining Mango's ordinary durable approval leases. */
export function demoVerification(real: SenderVerification, database: Database, config: AppConfig): SenderVerification {
  return { ...real, inspect: sender => demoResult(() => real.inspect(sender), async () => {
    const repository = createVerificationRepository(database), now = Date.now(), expiresAt = now + 3600000;
    const binding = `demo:${config.publicBaseUrl.origin}:${sender}`;
    const initial = await repository.bind('demo-sender', binding, now);
    const state = (await repository.configuration(initial, binding, now))!;
    // Each inspection gets its own observation: an approval's proof keeps the observation it checked,
    // so a later inspection (test send, handoff) cannot move that observation past the approval.
    const observation = `demo-sender-observation:${crypto.randomUUID()}`;
    await database.$client.prepare(`INSERT INTO sender_verification_observations
      (id,challenge_id,receipt_key,receipt_digest,binding_digest,configuration_digest,result_json,observed_at,expires_at,created_at)
      VALUES(?,?,?,'demo',?,?,'{"demo":true}',?,?,?)`)
      .bind(observation, `${observation}:challenge`, `${observation}:receipt`, binding, binding, now, expiresAt, now).run();
    await database.$client.prepare('UPDATE sender_verification_state SET observation_id=? WHERE id=?').bind(observation, state.id).run();
    state.observation_id = observation;
    const passed = { state: 'passed' as const, reason: 'authentication-observed', observedAt: now, expiresAt };
    const inspection: SenderInspection = { ready: true, reason: 'authentication-observed', checkedAt: now, expiresAt,
      provider: passed, dns: passed, observation: passed, authentication: { spf: true, dkim: true, dmarc: true, aligned: true } };
    inspection.lease = await repository.inspection(state, inspection, now, { demo: true, binding: { from: sender } });
    return inspection;
  }) };
}

import { expect } from '@playwright/test';
import { native } from '../approval-binding/native';
import { cookie, invitationRuntime } from '../../operations/fixtures/invitation-runtime.mjs';
import { senderVerificationCommand } from '../../scripts/sender-verification-entry';
import { proveBaseMailReplay } from './cost-base-mail-proof';

/** Protected sender command and native hosted auth use their actual provider transports. */
export async function proveOperationalMailCosts() {
  const harness = await native(), { f } = harness;
  try {
    const receiver = new URL('https://receiver.example.test/receipts');
    receiver.searchParams.set('token', 'fixture-only');
    f.bindings.MAILBOX_RECEIPT_URL = receiver.href;
    f.bindings.MAILBOX_RECEIPT_RECIPIENT = 'receiver@example.test';
    const prepared = await senderVerificationCommand(f.bindings, 'prepare');
    if (!('id' in prepared)) throw new Error('Expected a prepared challenge');
    for (let replay = 0; replay < 2; replay++) await senderVerificationCommand(f.bindings, 'send', prepared.id);
    expect(f.outbound).toHaveLength(1);
    const costs = (await f.db.prepare("SELECT * FROM external_cost_facts WHERE operation='sender-verification-handoff'").all()).results;
    expect(costs).toHaveLength(1);
    expect(costs[0]).toMatchObject({ provider: 'resend', model_or_channel: 'email', campaign_id: null,
      units_known: 0, reported_cost_micros: null, currency: null, outcome: 'accepted' });
    const report = (await f.services.insightsService.list()).costs;
    expect(report.byDay).toContainEqual(expect.objectContaining({ day: new Date().toISOString().slice(0, 10),
      provider: 'resend', operation: 'sender-verification-handoff', facts: 1, unknownUsageFacts: 1, unpricedFacts: 1 }));
    expect(report.byCampaign).toContainEqual(expect.objectContaining({ campaignId: null,
      operation: 'sender-verification-handoff', facts: 1 }));

    // A new approved diagnostic is a new handoff. A failed accounting update cannot erase its receipt or resend it.
    const next = await senderVerificationCommand(f.bindings, 'prepare');
    if (!('id' in next)) throw new Error('Expected a prepared challenge');
    await f.db.prepare("CREATE TRIGGER reject_probe_cost BEFORE UPDATE ON external_cost_facts WHEN NEW.outcome='accepted' BEGIN SELECT RAISE(ABORT,'cost-enrichment-unavailable'); END").run();
    await senderVerificationCommand(f.bindings, 'send', next.id);
    await f.db.prepare('DROP TRIGGER reject_probe_cost').run();
    await senderVerificationCommand(f.bindings, 'send', next.id);
    expect(f.outbound).toHaveLength(2);
    expect(await f.db.prepare('SELECT provider_message_id FROM sender_verification_challenges WHERE id=?').bind(next.id).first())
      .toEqual({ provider_message_id: 'sent-2' });
    expect(await f.db.prepare('SELECT outcome FROM external_cost_facts WHERE id=?').bind(`sender-verification:${next.id}`).first())
      .toEqual({ outcome: 'prepared' });
    const superseded = await senderVerificationCommand(f.bindings, 'prepare');
    if (!('id' in superseded)) throw new Error('Expected a prepared challenge');
    await f.db.prepare(`CREATE TRIGGER supersede_probe_before_claim BEFORE INSERT ON external_cost_facts
      WHEN NEW.operation='sender-verification-handoff' BEGIN UPDATE sender_verification_state SET generation=generation+1
      WHERE id=(SELECT state_id FROM sender_verification_challenges WHERE 'sender-verification:'||id=NEW.id); END`).run();
    await expect(senderVerificationCommand(f.bindings, 'send', superseded.id)).rejects.toThrow('probe-handoff-unresolved');
    await f.db.prepare('DROP TRIGGER supersede_probe_before_claim').run();
    expect(f.outbound).toHaveLength(2);
    expect(await f.db.prepare('SELECT outcome FROM external_cost_facts WHERE id=?').bind(`sender-verification:${superseded.id}`).first())
      .toEqual({ outcome: 'not-sent' });
    expect((await f.services.insightsService.list()).costs.byDay).toContainEqual(expect.objectContaining({
      operation: 'sender-verification-handoff', facts: 2 }));
    await proveBaseMailReplay(f.platform.database);
  } finally { await harness.dispose(); }

  const runtime = await invitationRuntime();
  try {
    await runtime.bootstrap();
    expect((await runtime.db.prepare('SELECT * FROM external_cost_facts').all()).results).toHaveLength(0);
    const requestLink = () => runtime.call('/auth/magic-link', { method: 'POST', body: { email: 'owner@example.test' } });
    for (let attempt = 0; attempt < 2; attempt++) expect((await requestLink()).status).toBe(202);
    const confirmed = await runtime.call('/auth/confirm', { method: 'POST', body: { token: await runtime.token() } });
    expect(confirmed.status).toBe(303);
    const owner = cookie(confirmed);
    // Reissuing an invitation issues a new native token and buys a distinct send.
    for (let attempt = 0; attempt < 2; attempt++) expect((await runtime.call('/api/operators', {
      method: 'POST', cookie: owner, body: { email: 'invited-costs@example.test' },
    })).status).toBe(201);
    const costs = (await runtime.db.prepare('SELECT * FROM external_cost_facts').all()).results;
    expect(costs).toHaveLength(4);
    for (const cost of costs) expect(cost).toMatchObject({ campaign_id: null, provider: 'sendgrid',
      operation: 'auth-mail-handoff', model_or_channel: 'email', units_known: 0, reported_cost_micros: null,
      currency: null, outcome: 'accepted' });
    expect((await runtime.db.prepare('SELECT id FROM test_mail').all()).results).toHaveLength(4);
    const insights = await runtime.call('/api/insights', { cookie: owner });
    expect(insights.status).toBe(200);
    const report = (await insights.json()).costs;
    expect(report.byCampaign).toContainEqual(expect.objectContaining({ campaignId: null, operation: 'auth-mail-handoff', facts: 4 }));
    expect(report.byDay).toContainEqual(expect.objectContaining({ day: new Date().toISOString().slice(0, 10),
      provider: 'sendgrid', operation: 'auth-mail-handoff', facts: 4, unknownUsageFacts: 4, unpricedFacts: 4 }));
    expect((await runtime.call('/auth/step-up', { method: 'POST', cookie: owner, body: { action: 'export' } })).status).toBe(202);
    expect((await runtime.db.prepare('SELECT id FROM external_cost_facts').all()).results).toHaveLength(5);
    // Mail accounting cannot turn the provider's accepted link into a revoked credential or failed response.
    await runtime.db.prepare("CREATE TRIGGER reject_auth_cost BEFORE UPDATE ON external_cost_facts WHEN NEW.outcome='accepted' BEGIN SELECT RAISE(ABORT,'cost-enrichment-unavailable'); END").run();
    expect((await requestLink()).status).toBe(202);
    expect((await runtime.db.prepare('SELECT id FROM test_mail').all()).results).toHaveLength(6);
    expect((await runtime.db.prepare("SELECT id FROM external_cost_facts WHERE outcome='prepared'").all()).results).toHaveLength(1);
    const uncertain = await (await runtime.call('/api/insights', { cookie: owner })).json();
    expect(uncertain.costs.byDay).toContainEqual(expect.objectContaining({ provider: 'sendgrid',
      operation: 'auth-mail-handoff', facts: 6, unknownUsageFacts: 6, unpricedFacts: 6, preparedFacts: 1,
      billableUnits: null, reportedCostMicros: null }));
    const token = await runtime.token();
    expect((await runtime.call('/auth/confirm', { method: 'POST', body: { token } })).status).toBe(303);
    expect((await runtime.call('/auth/confirm', { method: 'POST', body: { token } })).status).toBe(400);
    expect((await runtime.db.prepare('SELECT id FROM test_mail').all()).results).toHaveLength(6);
    expect(JSON.stringify((await runtime.db.prepare('SELECT * FROM external_cost_facts').all()).results)).not.toContain('@');
    expect(JSON.stringify((await runtime.db.prepare('SELECT * FROM external_cost_facts').all()).results)).not.toContain(token);
  } finally { await runtime.close(); }
}

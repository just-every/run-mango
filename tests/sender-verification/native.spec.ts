import { test, expect } from '@playwright/test';
import { fixture, draft } from './fixture';
import { createApprovalService } from '../../src/core/features/lifecycle/approval';
import { createDeliveryService } from '../../src/core/features/lifecycle/delivery';
import { createSettingsService } from '../../src/core/features/settings/service';
import productionWorker from '../../src/core/app/worker';
const from = 'Mango <offers@example.test>';

test('production newsletter boots with no receiver or optional providers and never grants DNS-only authority', async () => {
  const f = await fixture(false);
  try {
    const platform = f.originalProduction();
    expect(platform.commerce).toBeUndefined(); expect(platform.sms).toBeUndefined(); expect(platform.ai).toBeUndefined();
    const status = await platform.mailer.inspectSender!(from);
    expect(status).toMatchObject({ ready: false, reason: 'observation-missing', provider: { state: 'passed' }, dns: { state: 'passed' } });
    expect(status.lease).toBeUndefined();
    expect(f.calls.some(url => url.includes('after=other-domain'))).toBe(true);
    const response = await productionWorker.fetch(new Request('https://mango.example.test/api/settings/sender'), f.bindings, { waitUntil() {} } as any);
    expect(response.status).toBe(401);
    expect(f.outbound).toHaveLength(0);
  } finally { await f.dispose(); }
});

test('receiver proof persists across reconstruction, replay does not renew it, and changed replay rejects', async () => {
  const f = await fixture();
  try {
    const challenge = await f.prove();
    const first = await f.verifier.inspect(from);
    expect(first.ready).toBe(true); expect(first.authentication).toEqual({ spf:true, dkim:true, dmarc:true, aligned:true });
    const restarted = f.restart();
    const again = await restarted.inspect(from);
    expect(again.ready).toBe(true); expect(again.observation.observedAt).toBe(first.observation.observedAt);
    expect(await restarted.acquireObservation(challenge.id)).toMatchObject({ replay: true });
    f.offset(86_400_000);
    expect(await restarted.inspect(from)).toMatchObject({ ready:false, reason:'observation-stale' });
    f.offset(0);
    f.changeReceipt(receipt => ({ ...receipt, originalDigest: 'changed-bytes' }));
    await expect(restarted.acquireObservation(challenge.id)).rejects.toThrow('receiver-replay-conflict');
    f.changeReceipt();
    expect(await restarted.inspect(from)).toMatchObject({ ready:false, reason:'observation-revoked' });
  } finally { await f.dispose(); }
});

test('new negative results defeat old pass; key rotation and revocation remove authority', async () => {
  const f = await fixture();
  try {
    const old = await f.prove();
    f.authResult('softfail'); await f.prove();
    expect(await f.verifier.inspect(from)).toMatchObject({ ready:false, reason:'authentication-failed' });
    await f.verifier.acquireObservation(old.id);
    expect((await f.verifier.inspect(from)).ready).toBe(false);
    f.authResult('pass'); await f.prove();
    await f.verifier.revoke();
    expect(await f.verifier.inspect(from)).toMatchObject({ ready:false, reason:'observation-revoked' });
    await f.prove();
    f.platform.config.mailProviderApiKey = 'rotated-test-credential';
    expect(await f.verifier.inspect(from)).toMatchObject({ ready:false, reason:'observation-missing' });
  } finally { await f.dispose(); }
});

test('real approval freezes authority atomically and real delivery records a fresh handoff association', async () => {
  const f = await fixture();
  try {
    await f.prove(); const campaign = await draft(f);
    const approved = await f.lifecycle.approval.approve(campaign);
    expect(approved).toMatchObject({ kind:'approved' });
    expect(await f.db.prepare("SELECT count(*) n FROM sender_verification_associations WHERE kind='approval'").first()).toEqual({ n:1 });
    await f.lifecycle.delivery.dispatchStep({ ...campaign, channel:'email' });
    expect(f.outbound).toHaveLength(2);
    expect(f.outbound[1].from).toBe(from);
    expect(await f.db.prepare("SELECT count(*) n FROM sender_verification_associations WHERE kind='handoff'").first()).toEqual({ n:1 });
    expect(await f.db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'accepted'});
    await f.lifecycle.delivery.dispatchStep({ ...campaign, channel:'email' });
    expect(f.outbound).toHaveLength(2);
  } finally { await f.dispose(); }
});

test('revocation at the real approval write blocks all approval and recipient mutations', async () => {
  const f = await fixture();
  try {
    await f.prove(); const campaign = await draft(f);
    const repository = f.lifecycle.repository;
    const service = createApprovalService(f.services.lifecycleRuntime, { ...repository, async approve(input) {
      await f.verifier.revoke(); return repository.approve(input);
    } });
    expect(await service.approve(campaign)).toMatchObject({kind:'conflict'});
    for (const table of ['campaign_approval_requests','recipient_steps','sender_verification_associations']) expect(await f.db.prepare(`SELECT count(*) n FROM ${table}`).first()).toEqual({n:0});
  } finally { await f.dispose(); }
});

test('revocation at handoff, verification outage, and resumed serialized From all prevent provider send', async () => {
  const f = await fixture();
  try {
    await f.prove(); const campaign = await draft(f);
    expect(await f.lifecycle.approval.approve(campaign)).toMatchObject({kind:'approved'});
    const repository = f.lifecycle.repository;
    const delivery = createDeliveryService(f.services.lifecycleRuntime, { ...repository, async markHandoffUnknown(...args) {
      await f.verifier.revoke(); return repository.markHandoffUnknown(...args);
    } });
    await delivery.dispatchStep({...campaign, channel:'email'});
    expect(f.outbound).toHaveLength(1);
    expect(await f.db.prepare("SELECT count(*) n FROM sender_verification_associations WHERE kind='handoff'").first()).toEqual({n:0});
    await f.prove();
    await f.db.prepare("UPDATE recipient_steps SET lease_expires_at=0,lease_token=NULL,next_attempt_at=0").run();
    f.outage(true); await f.lifecycle.delivery.dispatchStep({...campaign, channel:'email'});
    expect(f.outbound).toHaveLength(2);
    expect(await f.db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'queued'});
    expect(await f.db.prepare('SELECT count(*) n FROM provider_outages').first()).toEqual({n:0});
    f.outage(false);
    const row = await f.db.prepare('SELECT outbound_request_json FROM recipient_steps').first<{outbound_request_json:string}>();
    const stored = JSON.parse(row!.outbound_request_json); stored.content.from.email = 'other@example.test';
    await f.db.prepare('UPDATE recipient_steps SET outbound_request_json=?,lease_expires_at=0,lease_token=NULL,next_attempt_at=0').bind(JSON.stringify(stored)).run();
    await f.lifecycle.delivery.dispatchStep({...campaign, channel:'email'});
    expect(f.outbound).toHaveLength(2);
  } finally { await f.dispose(); }
});

test('receiver rejection and settings redaction cannot elevate forged content', async () => {
  const f = await fixture();
  try {
    const challenge = await f.verifier.prepareChallenge({recipient:'receiver@example.test',subject:'Test',text:'Diagnostic'});
    await f.verifier.sendChallenge(challenge.id,f.platform.mailer);
    f.changeReceipt(value => ({...value, signedBody:{...value.signedBody,complete:false}}));
    await expect(f.verifier.acquireObservation(challenge.id)).rejects.toThrow('receiver-correlation-mismatch');
    const status = await createSettingsService(f.platform).senderStatus();
    expect(status.validation.ready).toBe(false);
    const json = JSON.stringify(status);
    for (const secret of ['receiver@example.test',challenge.nonce,challenge.requestDigest,'test-only-credential','test-only-authenticated-receiver']) expect(json).not.toContain(secret);
  } finally { await f.dispose(); }
});

import { expect, test } from '@playwright/test';
import { fixture, draft } from '../sender-verification/fixture';
import { senderIdentitySchema } from '../../src/core/features/settings/sender-validation';
import { loadSenderSettings, saveSenderSettings } from '../../src/core/features/settings/sender-persistence';
import { createSettingsService } from '../../src/core/features/settings/service';
import { createAuthoringService } from '../../src/core/features/campaigns/authoring-service';
import { createDeliveryService } from '../../src/core/features/lifecycle/delivery';
import { readProductionConfig } from '../../src/core/platform/config';

const authority = {sessionId:'settings-session',operatorId:'operator-settings',version:1};
async function grant(f: Awaited<ReturnType<typeof fixture>>) {
  await f.db.prepare("INSERT INTO oa_operators (id,email,display_name,role,status,version,created_at) VALUES ('operator-settings','settings@example.test','Settings operator','owner','active',1,?)").bind(Date.now()).run();
  await f.db.prepare("INSERT INTO oa_sessions (id,token_hash,operator_id,operator_version,kind,created_at,expires_at) VALUES ('settings-session','test-only-hash','operator-settings',1,'native',?,?)").bind(Date.now(),Date.now()+3600000).run();
}
const identity = {displayName:'Mango', fromEmail:'offers@example.test', replyToEmail:'reply@example.test', physicalAddress:'24 New Street, Brisbane QLD 4000, Australia'};

test('sender fields reject absent, malformed and unsafe input', () => {
  expect(senderIdentitySchema.parse({...identity, displayName:' Mango '})).toEqual(identity);
  for (const input of [null, {}, {...identity, displayName:''}, {...identity, displayName:'Mango\r\nBcc: victim@example.test'},
    {...identity, fromEmail:'a@b'}, {...identity, fromEmail:'offers@example.test\r\n'}, {...identity, replyToEmail:'reply@example.test\r\nX: bad'},
    {...identity, physicalAddress:''}, {...identity, physicalAddress:'<script>bad</script>'},
    {...identity, physicalAddress:'{{unsubscribe_url}}'}, {...identity, physicalAddress:'X'.repeat(501)},
    {...identity, physicalAddress:'12345'}, {...identity, apiKey:'injected'}]) expect(senderIdentitySchema.safeParse(input).success).toBe(false);
});

test('saved identity survives platform reconstruction and clears previous evidence atomically', async () => {
  const f = await fixture(false);
  try {
    await grant(f);
    await f.prove();
    expect((await f.verifier.inspect('Mango <offers@example.test>')).ready).toBe(true);
    await saveSenderSettings(f.platform, identity, authority);
    const row = await f.db.prepare('SELECT * FROM sender_settings').first();
    expect(row).toMatchObject({physical_address:identity.physicalAddress, updated_by:'operator-settings'});
    expect((await f.verifier.inspect('Mango <offers@example.test>')).ready).toBe(false);
    const restarted = f.originalProduction();
    expect((await loadSenderSettings(restarted)).physicalAddress).toBe(identity.physicalAddress);
    await f.prove();
    expect((await f.verifier.inspect('Mango <offers@example.test>')).ready).toBe(true);
    await saveSenderSettings(f.platform, identity, authority);
    expect((await f.verifier.inspect('Mango <offers@example.test>')).ready).toBe(true);
    const authoring = createAuthoringService(f.platform, f.services.lifecycleRuntime, f.services.storeService);
    expect(authoring.defaults().sender.physicalAddress).toBe(identity.physicalAddress);
    await saveSenderSettings(f.platform, {...identity, physicalAddress:'25 Next Street, Brisbane QLD 4000'}, authority);
    expect(authoring.defaults().sender.physicalAddress).toBe('25 Next Street, Brisbane QLD 4000');
    await expect(saveSenderSettings(f.platform, {...identity, fromEmail:'bad'}, authority)).rejects.toThrow();
    expect((await createSettingsService(f.platform).senderStatus()).identity.physicalAddress).toBe('25 Next Street, Brisbane QLD 4000');
  } finally { await f.dispose(); }
});

test('production can start with unset marketing details while authentication sender stays required', async () => {
  const f = await fixture(false);
  try {
    const config = readProductionConfig({...f.bindings, MAIL_SENDER_NAME:'', MAIL_REPLY_TO:'', MAIL_PHYSICAL_ADDRESS:''});
    expect(config.mailSender).toMatchObject({displayName:'',replyToEmail:'',physicalAddress:''});
    expect((await createSettingsService({...f.platform,config}).senderStatus()).validation).toMatchObject({state:'blocked',ready:false});
    expect(() => readProductionConfig({...f.bindings,MAIL_AUTH_FROM:''})).toThrow('MAIL_AUTH_FROM is required.');
  } finally { await f.dispose(); }
});

test('revoked native session cannot commit a saved identity or invalidate its sender evidence', async () => {
  const f = await fixture(false);
  try {
    await grant(f);
    await saveSenderSettings(f.platform, identity, authority);
    await f.prove();
    const evidence = await f.db.prepare('SELECT generation,observation_id FROM sender_verification_state').first();
    await f.db.prepare('UPDATE oa_sessions SET revoked_at=? WHERE id=?').bind(Date.now(),authority.sessionId).run();
    await expect(saveSenderSettings(f.platform, {...identity,physicalAddress:'99 Changed Street'}, authority)).rejects.toThrow();
    expect((await loadSenderSettings(f.platform)).physicalAddress).toBe(identity.physicalAddress);
    expect(await f.db.prepare('SELECT generation,observation_id FROM sender_verification_state').first()).toEqual(evidence);
    await expect(saveSenderSettings(f.platform, identity, authority)).rejects.toThrow();
  } finally { await f.dispose(); }
});

test('updated settings block an old approved campaign and managed footer sends the new saved address', async () => {
  const f = await fixture();
  try {
    await grant(f);
    await f.prove();
    const old = await draft(f, 'old-address');
    expect((await f.lifecycle.approval.approve(old)).kind).toBe('approved');
    await saveSenderSettings(f.platform, identity, authority);
    await f.prove();
    const afterChecks = f.outbound.length;
    await f.lifecycle.delivery.dispatchStep({...old, channel:'email'});
    expect(f.outbound).toHaveLength(afterChecks);
    expect((await f.lifecycle.approval.reapprove({...old, idempotencyKey:'reapprove-old-address'})).kind).toBe('blocked');
    const current = await draft(f, 'current-address');
    await f.db.prepare('UPDATE campaign_revisions SET physical_address=? WHERE id=?').bind(identity.physicalAddress,current.revisionId).run();
    expect((await f.lifecycle.approval.approve(current)).kind).toBe('approved');
    await f.lifecycle.delivery.dispatchStep({...current, channel:'email'});
    expect(f.outbound).toHaveLength(afterChecks + 1);
    expect(f.outbound.at(-1)?.html).toContain(identity.physicalAddress);
    expect(f.outbound.at(-1)?.text).toContain(identity.physicalAddress);
    expect(f.outbound.at(-1)?.html).not.toContain('1 Test Street');
    await f.lifecycle.delivery.dispatchStep({...current, channel:'email'});
    expect(f.outbound).toHaveLength(afterChecks + 1);
  } finally { await f.dispose(); }
});

test('changing only reply-to immediately before the atomic handoff fence cannot send stale content', async () => {
  const f = await fixture();
  try {
    await grant(f);
    await f.prove(); const campaign = await draft(f, 'race-settings');
    expect((await f.lifecycle.approval.approve(campaign)).kind).toBe('approved');
    const count = f.outbound.length;
    const repository = f.lifecycle.repository;
    const delivery = createDeliveryService(f.services.lifecycleRuntime, {...repository, async markHandoffUnknown(...args) {
      await saveSenderSettings(f.platform, {...f.platform.config.mailSender, replyToEmail:'changed@example.test'}, authority);
      return repository.markHandoffUnknown(...args);
    }});
    await delivery.dispatchStep({...campaign, channel:'email'});
    expect(f.outbound).toHaveLength(count);
    const recipient = await f.db.prepare('SELECT transport_disposition,last_error_code FROM recipient_steps WHERE revision_id=?').bind(campaign.revisionId).first();
    expect(recipient).toMatchObject({transport_disposition:'queued',last_error_code:'approval-or-sender-authority-changed'});
  } finally { await f.dispose(); }
});

test('test sends reject missing setup and stale postal content', async () => {
  const f = await fixture();
  try {
    await grant(f);
    const campaign = await draft(f, 'test-settings');
    f.platform.config.mailSender.physicalAddress = '';
    const input = {...campaign, channel:'email' as const, to:'receiver@example.test'};
    expect((await f.lifecycle.approval.sendTest(input)).kind).toBe('blocked');
    await saveSenderSettings(f.platform, identity, authority);
    expect((await f.lifecycle.approval.sendTest(input)).kind).toBe('blocked');
    expect(f.outbound).toHaveLength(0);
  } finally { await f.dispose(); }
});

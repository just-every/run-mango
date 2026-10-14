import { test, expect } from '@playwright/test';
import { fixture, draft } from './fixture';

test('native D1 rolls observation insertion back if authority update fails', async()=>{
  const f=await fixture();
  try {
    const challenge=await f.verifier.prepareChallenge({recipient:'receiver@example.test',subject:'Approved diagnostic',text:'Approved test only'});
    await f.verifier.sendChallenge(challenge.id,f.platform.mailer);
    await f.db.prepare(`CREATE TRIGGER reject_observation BEFORE UPDATE ON sender_verification_state
      WHEN NEW.observation_id IS NOT NULL BEGIN SELECT RAISE(ABORT, 'test-rollback'); END`).run();
    await expect(f.verifier.acquireObservation(challenge.id)).rejects.toThrow('test-rollback');
    expect(await f.db.prepare('SELECT count(*) n FROM sender_verification_observations').first()).toEqual({n:0});
    expect((await f.verifier.inspect('Mango <offers@example.test>')).ready).toBe(false);
    await f.db.prepare('DROP TRIGGER reject_observation').run();
    await f.verifier.acquireObservation(challenge.id);
    expect((await f.verifier.inspect('Mango <offers@example.test>')).ready).toBe(true);
  } finally {await f.dispose();}
});

test('native D1 rolls approval back if evidence association cannot persist', async()=>{
  const f=await fixture();
  try {
    await f.prove(); const campaign=await draft(f);
    await f.db.prepare(`CREATE TRIGGER reject_association BEFORE INSERT ON sender_verification_associations
      BEGIN SELECT RAISE(ABORT, 'test-approval-rollback'); END`).run();
    await expect(f.lifecycle.approval.approve(campaign)).rejects.toThrow('test-approval-rollback');
    expect(await f.db.prepare('SELECT count(*) n FROM campaign_approval_requests').first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT count(*) n FROM recipient_steps').first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT state FROM campaigns').first()).toEqual({state:'draft'});
  } finally {await f.dispose();}
});

test('an expired lease cannot be committed using a supplied historical clock', async()=>{
  const f=await fixture();
  try {
    await f.prove(); const campaign=await draft(f);
    const inspection=await f.verifier.inspect('Mango <offers@example.test>');
    const snapshot=await f.lifecycle.repository.readRevisionSnapshot(campaign.campaignId,campaign.revisionId);
    await f.db.prepare('UPDATE sender_verification_inspections SET expires_at=? WHERE id=?').bind(Date.now()-1,inspection.lease!.id).run();
    const authority=await f.db.prepare('SELECT generation FROM audience_source_authority WHERE id=1').first<{generation:number}>();
    if(!authority)throw new Error('Expected migrated source authority.');
    const result=await f.lifecycle.repository.approve({sourceGeneration:authority.generation,snapshot:snapshot!,revisionDigest:'test-digest',operatorId:'operator',idempotencyKey:'test-expired',candidates:[],now:new Date(1),reconciliationWindowMs:{},senderLease:inspection.lease});
    expect(result.kind).toBe('conflict');
    expect(await f.db.prepare('SELECT count(*) n FROM campaign_approval_requests').first()).toEqual({n:0});
  } finally {await f.dispose();}
});

test('changed DKIM bytes and provider failure invalidate old observed success until a new challenge', async()=>{
  const f=await fixture();
  try {
    await f.prove();
    f.status('failed'); expect((await f.verifier.inspect('Mango <offers@example.test>')).ready).toBe(false);
    f.status('verified'); expect((await f.verifier.inspect('Mango <offers@example.test>')).reason).toBe('observation-revoked');
    await f.prove();
    f.records[2].value='v=DKIM1; p=';
    expect((await f.verifier.inspect('Mango <offers@example.test>')).ready).toBe(false);
  } finally {await f.dispose();}
});

test('a concurrently prepared newer negative defeats the prior successful challenge', async()=>{
  const f=await fixture();
  try {
    const approval={recipient:'receiver@example.test',subject:'Diagnostic',text:'Approved diagnostic'};
    const first=await f.verifier.prepareChallenge(approval), second=await f.verifier.prepareChallenge(approval);
    await f.verifier.sendChallenge(first.id,f.platform.mailer);
    await f.verifier.sendChallenge(second.id,f.platform.mailer);
    await f.verifier.acquireObservation(first.id);
    f.authResult('fail');
    await f.verifier.acquireObservation(second.id);
    expect((await f.verifier.inspect('Mango <offers@example.test>')).reason).toBe('authentication-failed');
    expect(await f.db.prepare('SELECT count(*) n FROM sender_verification_observations').first()).toEqual({n:2});
  } finally {await f.dispose();}
});

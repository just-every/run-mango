import {test, expect} from '@playwright/test';
import {fixture, legacyApproval, approvalBytes, draft} from './fixture';
import {createDeliveryService} from '../../src/core/features/lifecycle/delivery';
import {createApprovalService} from '../../src/core/features/lifecycle/approval';

const sender = 'Mango <offers@example.test>';
const reapprove = (campaign: Awaited<ReturnType<typeof legacyApproval>>) => ({...campaign,operatorId:'present-operator',idempotencyKey:`reapprove-${campaign.revisionId}`});

async function noHandoff(f: Awaited<ReturnType<typeof fixture>>['current'], count = 1) {
  expect(f.outbound).toHaveLength(count);
  expect(await f.db.prepare("SELECT count(*) n FROM sender_verification_associations WHERE kind='handoff'").first()).toEqual({n:0});
  expect(await f.db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'queued'});
}

test('prior-schema approval never gains authority from a later genuine sender proof or ordinary approve replay',async()=>{
  const h=await fixture();let f=h.current;
  try {
    const campaign=await legacyApproval(f), bytes=await approvalBytes(f.db);
    await h.upgrade();
    expect((await f.lifecycle.approval.reapprove(reapprove(campaign))).kind).toBe('blocked');
    await f.prove();
    expect((await f.verifier.inspect(sender)).ready).toBe(true);
    const priorProviderCalls=f.calls.length;
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    await noHandoff(f);
    expect(f.calls).toHaveLength(priorProviderCalls);
    expect(await f.db.prepare('SELECT handoff_started_at, outbound_request_json, attempt_count, last_error_code FROM recipient_steps').first())
      .toEqual({handoff_started_at:null,outbound_request_json:null,attempt_count:0,last_error_code:'sender-approval-required'});
    expect(await f.lifecycle.approval.approve(campaign)).toMatchObject({kind:'conflict'});
    expect(await f.db.prepare("SELECT count(*) n FROM sender_verification_associations WHERE kind='approval'").first()).toEqual({n:0});
    expect(await approvalBytes(f.db)).toBe(bytes);
    f=await h.restart();
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    await noHandoff(f,0);
    expect(await approvalBytes(f.db)).toBe(bytes);
  } finally {await h.dispose();}
});

test('explicit reapproval appends operator authority, preserves old approval and frozen work, survives restart, sends once',async()=>{
  const h=await fixture();let f=h.current;
  try {
    const campaign=await legacyApproval(f), bytes=await approvalBytes(f.db);
    const recipients=JSON.stringify((await f.db.prepare('SELECT * FROM recipient_steps').all()).results);
    await h.upgrade();await f.prove();
    const input=reapprove(campaign);
    expect(await f.lifecycle.approval.reapprove(input)).toMatchObject({kind:'approved',idempotent:false,revisionDigest:campaign.revisionDigest});
    expect(await f.lifecycle.approval.reapprove(input)).toMatchObject({kind:'approved',idempotent:true});
    expect(await f.db.prepare("SELECT actor_id, action FROM lifecycle_audit_entries WHERE action='sender-reapproved'").first())
      .toEqual({actor_id:'present-operator',action:'sender-reapproved'});
    expect(await f.db.prepare("SELECT count(*) n FROM sender_verification_associations WHERE kind='approval' AND attempt_key=?").bind(campaign.idempotencyKey).first()).toEqual({n:0});
    expect(JSON.stringify((await f.db.prepare('SELECT * FROM recipient_steps').all()).results)).toBe(recipients);
    expect(await approvalBytes(f.db)).toBe(bytes);
    f=await h.restart();
    expect(await f.lifecycle.approval.approve(campaign)).toMatchObject({kind:'approved',idempotent:true});
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    expect(f.outbound).toHaveLength(1);
    expect(f.outbound[0].from).toBe(sender);
    expect(await f.db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'accepted'});
    expect(await approvalBytes(f.db)).toBe(bytes);
  } finally {await h.dispose();}
});

test('legitimately evidenced approval survives its original lease expiry with fresh handoff evidence',async()=>{
  const h=await fixture(false),f=h.current;
  try {
    await f.prove();const campaign=await draft(f);
    expect((await f.lifecycle.approval.approve(campaign)).kind).toBe('approved');
    await f.db.prepare(`UPDATE sender_verification_inspections SET expires_at=checked_at+1
      WHERE id IN (SELECT inspection_id FROM sender_verification_associations WHERE kind='approval')`).run();
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    expect(f.outbound).toHaveLength(2);
    expect(await f.db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'accepted'});
  } finally {await h.dispose();}
});

const races = {
  'approval association removed': "DELETE FROM sender_verification_associations WHERE kind='approval'",
  'approval associated to another revision': "UPDATE sender_verification_associations SET entity_id='another-revision' WHERE kind='approval'",
  'approval associated to another request': "UPDATE sender_verification_associations SET attempt_key='another-request' WHERE kind='approval'",
  'approval inspection no longer a pass': "UPDATE sender_verification_inspections SET ready=0 WHERE id IN (SELECT inspection_id FROM sender_verification_associations WHERE kind='approval')",
  'approval observation removed': "DELETE FROM sender_verification_observations",
  'revision updated after approval': "UPDATE campaign_revisions SET email_subject='Edited',updated_at=updated_at+1",
  'frozen candidate removed': "DELETE FROM campaign_revision_candidates",
  'revision digest changed': "UPDATE campaign_revisions SET content_digest='different'",
  'revision is no longer approved': "UPDATE campaign_revisions SET state='draft'",
  'active revision changed': "UPDATE campaigns SET active_revision_id='different'",
  'sender revoked': "UPDATE sender_verification_state SET revoked_at=1,generation=generation+1",
  'generation changed': "UPDATE sender_verification_state SET generation=generation+1",
  'configuration changed': "UPDATE sender_verification_state SET configuration_digest='different'",
  'stored recipient changed': "UPDATE recipient_steps SET destination='different@example.test'",
};
for(const [name,sql] of Object.entries(races)) test(`atomic handoff rejects ${name} after the earlier approval check`,async()=>{
  const h=await fixture(false),f=h.current;
  try {
    await f.prove();const campaign=await draft(f);
    expect((await f.lifecycle.approval.approve(campaign)).kind).toBe('approved');
    const repository=f.lifecycle.repository;
    const delivery=createDeliveryService(f.services.lifecycleRuntime,{...repository,async markHandoffUnknown(...args){
      await f.db.prepare(sql).run();return repository.markHandoffUnknown(...args);
    }});
    await delivery.dispatchStep({...campaign,channel:'email'});
    await noHandoff(f);
  } finally {await h.dispose();}
});

test('reapproval association removal at final handoff cannot fall back to the historical approval',async()=>{
  const h=await fixture(),f=h.current;
  try {
    const campaign=await legacyApproval(f);await h.upgrade();await f.prove();
    expect((await f.lifecycle.approval.reapprove(reapprove(campaign))).kind).toBe('approved');
    const repository=f.lifecycle.repository;
    const delivery=createDeliveryService(f.services.lifecycleRuntime,{...repository,async markHandoffUnknown(...args){
      await f.db.prepare("DELETE FROM sender_verification_associations WHERE kind='approval'").run();return repository.markHandoffUnknown(...args);
    }});
    await delivery.dispatchStep({...campaign,channel:'email'});await noHandoff(f);
  } finally {await h.dispose();}
});

test('reapproval write guards concurrent revision change and revocation with no partial audit',async()=>{
  const h=await fixture(),f=h.current;
  try {
    const campaign=await legacyApproval(f),bytes=await approvalBytes(f.db);await h.upgrade();await f.prove();
    const repository=f.lifecycle.repository;
    const approval=createApprovalService(f.services.lifecycleRuntime,{...repository,async reapproveSender(input){
      await f.verifier.revoke();return repository.reapproveSender(input);
    }});
    expect((await approval.reapprove(reapprove(campaign))).kind).toBe('conflict');
    expect(await f.db.prepare("SELECT count(*) n FROM lifecycle_audit_entries WHERE action='sender-reapproved'").first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT count(*) n FROM sender_verification_associations').first()).toEqual({n:0});
    expect(await approvalBytes(f.db)).toBe(bytes);
  } finally {await h.dispose();}
});

import {test,expect} from '@playwright/test';
import {fixture,legacyApproval,approvalBytes,draft,recipientBytesAfterAuthorityMigration} from './fixture';
import {createApprovalService} from '../../src/core/features/lifecycle/approval';

const input=(campaign:Awaited<ReturnType<typeof legacyApproval>>)=>({...campaign,idempotencyKey:`reapprove-${campaign.revisionId}`,operatorId:'current-operator'});

for(const mutation of [
  "UPDATE campaign_revisions SET updated_at=updated_at+1",
  "UPDATE campaign_revisions SET content_digest='changed'",
  "UPDATE campaigns SET active_revision_id='changed'",
  "UPDATE campaigns SET state='cancelled'",
  "UPDATE sender_verification_state SET configuration_digest='changed'",
  "UPDATE sender_verification_inspections SET expires_at=checked_at WHERE ready=1",
]) test(`explicit reapproval rejects final-write race: ${mutation}`,async()=>{
  const h=await fixture(),f=h.current;
  try {
    const campaign=await legacyApproval(f),bytes=await approvalBytes(f.db);await h.upgrade();await f.prove();
    const repository=f.lifecycle.repository;
    const approval=createApprovalService(f.services.lifecycleRuntime,{...repository,async reapproveSender(value){
      await f.db.prepare(mutation).run();return repository.reapproveSender(value);
    }});
    expect((await approval.reapprove(input(campaign))).kind).toBe('conflict');
    expect(await f.db.prepare("SELECT count(*) n FROM lifecycle_audit_entries WHERE action='sender-reapproved'").first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT count(*) n FROM sender_verification_associations').first()).toEqual({n:0});
    expect(await approvalBytes(f.db)).toBe(bytes);
    expect(f.outbound).toHaveLength(1);
  } finally {await h.dispose();}
});

test('reapproval audit and association roll back together, then the same explicit request can succeed',async()=>{
  const h=await fixture(),f=h.current;
  try {
    const campaign=await legacyApproval(f),bytes=await approvalBytes(f.db);await h.upgrade();await f.prove();
    await f.db.prepare(`CREATE TRIGGER reject_reapproval BEFORE INSERT ON sender_verification_associations
      BEGIN SELECT RAISE(ABORT,'reapproval-rollback'); END`).run();
    await expect(f.lifecycle.approval.reapprove(input(campaign))).rejects.toThrow('reapproval-rollback');
    expect(await f.db.prepare("SELECT count(*) n FROM lifecycle_audit_entries WHERE action='sender-reapproved'").first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT count(*) n FROM sender_verification_associations').first()).toEqual({n:0});
    expect(await approvalBytes(f.db)).toBe(bytes);
    await f.db.prepare('DROP TRIGGER reject_reapproval').run();
    expect((await f.lifecycle.approval.reapprove(input(campaign))).kind).toBe('approved');
  } finally {await h.dispose();}
});

test('handoff association failure rolls back handoff state and makes zero marketing provider calls',async()=>{
  const h=await fixture(false),f=h.current;
  try {
    await f.prove();const campaign=await draft(f);expect((await f.lifecycle.approval.approve(campaign)).kind).toBe('approved');
    await f.db.prepare(`CREATE TRIGGER reject_handoff BEFORE INSERT ON sender_verification_associations
      WHEN NEW.kind='handoff' BEGIN SELECT RAISE(ABORT,'handoff-rollback'); END`).run();
    await expect(f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'})).rejects.toThrow('handoff-rollback');
    expect(await f.db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'queued'});
    expect(await f.db.prepare("SELECT count(*) n FROM sender_verification_associations WHERE kind='handoff'").first()).toEqual({n:0});
    expect(f.outbound).toHaveLength(1);
  } finally {await h.dispose();}
});

test('reapproval key conflict cannot authorize another revision and replay never replaces the first operator',async()=>{
  const h=await fixture(),f=h.current;
  try {
    const first=await legacyApproval(f),second=await legacyApproval(f);await h.upgrade();await f.prove();
    expect((await f.lifecycle.approval.reapprove(input(first))).kind).toBe('approved');
    expect(await f.lifecycle.approval.reapprove({...input(first),operatorId:'second-operator'})).toMatchObject({kind:'approved',idempotent:true});
    expect((await f.lifecycle.approval.reapprove({...input(second),idempotencyKey:input(first).idempotencyKey})).kind).toBe('conflict');
    expect(await f.db.prepare("SELECT actor_id FROM lifecycle_audit_entries WHERE action='sender-reapproved'").first()).toEqual({actor_id:'current-operator'});
    expect(await f.lifecycle.repository.hasSenderApprovalAuthority(second.campaignId,second.revisionId)).toBe(false);
  } finally {await h.dispose();}
});

test('explicit reapproval and restart preserve accepted and uncertain provider truth and never resend them',async()=>{
  const h=await fixture();let f=h.current;
  try {
    await draft(f);await draft(f);
    const pending=await legacyApproval(f,crypto.randomUUID(),true);
    expect(pending.recipientIds).toHaveLength(3);
    const [acceptedId,unknownId]=pending.recipientIds;
    await f.db.prepare("UPDATE recipient_steps SET transport_disposition='accepted',provider='resend',provider_message_id='historic-accepted',attempt_count=1,handed_off_at=?,outbound_request_json=? WHERE id=?")
      .bind(Date.now(),JSON.stringify({idempotencyKey:'historic-accepted-bytes'}),acceptedId).run();
    await f.db.prepare("UPDATE recipient_steps SET transport_disposition='handoff-unknown',provider='resend',attempt_count=1,handoff_started_at=?,outbound_request_json=? WHERE id=?")
      .bind(Date.now(),JSON.stringify({idempotencyKey:'historic-uncertain-bytes'}),unknownId).run();
    const historic=recipientBytesAfterAuthorityMigration(JSON.stringify((await f.db.prepare("SELECT * FROM recipient_steps WHERE transport_disposition<>'queued' ORDER BY id").all()).results));
    const bytes=await approvalBytes(f.db);await h.upgrade();await f.prove();
    expect((await f.lifecycle.approval.reapprove(input(pending))).kind).toBe('approved');
    f=await h.restart();
    expect(JSON.stringify((await f.db.prepare("SELECT * FROM recipient_steps WHERE transport_disposition<>'queued' ORDER BY id").all()).results)).toBe(historic);
    await f.lifecycle.delivery.dispatchStep({...pending,channel:'email'});
    await f.lifecycle.delivery.dispatchStep({...pending,channel:'email'});
    expect(f.outbound).toHaveLength(1);
    expect((await f.lifecycle.approval.reapprove(input(pending))).kind).toBe('conflict');
    expect(JSON.stringify((await f.db.prepare('SELECT * FROM recipient_steps WHERE id IN (?,?) ORDER BY id').bind(acceptedId,unknownId).all()).results)).toBe(historic);
    expect(await approvalBytes(f.db)).toBe(bytes);
  } finally {await h.dispose();}
});

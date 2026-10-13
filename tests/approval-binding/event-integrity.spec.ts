import {test,expect} from '@playwright/test';
import {native,approved,rows,approvedFrom,replacement} from './native';
import {createDeliveryService} from '../../src/core/features/lifecycle/delivery';

for(const sql of [
  "UPDATE lifecycle_audit_entries SET actor_id='substituted-actor' WHERE action='approved'",
  "UPDATE lifecycle_audit_entries SET occurred_at=occurred_at+1 WHERE action='approved'",
  "UPDATE lifecycle_audit_entries SET detail_json=json_set(detail_json,'$.approvedFrom','Mango <other@example.test>') WHERE action='approved'",
  "UPDATE sender_verification_inspections SET checked_at=checked_at-1 WHERE id IN (SELECT inspection_id FROM sender_verification_associations WHERE kind='approval')",
  "UPDATE campaign_approval_requests SET write_token='substituted-event'",
]) test(`final handoff requires the immutable authorization event: ${sql}`,async()=>{
  const h=await native(),f=h.f;
  try {
    const campaign=await approved(f),sent=f.outbound.length,repository=f.lifecycle.repository;
    const delivery=createDeliveryService(f.services.lifecycleRuntime,{...repository,async markHandoffUnknown(...args){
      await f.db.prepare(sql).run();return repository.markHandoffUnknown(...args);
    }});
    await delivery.dispatchStep({...campaign,channel:'email'});
    expect(f.outbound).toHaveLength(sent);
    expect(await f.db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'queued'});
    expect(await f.db.prepare("SELECT COUNT(*) n FROM sender_verification_associations WHERE kind='handoff'").first()).toEqual({n:0});
  } finally {await h.dispose();}
});

test('new approval records the selected evidence and original identity; historic lease expiry still sends once',async()=>{
  const h=await native(),f=h.f;
  try {
    const campaign=await approved(f),original=await rows(f.db,'campaign_approval_requests');
    const approval=await f.db.prepare('SELECT * FROM campaign_approval_requests').first();
    const event=await f.db.prepare("SELECT * FROM lifecycle_audit_entries WHERE action='approved'").first<any>();
    const detail=JSON.parse(event.detail_json);
    const inspection=await f.db.prepare("SELECT si.* FROM sender_verification_inspections si JOIN sender_verification_associations sa ON sa.inspection_id=si.id WHERE sa.kind='approval'").first<any>();
    expect(detail.approval).toEqual(approval);
    expect(detail.approvedFrom).toBe(approvedFrom);
    expect(detail.senderEvidence).toMatchObject({id:inspection.id,checkedAt:inspection.checked_at,observationId:inspection.observation_id});
    expect(event.occurred_at).toBeGreaterThanOrEqual(inspection.checked_at);
    const eventBytes=await rows(f.db,'lifecycle_audit_entries');
    await f.db.prepare('UPDATE sender_verification_inspections SET expires_at=checked_at+1 WHERE id=?').bind(inspection.id).run();
    expect(await f.lifecycle.repository.hasSenderApprovalAuthority(campaign.campaignId,campaign.revisionId)).toBe(true);
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    expect(f.outbound).toHaveLength(2);
    expect(f.outbound[1].from).toBe(approvedFrom);
    expect(await rows(f.db,'campaign_approval_requests')).toBe(original);
    expect(await rows(f.db,'lifecycle_audit_entries')).toBe(eventBytes);
  } finally {await h.dispose();}
});

test('an older audit without its selected evidence requires explicit recovery without rewriting history',async()=>{
  const h=await native(),f=h.f;
  try {
    const campaign=await approved(f);
    await f.db.prepare("UPDATE lifecycle_audit_entries SET detail_json=json_remove(detail_json,'$.approval','$.approvedFrom','$.senderEvidence') WHERE action='approved'").run();
    const oldEvent=await f.db.prepare("SELECT * FROM lifecycle_audit_entries WHERE action='approved'").first();
    const before=await rows(f.db,'campaign_approval_requests');
    const calls=f.calls.length;
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    expect(f.calls).toHaveLength(calls);
    expect((await f.lifecycle.approval.approve(campaign)).kind).toBe('conflict');
    const recipients=await rows(f.db,'recipient_steps');
    const input={...campaign,idempotencyKey:'new-explicit-event',operatorId:'recovering-operator'};
    expect(await f.lifecycle.approval.reapprove(input)).toMatchObject({kind:'approved',idempotent:false});
    expect(await f.lifecycle.approval.reapprove({...input,operatorId:'different-operator'})).toMatchObject({kind:'approved',idempotent:true});
    expect(await rows(f.db,'campaign_approval_requests')).toBe(before);
    expect(await rows(f.db,'recipient_steps')).toBe(recipients);
    expect(await f.db.prepare("SELECT * FROM lifecycle_audit_entries WHERE action='approved'").first()).toEqual(oldEvent);
    expect(await f.db.prepare("SELECT actor_id FROM lifecycle_audit_entries WHERE action='sender-reapproved'").first()).toEqual({actor_id:'recovering-operator'});
    await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
    expect(f.outbound).toHaveLength(2);
  } finally {await h.dispose();}
});

test('reapproval replay validates its own event even when the original approval still authorizes delivery',async()=>{
  const h=await native(),f=h.f;
  try {
    const campaign=await approved(f),input={...campaign,idempotencyKey:'explicit-replay',operatorId:'new-operator'};
    expect((await f.lifecycle.approval.reapprove(input)).kind).toBe('approved');
    const later=await replacement(f,false);
    await f.db.prepare("UPDATE sender_verification_associations SET inspection_id=? WHERE attempt_key='sender-reapproval:explicit-replay'").bind(later).run();
    expect(await f.lifecycle.repository.hasSenderApprovalAuthority(campaign.campaignId,campaign.revisionId)).toBe(true);
    const events=await rows(f.db,'lifecycle_audit_entries');
    expect((await f.lifecycle.approval.reapprove(input)).kind).toBe('conflict');
    expect(await rows(f.db,'lifecycle_audit_entries')).toBe(events);
  } finally {await h.dispose();}
});

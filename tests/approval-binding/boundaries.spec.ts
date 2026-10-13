import {test,expect} from '@playwright/test';
import {native,approved,historical,replacement,rows} from './native';
import {createApprovalService} from '../../src/core/features/lifecycle/approval';
import {createDeliveryService} from '../../src/core/features/lifecycle/delivery';

for (const reapproval of [false,true]) for (const otherFrom of [false,true]) {
  test(`${reapproval?'reapproval':'approval'} cannot use a replacement ${otherFrom?'other-From':'later same-From'} inspection`,async()=>{
    const h=await native(reapproval),f=h.f;
    try {
      const campaign=reapproval?await historical(h):await approved(f);
      if(reapproval) expect((await f.lifecycle.approval.reapprove({...campaign,idempotencyKey:'explicit-binding',operatorId:'new-operator'})).kind).toBe('approved');
      const immutable=await rows(f.db,'campaign_approval_requests');
      const audit=await rows(f.db,'lifecycle_audit_entries');
      const selected=await f.db.prepare("SELECT inspection_id FROM sender_verification_associations WHERE kind='approval'").first<{inspection_id:string}>();
      const substituted=await replacement(f,otherFrom);
      expect(substituted).not.toBe(selected!.inspection_id);
      await f.db.prepare("UPDATE sender_verification_associations SET inspection_id=? WHERE kind='approval'").bind(substituted).run();
      const providerCalls=f.calls.length,outbound=f.outbound.length;
      expect(await f.lifecycle.repository.hasSenderApprovalAuthority(campaign.campaignId,campaign.revisionId)).toBe(false);
      expect((await f.lifecycle.approval.approve(campaign)).kind).toBe('conflict');
      await f.lifecycle.delivery.dispatchStep({...campaign,channel:'email'});
      expect(f.calls).toHaveLength(providerCalls);expect(f.outbound).toHaveLength(outbound);
      expect(await f.db.prepare('SELECT transport_disposition,attempt_count,outbound_request_json FROM recipient_steps').first())
        .toEqual({transport_disposition:'queued',attempt_count:0,outbound_request_json:null});
      expect(await rows(f.db,'campaign_approval_requests')).toBe(immutable);
      expect(await rows(f.db,'lifecycle_audit_entries')).toBe(audit);
    } finally {await h.dispose();}
  });
}

test('the final handoff transaction rejects a same-From inspection substituted after the service check',async()=>{
  const h=await native(),f=h.f;
  try {
    const campaign=await approved(f),substituted=await replacement(f,false),sent=f.outbound.length;
    const repository=f.lifecycle.repository;
    const delivery=createDeliveryService(f.services.lifecycleRuntime,{...repository,async markHandoffUnknown(...args){
      await f.db.prepare("UPDATE sender_verification_associations SET inspection_id=? WHERE kind='approval'").bind(substituted).run();
      return repository.markHandoffUnknown(...args);
    }});
    await delivery.dispatchStep({...campaign,channel:'email'});
    expect(f.outbound).toHaveLength(sent);
    expect(await f.db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'queued'});
    expect(await f.db.prepare("SELECT COUNT(*) n FROM sender_verification_associations WHERE kind='handoff'").first()).toEqual({n:0});
  } finally {await h.dispose();}
});

for(const sql of [
  "UPDATE campaign_approval_requests SET idempotency_key='replacement-approval-key'",
  "UPDATE campaign_approval_requests SET write_token='replacement-write-token'",
  'UPDATE campaign_approval_requests SET created_at=created_at+1',
]) test(`reapproval fences the original approval read before checks: ${sql}`,async()=>{
  const h=await native(true),f=h.f;
  try {
    const campaign=await historical(h),recipients=await rows(f.db,'recipient_steps');
    const repository=f.lifecycle.repository;
    let changed='';
    const approval=createApprovalService(f.services.lifecycleRuntime,{...repository,async reapproveSender(input){
      await f.db.prepare(sql).run();changed=await rows(f.db,'campaign_approval_requests');
      return repository.reapproveSender(input);
    }});
    expect((await approval.reapprove({...campaign,idempotencyKey:'explicit-race',operatorId:'new-operator'})).kind).toBe('conflict');
    expect(await f.db.prepare("SELECT COUNT(*) n FROM lifecycle_audit_entries WHERE action='sender-reapproved'").first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT COUNT(*) n FROM sender_verification_associations').first()).toEqual({n:0});
    expect(await rows(f.db,'campaign_approval_requests')).toBe(changed);
    expect(await rows(f.db,'recipient_steps')).toBe(recipients);
    expect(f.outbound).toHaveLength(1);
  } finally {await h.dispose();}
});

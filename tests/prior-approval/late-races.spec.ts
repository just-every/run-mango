import {test,expect} from '@playwright/test';
import {fixture,legacyApproval} from './fixture';
import {createDeliveryService} from '../../src/core/features/lifecycle/delivery';

const changes = {
  'fresh handoff lease expires while historical evidence stays intact': `UPDATE sender_verification_inspections SET expires_at=checked_at
    WHERE id NOT IN (SELECT inspection_id FROM sender_verification_associations WHERE kind='approval')`,
  'persisted From changes after verification': `UPDATE recipient_steps SET outbound_request_json=json_set(outbound_request_json,'$.content.from.email','other@example.test')`,
  'reapproval audit loses its original approval key': `UPDATE lifecycle_audit_entries SET detail_json=json_set(detail_json,'$.approvalKey','unrelated-approval') WHERE action='sender-reapproved'`,
};
for(const [name,sql] of Object.entries(changes)) test(`final transaction blocks when ${name}`,async()=>{
  const h=await fixture(),f=h.current;
  try {
    const campaign=await legacyApproval(f);await h.upgrade();await f.prove();
    expect((await f.lifecycle.approval.reapprove({...campaign,operatorId:'operator',idempotencyKey:`reapproval-${campaign.revisionId}`})).kind).toBe('approved');
    const repository=f.lifecycle.repository;
    const delivery=createDeliveryService(f.services.lifecycleRuntime,{...repository,async markHandoffUnknown(...args){
      await f.db.prepare(sql).run();return repository.markHandoffUnknown(...args);
    }});
    await delivery.dispatchStep({...campaign,channel:'email'});
    expect(f.outbound).toHaveLength(1);
    expect(await f.db.prepare("SELECT count(*) n FROM sender_verification_associations WHERE kind='handoff'").first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT transport_disposition FROM recipient_steps').first()).toEqual({transport_disposition:'queued'});
  } finally {await h.dispose();}
});

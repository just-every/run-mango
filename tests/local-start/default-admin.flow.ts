import { expect } from '@playwright/test';
import { decisionRuntime } from '../proposals-decision/runtime';
import { testIdentity } from '../support/test-identity';

// Populated public API doors establish the default role; no product role is
// assigned to this colleague. Provider responses use the existing edge fixture.
export async function defaultAdminJourney() {
  const runtime=await decisionRuntime();
  const id='synthetic-mango-903';
  try {
    const identity=testIdentity(runtime.platform);
    await identity.importLocalDemoOperator({id,email:[id,'example.test'].join(String.fromCharCode(64)),displayName:id},new Date());
    const session=await identity.createTestSession(id);
    const call=(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>runtime.call(path,body,true,method,session.token);
    const assignments=()=>runtime.db.prepare('SELECT role FROM operator_product_roles WHERE operator_id=?').bind(id).all();
    expect((await assignments()).results).toEqual([]);
    expect(await call('/api/operator')).toMatchObject({status:200,body:{operator:{id,role:'admin'}}});
    const generated=await call('/api/proposals/generate',{});
    expect(generated.status).toBe(201);
    const {proposalId,campaignId,revisionId}=generated.body;
    expect(await call(`/api/proposals/${proposalId}`)).toMatchObject({status:200,body:{proposal:{id:proposalId,state:'proposed'},history:expect.arrayContaining([expect.objectContaining({toState:'proposed',actorId:id})])}});
    expect((await call('/api/decision-desk')).body.proposals.map((entry:any)=>entry.proposal.id)).toContain(proposalId);
    expect(await call(`/api/proposals/${proposalId}/adopt`,{})).toMatchObject({status:200,body:{campaignId}});
    expect((await call(`/api/campaign-revisions/${revisionId}`,{name:id,emailSubject:'A saved Admin letter'},'PATCH')).status).toBe(200);
    expect(await call(`/api/campaigns/${campaignId}`)).toMatchObject({status:200,body:{revision:{id:revisionId,name:id,emailSubject:'A saved Admin letter',state:'draft'}}});
    const graph={name:id,trigger:'Confirmed subscription',nodes:[
      {id:'start',kind:'trigger',label:'Start',next:['end']},{id:'end',kind:'exit',label:'End',next:[]}]};
    const flow=await call('/api/flow-drafts',graph);
    expect(flow.status).toBe(201);
    expect((await call('/api/flow-drafts')).body.revisions).toContainEqual(expect.objectContaining({id:flow.body.revisionId,created_by:id,graph}));
    const contact=(await call('/api/audience')).body.contacts.find((row:any)=>row.displayName==='first');
    expect(contact).toMatchObject({emailStatus:'subscribed'});
    expect((await call(`/api/contacts/${contact.id}/opt-out`,{channel:'email'})).status).toBe(200);
    expect(await call(`/api/contacts/${contact.id}`)).toMatchObject({status:200,body:{contact:{id:contact.id,emailStatus:'unsubscribed'}}});
    const sender=(await call('/api/settings/sender')).body.identity;
    const changed={...sender,displayName:id};
    expect((await call('/api/settings/sender',changed,'PUT')).status).toBe(200);
    expect(await call('/api/settings/sender')).toMatchObject({status:200,body:{identity:changed}});
    expect(await call(`/api/proposals/${proposalId}/dismiss`,{reason:'Superseded by the saved draft'})).toMatchObject({status:200,body:{kind:'dismissed'}});
    expect(await call(`/api/proposals/${proposalId}`)).toMatchObject({status:200,body:{proposal:{state:'dismissed'},history:expect.arrayContaining([expect.objectContaining({toState:'dismissed',actorId:id})])}});
    // Admin is still bounded by Owner-only connection authority.
    expect(await call('/api/settings/sending/connection',{},'POST')).toMatchObject({status:403,body:{error:'role_forbidden'}});
    expect((await assignments()).results).toEqual([]);
    expect(await runtime.db.prepare('SELECT count(*) AS n FROM campaign_approval_requests').first()).toEqual({n:0});
    expect(await runtime.db.prepare('SELECT count(*) AS n FROM recipient_steps').first()).toEqual({n:0});
    expect(runtime.jobs).toEqual([]);
    // A session loses every exercised door after revocation, with saved data intact.
    const before=(await runtime.db.prepare('SELECT display_name FROM sender_settings').all()).results;
    await runtime.db.prepare('UPDATE oa_sessions SET revoked_at=? WHERE operator_id=?').bind(Date.now(),id).run();
    for(const path of ['/api/operator',`/api/proposals/${proposalId}`,`/api/campaigns/${campaignId}`,'/api/flow-drafts',`/api/contacts/${contact.id}`,'/api/settings/sender']) {
      expect((await call(path)).status).toBe(401);
    }
    expect((await call('/api/settings/sender',sender,'PUT')).status).toBe(401);
    expect((await runtime.db.prepare('SELECT display_name FROM sender_settings').all()).results).toEqual(before);
  } finally {await runtime.close();}
}

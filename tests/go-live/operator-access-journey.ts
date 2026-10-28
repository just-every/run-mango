import {expect} from '@playwright/test';
import {invitationRuntime,confirmedOwner,confirmedInvite,cookie} from '../../operations/fixtures/invitation-runtime.mjs';

// Invite, confirm, cancel and revoke through the same HTTP doors an owner uses.
export async function operatorAccessJourney() {
  console.log('Operator access: start native HTTP installation');
  const site=await invitationRuntime();
  console.log('Operator access: claim owner');
  let held:Promise<Response>|undefined,barrier:string|undefined;
  try {
    const owner=await confirmedOwner(site);
    console.log('Operator access: confirm teammate');
    const teammate=await confirmedInvite(site,owner,'teammate@example.test');
    const invite=async(email:string)=>{
      const response=await site.call('/api/operators',{method:'POST',cookie:owner,body:{email}});
      expect(response.status).toBe(201);
      return {...await response.json(),token:await site.token()};
    };
    console.log('Operator access: cancel pending invitation');
    const pending=await invite('pending@example.test');
    const path=`/api/operators/${pending.operator.id}`;
    expect((await site.call(path,{method:'DELETE'})).status).toBe(401);
    expect((await site.call(path,{method:'DELETE',cookie:owner,origin:'https://attacker.test'})).status).toBe(403);
    expect((await site.call(path,{method:'DELETE',cookie:owner})).status).toBe(204);
    for(const method of ['GET','HEAD','POST']) {
      const response=await site.call(method==='POST'?'/auth/confirm':`/auth/confirm?token=${pending.token}`,{method,...(method==='POST'?{body:{token:pending.token}}:{})});
      expect(response.status).toBe(400);
      expect(response.headers.has('set-cookie')).toBe(false);
    }
    console.log('Operator access: confirm while removal is pending');
    const racing=await invite('racing@example.test');
    barrier=crypto.randomUUID();
    held=site.call(`/api/operators/${racing.operator.id}`,{method:'DELETE',cookie:owner,headers:{'X-Test-Barrier':barrier,'X-Test-Target':racing.operator.id}});
    await expect.poll(async()=>Boolean(await site.db.prepare('SELECT id FROM test_barriers WHERE id=?').bind(barrier).first())).toBe(true);
    const confirmed=await site.call('/auth/confirm',{method:'POST',body:{token:racing.token}});
    expect(confirmed.status).toBe(303);
    await site.db.prepare('UPDATE test_barriers SET released=1 WHERE id=?').bind(barrier).run();
    const conflict=await held;
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toEqual({error:'authority_changed'});
    console.log('Operator access: revoke active sessions');
    const operators=(await (await site.call('/api/operators',{cookie:owner})).json()).operators;
    expect(operators.find((row:any)=>row.id===racing.operator.id).status).toBe('active');
    expect((await site.call(`/api/operators/${racing.operator.id}`,{method:'DELETE',cookie:owner})).status).toBe(204);
    expect((await site.call('/api/operator',{cookie:cookie(confirmed)})).status).toBe(401);
    expect((await site.call(`/api/operators/${teammate.operator.id}`,{method:'DELETE',cookie:owner})).status).toBe(204);
    expect((await site.call('/api/operator',{cookie:teammate.cookie})).status).toBe(401);
    const initial=operators.find((row:any)=>row.isInitial);
    expect((await site.call(`/api/operators/${initial.id}`,{method:'DELETE',cookie:owner})).status).toBe(409);
    expect((await site.call('/api/operator',{cookie:owner})).status).toBe(200);
  } finally {
    if(barrier)await site.db.prepare('UPDATE test_barriers SET released=1 WHERE id=?').bind(barrier).run();
    if(held)await held;
    await site.close();
  }
}

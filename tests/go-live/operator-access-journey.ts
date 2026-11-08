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
    console.log('Operator access: stale session cannot grant access');
    const mailCount=async()=>(await site.db.prepare('SELECT COUNT(*) AS n FROM test_mail').first<{n:number}>())!.n;
    const listed=async()=>(await (await site.call('/api/operators',{cookie:owner})).json()).operators.map((row:any)=>row.email);
    await site.db.prepare("UPDATE oa_sessions SET created_at=created_at-3600000 WHERE operator_id IN (SELECT id FROM oa_operators WHERE email='owner@example.test')").run();
    const mailBefore=await mailCount();
    const refused=await site.call('/api/operators',{method:'POST',cookie:owner,body:{email:'late@example.test'}});
    expect(refused.status).toBe(403);
    expect(await refused.json()).toEqual({error:'step_up_required'});
    expect(await listed()).not.toContain('late@example.test');
    expect(await mailCount()).toBe(mailBefore);
    console.log('Operator access: confirmation link bound to the requesting session');
    expect((await site.call('/auth/step-up',{method:'POST',cookie:owner,body:{action:'owner:transfer',returnTo:'/app/settings'}})).status).toBe(202);
    const link=await site.token();
    for(const method of ['GET','HEAD']) {
      const preview=await site.call(`/auth/confirm?token=${link}`,{method,cookie:owner});
      expect(preview.status).toBe(200);
      expect(preview.headers.has('set-cookie')).toBe(false);
    }
    const stillRefused=await site.call('/api/operators',{method:'POST',cookie:owner,body:{email:'late@example.test'}});
    expect(stillRefused.status).toBe(403);
    expect((await site.call('/auth/confirm',{method:'POST',body:{token:link}})).status).toBe(400);
    expect((await site.call('/auth/confirm',{method:'POST',cookie:teammate.cookie,body:{token:link}})).status).toBe(400);
    expect((await site.call('/api/operators',{method:'POST',cookie:owner,body:{email:'late@example.test'}})).status).toBe(403);
    const proof=await site.call('/auth/confirm',{method:'POST',cookie:owner,body:{token:link}});
    expect(proof.status).toBe(303);
    expect(proof.headers.get('location')).toBe('/app/settings');
    expect((await site.call('/auth/confirm',{method:'POST',cookie:owner,body:{token:link}})).status).toBe(400);
    const retried=await site.call('/api/operators',{method:'POST',cookie:owner,body:{email:'late@example.test'}});
    expect(retried.status).toBe(201);
    expect((await retried.json()).operator.status).toBe('invited');
    expect(await listed()).toContain('late@example.test');
    console.log('Operator access: only the setup operator removes the setup operator');
    const setup=(await (await site.call('/api/operators',{cookie:owner})).json()).operators.find((row:any)=>row.isInitial);
    const admin=await site.call(`/api/operators/${setup.id}`,{method:'DELETE',cookie:teammate.cookie});
    expect(admin.status).toBe(403);
    expect((await site.call(`/api/operators/${teammate.operator.id}/role`,{method:'PUT',cookie:owner,body:{role:'owner'}})).status).toBe(200);
    const denied=await site.call(`/api/operators/${setup.id}`,{method:'DELETE',cookie:teammate.cookie});
    expect(denied.status).toBe(400);
    expect(await denied.json()).toEqual({error:'The initial operator can remove themselves only.'});
    expect((await site.call('/api/operator',{cookie:owner})).status).toBe(200);
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
    console.log('Operator access: the setup operator removes themselves');
    const successor=await confirmedInvite(site,owner,'successor@example.test');
    expect((await site.call(`/api/operators/${successor.operator.id}/role`,{method:'PUT',cookie:owner,body:{role:'owner'}})).status).toBe(200);
    expect((await site.call(`/api/operators/${initial.id}`,{method:'DELETE',cookie:owner})).status).toBe(204);
    expect((await site.call('/api/operator',{cookie:owner})).status).toBe(401);
    expect((await site.call('/api/operator',{cookie:successor.cookie})).status).toBe(200);
    expect((await (await site.call('/api/operators',{cookie:successor.cookie})).json()).operators.map((row:any)=>row.email)).not.toContain('owner@example.test');
  } finally {
    if(barrier)await site.db.prepare('UPDATE test_barriers SET released=1 WHERE id=?').bind(barrier).run();
    if(held)await held;
    await site.close();
  }
}

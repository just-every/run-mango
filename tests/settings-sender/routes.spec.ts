// @ts-nocheck -- The shared test harness runs real native sessions inside workerd.
import { expect, test } from '@playwright/test';
import { confirmedInvite, confirmedOwner, invitationRuntime } from '../../operations/fixtures/invitation-runtime.mjs';
import {writeFile} from 'node:fs/promises';

test('native sessions and origin protect durable sender and open-estimate updates', async ({},info) => {
  const f = await invitationRuntime();
  const body = {displayName:'Business Name',fromEmail:'news@example.test',replyToEmail:'reply@example.test',physicalAddress:'42 Business Road, Brisbane QLD 4000, Australia'};
  let pending,barrier;
  try {
    expect((await f.call('/api/settings/sender',{method:'PUT',body})).status).toBe(401);
    const owner = await confirmedOwner(f);
    expect((await f.call('/api/settings/sender',{method:'PUT',body,cookie:owner,origin:'https://attacker.test'})).status).toBe(403);
    expect((await f.call('/api/settings/sender',{method:'PUT',body:{...body,physicalAddress:'<img src=x>'},cookie:owner})).status).toBe(400);
    expect(await f.db.prepare('SELECT count(*) AS count FROM sender_settings').first()).toEqual({count:0});
    const saved = await f.call('/api/settings/sender',{method:'PUT',body,cookie:owner});
    expect(saved.status).toBe(200);
    expect(saved.headers.get('cache-control')).toBe('no-store');
    expect((await saved.json()).identity).toEqual(body);
    expect((await (await f.call('/api/settings/sender',{cookie:owner})).json()).identity).toEqual(body);
    expect(await f.db.prepare('SELECT physical_address FROM sender_settings').first()).toEqual({physical_address:body.physicalAddress});
    const path='/api/insights/open-tracking';
    expect((await f.call(path,{method:'PUT',body:{enabled:true}})).status).toBe(401);
    expect((await f.call(path,{method:'PUT',body:{enabled:true},cookie:owner,origin:'https://attacker.test'})).status).toBe(403);
    const ownerOperator=(await (await f.call('/api/operator',{cookie:owner})).json()).operator;
    const lastOwner=await f.call(`/api/operators/${ownerOperator.id}`,{method:'DELETE',cookie:owner});
    expect(lastOwner.status).toBe(409);expect(await lastOwner.json()).toEqual({error:'last_owner'});
    const snapshot=async()=>(await f.db.prepare('SELECT * FROM open_tracking_settings').all()).results;
    const races=[];
    // The native Worker body stream starts only when the admitted route reads
    // JSON. The write barrier separately pauses after authority was captured.
    for(const [stage,revocation] of [['body','session'],['body','operator'],['write','session'],['write','operator']]) {
      // A confirmed invitation provides an independently revocable native owner;
      // the original owner stays active throughout all four races.
      const actor=await confirmedInvite(f,owner,`${stage}-${revocation}@example.test`);
      const before=await snapshot();barrier=`open-${stage}-${revocation}`;
      const headers=stage==='body'?{'X-Test-Body-Barrier':barrier}:{'X-Test-Barrier':barrier,'X-Test-Sql-Prefix':'INSERT INTO open_tracking_settings','X-Test-Before-Batch':'1'};
      pending=f.call(path,{method:'PUT',body:{enabled:before[0]?.enabled!==1},cookie:actor.cookie,headers});
      await expect.poll(async()=>Boolean(await f.db.prepare('SELECT id FROM test_barriers WHERE id=?').bind(barrier).first())).toBe(true);
      const revoked=revocation==='session'
        ? await f.call('/auth/signout',{method:'POST',cookie:actor.cookie,body:{}})
        : await f.call(`/api/operators/${actor.operator.id}`,{method:'DELETE',cookie:owner});
      expect(revoked.status).toBe(204);
      expect((await f.call('/api/operator',{cookie:actor.cookie})).status).toBe(401);
      await f.db.prepare('UPDATE test_barriers SET released=1 WHERE id=?').bind(barrier).run();
      const denied=await pending;pending=undefined;
      const result=await denied.json(),after=await snapshot();
      races.push({stage,revocation,status:denied.status,result,before,after});
      await writeFile(info.outputPath('open-tracking-authority.json'),JSON.stringify(races,null,2));
      expect(denied.status).toBe(403);expect(result).toHaveProperty('error','authority_changed');
      expect(after).toEqual(before);
      // The unaffected original owner still writes, and an unchanged preference
      // does not increment the token generation.
      expect((await f.call(path,{method:'PUT',body:{enabled:true},cookie:owner})).status).toBe(200);
      const enabled=await snapshot();
      expect((await f.call(path,{method:'PUT',body:{enabled:true},cookie:owner})).status).toBe(200);
      expect(await snapshot()).toEqual(enabled);
    }
  } finally {
    try {
      if(barrier)await f.db.prepare('UPDATE test_barriers SET released=1 WHERE id=?').bind(barrier).run();
      if(pending)await pending;
    } finally {await f.close();}
  }
});

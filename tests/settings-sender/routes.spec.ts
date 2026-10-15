// @ts-nocheck -- The shared test harness runs real native sessions inside workerd.
import { expect, test } from '@playwright/test';
import { invitationRuntime } from '../../operations/fixtures/invitation-runtime.mjs';
import {writeFile} from 'node:fs/promises';

test('native sessions and origin protect durable sender and open-estimate updates', async ({},info) => {
  const f = await invitationRuntime();
  const body = {displayName:'Business Name',fromEmail:'news@example.test',replyToEmail:'reply@example.test',physicalAddress:'42 Business Road, Brisbane QLD 4000, Australia'};
  try {
    expect((await f.call('/api/settings/sender',{method:'PUT',body})).status).toBe(401);
    const owner = await f.bootstrap();
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
    const operator=(await (await f.call('/api/operator',{cookie:owner})).json()).operator;
    const originalOperator=await f.db.prepare('SELECT status,version FROM oa_operators WHERE id=?').bind(operator.id).first();
    const snapshot=async()=>(await f.db.prepare('SELECT * FROM open_tracking_settings').all()).results;
    const races=[];
    // The native Worker body stream starts only when the admitted route reads
    // JSON. The write barrier separately pauses after authority was captured.
    for(const [stage,revocation] of [['body','session'],['body','operator'],['write','session'],['write','operator']]) {
      const before=await snapshot(),barrier=`open-${stage}-${revocation}`;
      const headers=stage==='body'?{'X-Test-Body-Barrier':barrier}:{'X-Test-Barrier':barrier,'X-Test-Sql-Prefix':'INSERT INTO open_tracking_settings','X-Test-Before-Batch':'1'};
      const pending=f.call(path,{method:'PUT',body:{enabled:before[0]?.enabled!==1},cookie:owner,headers});
      await expect.poll(async()=>Boolean(await f.db.prepare('SELECT id FROM test_barriers WHERE id=?').bind(barrier).first())).toBe(true);
      if(revocation==='session')await f.db.prepare('UPDATE oa_sessions SET revoked_at=? WHERE operator_id=?').bind(Date.now(),operator.id).run();
      else await f.db.prepare("UPDATE oa_operators SET status='inactive',version=version+1 WHERE id=?").bind(operator.id).run();
      await f.db.prepare('UPDATE test_barriers SET released=1 WHERE id=?').bind(barrier).run();
      const denied=await pending;
      const result=await denied.json(),after=await snapshot();
      races.push({stage,revocation,status:denied.status,result,before,after});
      await writeFile(info.outputPath('open-tracking-authority.json'),JSON.stringify(races,null,2));
      expect(denied.status).toBe(403);expect(result).toHaveProperty('error','authority_changed');
      expect(after).toEqual(before);
      // Restore this fixture's authority for the next independent race.
      await f.db.prepare('UPDATE oa_sessions SET revoked_at=NULL WHERE operator_id=?').bind(operator.id).run();
      await f.db.prepare('UPDATE oa_operators SET status=?,version=? WHERE id=?').bind(originalOperator.status,originalOperator.version,operator.id).run();
      expect((await f.call(path,{method:'PUT',body:{enabled:true},cookie:owner})).status).toBe(200);
      const enabled=await snapshot();
      expect((await f.call(path,{method:'PUT',body:{enabled:true},cookie:owner})).status).toBe(200);
      expect(await snapshot()).toEqual(enabled);
    }
  } finally { await f.close(); }
});

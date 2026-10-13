import { expect } from '@playwright/test';
import { contract } from '../contract';
import { invitationRuntime, cookie } from '../../operations/fixtures/invitation-runtime.mjs';
contract('OPER-001','Mango Base magic and invitation mail contain text and HTML with product branding',async()=>{
  const runtime=await invitationRuntime();
  try {
    await runtime.bootstrap();
    expect((await runtime.call('/auth/magic-link',{method:'POST',body:{email:'owner@example.test'}})).status).toBe(202);
    const confirmedOwner=await runtime.call('/auth/confirm',{method:'POST',body:{token:await runtime.token()}});
    expect(confirmedOwner.status).toBe(303);const owner=cookie(confirmedOwner);
    expect((await runtime.call('/api/operators',{method:'POST',cookie:owner,body:{email:'invited@example.test'}})).status).toBe(201);
    const rows=(await runtime.db.prepare('SELECT body FROM test_mail ORDER BY id').all()).results;
    expect(rows.length).toBe(2);
    for(const row of rows){const mail=JSON.parse(row.body);expect(mail.subject.includes('Mango')).toBe(true);for(const kind of ['text/plain','text/html']){const content=mail.content.find(part=>part.type===kind);expect(content.value.includes('Mango')).toBe(true);expect(content.value.includes('/auth/confirm?token=')).toBe(true);expect(content.value.includes('Confirm')).toBe(true);}}
  } finally {await runtime.close();}
});
contract('OPER-002','cancelled operators can be reinvited while old links and direct activation remain fenced',async()=>{
  const runtime=await invitationRuntime();
  try {
    await runtime.bootstrap();
    expect((await runtime.call('/auth/magic-link',{method:'POST',body:{email:'owner@example.test'}})).status).toBe(202);
    const confirmedOwner=await runtime.call('/auth/confirm',{method:'POST',body:{token:await runtime.token()}});
    expect(confirmedOwner.status).toBe(303);const owner=cookie(confirmedOwner);
    const invited=await runtime.call('/api/operators',{method:'POST',cookie:owner,body:{email:'again@example.test'}});
    expect(invited.status).toBe(201);const {operator}=await invited.json();const oldToken=await runtime.token();
    expect((await runtime.call(`/api/operators/${operator.id}`,{method:'DELETE',cookie:owner})).status).toBe(204);
    await expect(runtime.db.prepare("UPDATE oa_operators SET status='active' WHERE id=?").bind(operator.id).run()).rejects.toThrow(/invitation_required/);
    const reissued=await runtime.call('/api/operators',{method:'POST',cookie:owner,body:{email:'again@example.test'}});
    expect(reissued.status).toBe(201);expect((await reissued.json()).operator.id).toBe(operator.id);const token=await runtime.token();expect(token !== oldToken).toBe(true);
    for(const method of ['GET','HEAD','POST']) {const path=method==='POST'?'/auth/confirm':`/auth/confirm?token=${oldToken}`;const response=await runtime.call(path,{method,...(method==='POST'?{body:{token:oldToken}}:{})});expect(response.status).toBe(400);expect(response.headers.has('set-cookie')).toBe(false);}
    const confirmed=await runtime.call('/auth/confirm',{method:'POST',body:{token}});expect(confirmed.status).toBe(303);
    expect((await runtime.call('/api/operator',{cookie:cookie(confirmed)})).status).toBe(200);
    expect((await runtime.db.prepare('SELECT count(*) AS n FROM oa_operators WHERE email=?').bind('again@example.test').first()).n).toBe(1);
  } finally {await runtime.close();}
});

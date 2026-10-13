// @ts-nocheck -- The shared test harness runs real native sessions inside workerd.
import { expect, test } from '@playwright/test';
import { invitationRuntime } from '../../operations/fixtures/invitation-runtime.mjs';

test('native sessions and origin protect durable sender updates', async () => {
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
  } finally { await f.close(); }
});

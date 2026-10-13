import {test, expect} from '@playwright/test';
import {fixture} from './fixture';

test('an uncertain diagnostic handoff persists its pagination cursor and reconciles after restart without resending', async()=>{
  const f=await fixture(false);
  try {
    const challenge=await f.verifier.prepareChallenge({recipient:'receiver@example.test',subject:'Approved diagnostic',text:'Approved local test'});
    const adapter=f.platform.mailer;
    await expect(f.verifier.sendChallenge(challenge.id,{...adapter, async send(request) {
      await adapter.send(request); throw new Error('test-lost-response');
    }})).rejects.toThrow('test-lost-response');
    expect(f.outbound).toHaveLength(1);
    f.reconciliationPages();
    await expect(f.verifier.sendChallenge(challenge.id,adapter)).rejects.toThrow('probe-handoff-unresolved');
    expect(await f.db.prepare('SELECT reconcile_cursor,provider_message_id FROM sender_verification_challenges WHERE id=?').bind(challenge.id).first())
      .toEqual({reconcile_cursor:'other-email',provider_message_id:null});
    const restarted=f.restart();
    expect(await restarted.sendChallenge(challenge.id,f.platform.mailer)).toMatchObject({providerMessageId:'sent-1'});
    expect(f.calls.some(url=>url.includes('/emails?limit=100&after=other-email'))).toBe(true);
    expect(f.outbound).toHaveLength(1);
    await restarted.acquireObservation(challenge.id);
    expect((await restarted.inspect('Mango <offers@example.test>')).ready).toBe(true);
    await restarted.sendChallenge(challenge.id,f.platform.mailer);
    expect(f.outbound).toHaveLength(1);
  } finally {await f.dispose();}
});

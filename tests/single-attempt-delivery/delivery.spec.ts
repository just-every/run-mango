import { test, expect } from '@playwright/test';
import { fixture, draft } from '../sender-verification/fixture';
import { createSendgridAdapter } from '../../src/core/platform/adapters/sendgrid';
import { createDeliveryService } from '../../src/core/features/lifecycle/delivery';

for (const path of ['success', 'rate-limit', 'rejected', 'timeout', 'reset', '408', '500', 'missing-id', 'eviction']) {
  test(`SEND-001/008 single-attempt ${path} preserves real D1 handoff fence`, async () => {
    const f = await fixture();
    const transport = globalThis.fetch;
    let calls = 0;
    try {
      await f.prove();
      f.platform.mailer = createSendgridAdapter({ apiKey:'test-api-key',webhookPublicKey:'test-public-key',verification:f.verifier });
      const campaign = await draft(f);
      expect(await f.lifecycle.approval.approve(campaign)).toMatchObject({kind:'approved'});
      globalThis.fetch = async (input,init) => {
        if (String(input) !== 'https://api.sendgrid.com/v3/mail/send') return transport(input,init);
        calls++;
        if (path === 'timeout' || path === 'reset') throw new Error(path === 'timeout' ? 'request timed out' : 'ECONNRESET');
        const status = path === 'rate-limit' ? calls === 1 ? 429 : 202 : path === 'rejected' ? 400 : path === '408' ? 408 : path === '500' ? 500 : 202;
        return new Response(null,{status, headers:path === 'missing-id' ? {} : {'x-message-id':'submission-1'}});
      };
      if (path === 'eviction') f.platform.mailer.send = async () => { calls++; throw new Error('Worker eviction after the durable handoff fence'); };
      const delivery = createDeliveryService(f.services.lifecycleRuntime,f.lifecycle.repository);
      await delivery.dispatchStep({...campaign,channel:'email'});
      const read = () => f.db.prepare('SELECT * FROM recipient_steps WHERE revision_id=?').bind(campaign.revisionId).first<any>();
      const first = await read();
      expect(calls).toBe(1);
      if (path === 'success') {
        expect(first.transport_disposition).toBe('accepted');expect(first.provider_message_id).toBe('submission-1');
      } else if (path === 'rate-limit') {
        expect(first.transport_disposition).toBe('queued');
        await f.db.prepare('UPDATE recipient_steps SET next_attempt_at=0 WHERE id=?').bind(first.id).run();
        await delivery.dispatchStep({...campaign,channel:'email'});
        expect(calls).toBe(2);expect((await read()).transport_disposition).toBe('accepted');
      } else if (path === 'rejected') expect(first.transport_disposition).toBe('failed');
      else {
        expect(first.transport_disposition).toBe('handoff-unknown');expect(first.last_error_code).toBe('uncertain');
        await f.db.prepare('UPDATE recipient_steps SET reconcile_until=0,lease_expires_at=0 WHERE id=?').bind(first.id).run();
        await delivery.reconcileRecipient(first.id);
        expect((await read()).transport_disposition).toBe('handoff-unknown');
      }
      // Restart-equivalent new service and duplicate queue dispatch cannot repeat a handoff.
      const restarted = createDeliveryService(f.services.lifecycleRuntime,f.lifecycle.repository);
      await restarted.dispatchStep({...campaign,channel:'email'});
      expect(calls).toBe(path === 'rate-limit' ? 2 : 1);
      expect(await f.db.prepare('SELECT count(*) n FROM sender_verification_associations WHERE kind=?').bind('handoff').first()).toEqual({n:path === 'rate-limit'?2:1});
    } finally { globalThis.fetch=transport;await f.dispose(); }
  });
}

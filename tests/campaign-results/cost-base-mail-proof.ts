import { expect } from '@playwright/test';
import { createBaseMailSender } from '../../src/core/platform/adapters/base-mail';
import type { Database } from '../../src/core/platform/db/client';

/** A real Base transport keeps Resend's envelope identity; only its network edge implements provider deduplication. */
export async function proveBaseMailReplay(database: Database) {
  const previousFetch = globalThis.fetch;
  const receipts = new Map<string, string>();
  let calls = 0, purchases = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url) !== 'https://api.resend.com/emails') throw new Error('Unexpected provider request');
    calls++;
    const deliveryId = new Headers(init?.headers).get('Idempotency-Key')!;
    if (!receipts.has(deliveryId)) receipts.set(deliveryId, `cost-receipt-${++purchases}`);
    return Response.json({ id: receipts.get(deliveryId) });
  };
  try {
    const sender = createBaseMailSender({ mailProvider: 'resend', mailProviderApiKey: 'test-only' }, database);
    const message = { deliveryId: crypto.randomUUID(), from: 'sender@example.test', to: ['recipient@example.test'],
      subject: 'Transport proof', text: 'Fixture body', html: '<p>Fixture body</p>', headers: {} };
    const first = await sender.send(message);
    expect(await sender.send(message)).toEqual(first);
    expect({ calls, purchases }).toEqual({ calls: 2, purchases: 1 });
    expect((await database.$client.prepare("SELECT id FROM external_cost_facts WHERE operation='auth-mail-handoff'").all()).results).toHaveLength(1);
    await sender.send({ ...message, deliveryId: crypto.randomUUID() });
    expect({ calls, purchases }).toEqual({ calls: 3, purchases: 2 });
    expect((await database.$client.prepare("SELECT id FROM external_cost_facts WHERE operation='auth-mail-handoff'").all()).results).toHaveLength(2);
    // The provider's expired idempotency window is a new paid attempt, even with the original envelope ID.
    await database.$client.prepare("UPDATE external_cost_facts SET occurred_at=? WHERE operation='auth-mail-handoff'")
      .bind(Date.now() - 2 * 86_400_000).run();
    receipts.clear();
    await sender.send(message);
    expect({ calls, purchases }).toEqual({ calls: 4, purchases: 3 });
    expect((await database.$client.prepare("SELECT id FROM external_cost_facts WHERE operation='auth-mail-handoff'").all()).results).toHaveLength(3);
  } finally { globalThis.fetch = previousFetch; }
}

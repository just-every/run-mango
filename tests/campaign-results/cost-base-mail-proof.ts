import { expect } from '@playwright/test';
import { createBaseMailSender } from '../../src/core/platform/adapters/base-mail';
import type { Database } from '../../src/core/platform/db/client';

/** Wait once for the real persisted shared budget; never retry a provider send. */
export async function waitForMailBudget(db:D1Database) {
  const row=await db.prepare('SELECT MAX(next_at) AS due FROM provider_pacing').first<{due:number|null}>();
  const delay=Math.ceil(Number(row?.due??0)-Date.now());
  if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
}

/** Pause after the actual cost INSERT commits, before the command can claim its handoff. */
export function holdCostPreparation(db:D1Database,challengeId:string) {
  let release!:()=>void, arrived!:()=>void;
  const held=new Promise<void>(resolve=>{release=resolve;});
  const reached=new Promise<void>(resolve=>{arrived=resolve;});
  const statement=(target:D1PreparedStatement,values:unknown[]=[]):D1PreparedStatement=>new Proxy(target,{
    get(target,key) {
      if(key==='bind')return (...args:unknown[])=>statement(target.bind(...args),args);
      if(key==='run'&&values[0]===`sender-verification:${challengeId}`)return async()=>{
        const result=await target.run();
        arrived();await held;return result;
      };
      const value=Reflect.get(target,key);
      return typeof value==='function'?value.bind(target):value;
    },
  });
  const database=new Proxy(db,{
    get(target,key) {
      if(key==='prepare')return (sql:string)=>{
        const prepared=target.prepare(sql);
        return /INSERT INTO external_cost_facts/.test(sql)?statement(prepared):prepared;
      };
      const value=Reflect.get(target,key);
      return typeof value==='function'?value.bind(target):value;
    },
  });
  return {database,reached,release};
}

/** A real Base transport keeps Resend's envelope identity; only its network edge implements provider deduplication. */
export async function proveBaseMailReplay(database: Database,config:Parameters<typeof createBaseMailSender>[0]) {
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
    const sender = createBaseMailSender(config, database);
    const message = { deliveryId: crypto.randomUUID(), from: 'sender@example.test', to: ['recipient@example.test'],
      subject: 'Transport proof', text: 'Fixture body', html: '<p>Fixture body</p>', headers: {} };
    await waitForMailBudget(database.$client);
    const first = await sender.send(message);
    await waitForMailBudget(database.$client);
    expect(await sender.send(message)).toEqual(first);
    expect({ calls, purchases }).toEqual({ calls: 2, purchases: 1 });
    expect((await database.$client.prepare("SELECT id FROM external_cost_facts WHERE operation='auth-mail-handoff'").all()).results).toHaveLength(1);
    await waitForMailBudget(database.$client);
    await sender.send({ ...message, deliveryId: crypto.randomUUID() });
    expect({ calls, purchases }).toEqual({ calls: 3, purchases: 2 });
    expect((await database.$client.prepare("SELECT id FROM external_cost_facts WHERE operation='auth-mail-handoff'").all()).results).toHaveLength(2);
    // The provider's expired idempotency window is a new paid attempt, even with the original envelope ID.
    await database.$client.prepare("UPDATE external_cost_facts SET occurred_at=? WHERE operation='auth-mail-handoff'")
      .bind(Date.now() - 2 * 86_400_000).run();
    receipts.clear();
    await waitForMailBudget(database.$client);
    await sender.send(message);
    expect({ calls, purchases }).toEqual({ calls: 4, purchases: 3 });
    expect((await database.$client.prepare("SELECT id FROM external_cost_facts WHERE operation='auth-mail-handoff'").all()).results).toHaveLength(3);
  } finally { globalThis.fetch = previousFetch; }
}

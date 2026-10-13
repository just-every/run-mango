import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
// The local key gate: the development outbox answers only a request that holds the checkout's RER_DEV_KEY,
// which rer setup wrote. Journeys remember each runtime's key by its origin and open the gate in a browser
// context the way the RER_OPEN page does (a same-origin POST that works without JavaScript).
const keys = new Map();
export async function rememberKey(url, checkout) {
  const key = /^RER_DEV_KEY=(\S+)$/m.exec(await readFile(join(checkout, '.rer/local/dev-key.env'), 'utf8'))[1];
  keys.set(url, key);
  return key;
}
// rer's proxy serves Vite's /@fs/ files (here only because a journey copy links node_modules from outside the checkout)
// to a request holding the key header or the rer_dev_gate_<port> cookie; Mango's operator-auth names its gate cookie
// rer_dev_gate, so those module requests present the header, as rer's own harness does.
const routed = new WeakSet();
export async function openGate(context, url) {
  const response = await context.request.post(url + '/__dev/key', { data: { key: keys.get(url) } });
  assert.equal(response.status(), 204, 'the key opens the outbox gate');
  if (routed.has(context)) return;
  routed.add(context);
  await context.route(url + '/@fs/**', route => route.continue({ headers: { ...route.request().headers(), 'x-rer-dev-key': keys.get(url) } }));
}

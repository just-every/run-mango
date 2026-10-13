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
export async function openGate(context, url) {
  const response = await context.request.post(url + '/__dev/key', { data: { key: keys.get(url) } });
  assert.equal(response.status(), 204, 'the key opens the outbox gate');
}

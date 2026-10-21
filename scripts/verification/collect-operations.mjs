// Collection only: load every operation file and expand its registration-time
// matrices without calling test bodies, hooks, or starting application fixtures.
import { registerHooks } from 'node:module';
import { readdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const rows = [];
let file;
globalThis.__mangoCollectOperation = (name, options, body) => {
  if (typeof options === 'function') { body = options; options = {}; }
  if (typeof name !== 'string' || typeof body !== 'function' || options?.skip || options?.todo || options?.only) {
    throw new Error('Operation collection requires ordinary named, enabled cases.');
  }
  rows.push({file, name});
};
const source = `export const test = (...args) => globalThis.__mangoCollectOperation(...args); export default test;`;
const registration = registerHooks({resolve(specifier, context, next) {
  if (specifier === 'node:test') return {url: 'data:text/javascript,' + encodeURIComponent(source), shortCircuit: true};
  return next(specifier, context);
}});
process.env.NODE_TEST_CONTEXT = 'collection';
try {
  for (file of (await readdir('operations')).filter(name => name.endsWith('.test.mjs')).sort()) {
    await import(pathToFileURL(resolve('operations', file)).href);
  }
  process.stdout.write(JSON.stringify(rows) + '\n');
} finally {
  registration.deregister();
  delete globalThis.__mangoCollectOperation;
}

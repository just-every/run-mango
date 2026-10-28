import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createRequire} from 'node:module';
import {expect} from '@playwright/test';
import {authorityRuntime} from './authority-runtime.mjs';
import {nativeDatabase} from './authority-data.mjs';
import {canonicalJson} from '../../src/vendor/base/portability/hash.mjs';
import {platformTable} from '../../src/vendor/base/portability/bookkeeping.mjs';

// Exported by an unmodified ac686032 install: Mango's own seedArchive fixture,
// one contact and an original R2 object. These private inputs are synthetic.
const settings = {
  OWNER_EMAIL: 'owner@example.test',
  SESSION_SECRET: 'synthetic-retained-archive-session-key-at-least-thirty-two-bytes',
  SETUP_TOKEN: 'synthetic-retained-archive-setup-token-at-least-thirty-two-bytes',
  AUTH_ORIGIN: 'http://127.0.0.1:8787', AUTH_LOCAL: 'true', MAIL_PROVIDER: 'development',
  CONTACT_HASH_SALT: 'synthetic-retained-archive-contact-salt-at-least-thirty-two-bytes',
  MANGO_LOCAL_CONFIG_VERSION: '2', MANGO_LOCAL_HASH_AUTHORITY: 'contact-salt-v1',
};
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
const platformProxy = (checkout: string) => createRequire(join(checkout, 'package.json'))('wrangler')
  .getPlatformProxy({ configPath: join(checkout, 'wrangler.toml'), persist: { path: join(checkout, '.wrangler/state/v3') }, remoteBindings: false });

// The archive with its settings goes into the empty copy; rer import restores it.
async function restore(runtime: Awaited<ReturnType<typeof authorityRuntime>>, fixture: string) {
  const source = gunzipSync(await readFile(fixture));
  await writeFile(join(runtime.checkout, '.dev.vars'), Object.entries(settings).map(([key, value]) => key + '=' + value).join('\n') + '\n', { mode: 0o600 });
  await runtime.variables();
  await mkdir(join(runtime.checkout, 'exports'));
  await writeFile(join(runtime.checkout, 'exports/retained.rer'), source, { mode: 0o600 });
  await expect(runtime.command(['import','--input','exports/retained.rer','--yes'])).rejects.toBeInstanceOf(Error);
  await runtime.command(['import','--input','exports/retained.rer','--yes','--acknowledge-unverified-schema-objects']);
  return source.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
}

// Every archived product row and the original R2 object come back exactly.
async function expectRestored(checkout: string, records: any[]) {
  const archived = records.filter(record => record.kind === 'part').flatMap(part => part.items).filter(item => item.kind === 'row');
  expect(archived.length).toBeGreaterThan(0);
  const db = await nativeDatabase(checkout);
  try {
    for (const table of records[0].tables.filter((table: any) => !platformTable(table.name))) {
      const rows = db.prepare(`SELECT ${table.columns.map((column: any) => quote(column.name)).join(',')} FROM ${quote(table.name)}`).all();
      expect(rows.map(row => canonicalJson(row)).sort(), table.name)
        .toEqual(archived.filter(item => item.table === table.name).map(item => canonicalJson(item.row)).sort());
    }
  } finally { db.close(); }
  const proxy = await platformProxy(checkout);
  try {
    const object = await proxy.env.ASSETS_BUCKET.get('retained-original');
    expect(Array.from(new Uint8Array(await object.arrayBuffer()))).toEqual([0, 1, 7, 128, 255]);
    expect(object.customMetadata.purpose).toBe('retained-archive');
    expect(object.httpMetadata.contentType).toBe('application/octet-stream');
  } finally { await proxy.dispose(); }
}


export async function restoreRetainedBackup(runtime:Awaited<ReturnType<typeof authorityRuntime>>) {
  await expectRestored(runtime.checkout,await restore(runtime,'tests/fixtures/mango-retained-ac686032.rer.gz'));
}

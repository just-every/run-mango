import { expect, test } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { authorityRuntime } from './authority-runtime.mjs';
import { nativeDatabase } from './authority-data.mjs';
import { canonicalJson } from '../../src/vendor/base/portability/hash.mjs';

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

test('[DATA-001] a backup from the listed version restores every archived row and original asset through rer import', async () => {
  test.setTimeout(600000);
  const runtime = await authorityRuntime();
  try {
    const source = gunzipSync(await readFile('tests/fixtures/mango-retained-ac686032.rer.gz'));
    await writeFile(join(runtime.checkout, '.dev.vars'), Object.entries(settings).map(([key, value]) => key + '=' + value).join('\n') + '\n', { mode: 0o600 });
    await runtime.variables();
    await mkdir(join(runtime.checkout, 'exports'));
    await writeFile(join(runtime.checkout, 'exports/retained.rer'), source, { mode: 0o600 });
    await runtime.command(['import', '--input', 'exports/retained.rer', '--yes']);
    const records = source.toString('utf8').trim().split('\n').map(line => JSON.parse(line));
    const archived = records.filter(record => record.kind === 'part').flatMap(part => part.items).filter(item => item.kind === 'row');
    expect(archived.length).toBeGreaterThan(0);
    const db = await nativeDatabase(runtime.checkout);
    try {
      for (const table of records[0].tables) {
        const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
        const rows = db.prepare(`SELECT ${table.columns.map((column: any) => quote(column.name)).join(',')} FROM ${quote(table.name)}`).all();
        expect(rows.map(row => canonicalJson(row)).sort(), table.name)
          .toEqual(archived.filter(item => item.table === table.name).map(item => canonicalJson(item.row)).sort());
      }
    } finally { db.close(); }
    const { getPlatformProxy } = createRequire(join(runtime.checkout, 'package.json'))('wrangler');
    const proxy = await getPlatformProxy({ configPath: join(runtime.checkout, 'wrangler.toml'),
      persist: { path: join(runtime.checkout, '.wrangler/state/v3') }, remoteBindings: false });
    try {
      const object = await proxy.env.ASSETS_BUCKET.get('retained-original');
      expect(Array.from(new Uint8Array(await object.arrayBuffer()))).toEqual([0, 1, 7, 128, 255]);
      expect(object.customMetadata.purpose).toBe('retained-archive');
      expect(object.httpMetadata.contentType).toBe('application/octet-stream');
    } finally { await proxy.dispose(); }
  } finally { await runtime.close(); }
});

import { test as base } from '@playwright/test';
import { createRequire } from 'node:module';
import { readdir, readFile } from 'node:fs/promises';
import { sqlStatements } from '../../operations/sql-statements.mjs';
import { createDatabase, type Database } from '../../src/core/platform/db/client';

const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');

export const test = base.extend<{database: Database}>({
  database: async ({}, use) => {
    const worker = new Miniflare({host: '127.0.0.1', port: 0, cf: false, telemetry: {enabled: false}, workers: [{config: {
      name: 'message-rendering-d1', type: 'worker', compatibilityDate: '2026-08-31',
      manifest: {mainModule: 'worker.js', modules: {'worker.js': {type: 'esm', contents: 'export default {fetch(){return new Response("native D1")}}'}}},
      env: {DB: {type: 'd1', id: crypto.randomUUID()}},
    }}]});
    try {
      const binding = await worker.getD1Database('DB') as D1Database;
      for (const file of (await readdir('migrations/core')).filter(file => file.endsWith('.sql')).sort()) {
        await binding.batch(sqlStatements(await readFile(`migrations/core/${file}`, 'utf8')).map(sql => binding.prepare(sql)));
      }
      await use(createDatabase(binding));
    } finally {
      await worker.dispose();
    }
  },
});

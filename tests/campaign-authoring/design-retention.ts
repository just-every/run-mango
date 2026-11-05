import { expect, type APIRequestContext } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readArchive } from '../../src/vendor/base/portability/index.mjs';
import { portabilityRuntime } from '../portability/runtime.mjs';
import { stageArchive, transferRequest } from '../portability/flows';

type Original = { path: string; key: string; bytes: Uint8Array };
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/** Read the fixture's real D1 tables without launching a new Wrangler process
 * for every observation. This door changes no domain or provider behavior. */
export async function readDesignRecords(api: APIRequestContext, runtime: any) {
  const response = await api.get(runtime.url + '/_authoring/design-records', { headers: { 'X-Test-Token': runtime.token } });
  expect(response.status()).toBe(200);
  return await response.json() as { jobs: any[]; candidates: any[]; costs: any[] };
}

/** Open original evidence through the authenticated door, then export and restore
 * the real native run rows and R2 bytes. No provider answer is reconstructed. */
export async function exportRetainedDesigns(api: APIRequestContext, runtime: any, originals: Original[]) {
  const opening = await readDesignRecords(api, runtime);
  const snapshots = { design_jobs: opening.jobs, design_candidates: opening.candidates };
  for (const original of originals) {
    const response = await api.get(runtime.url + original.path);
    expect(response.status()).toBe(200);
    expect(await response.body()).toEqual(Buffer.from(original.bytes));
  }
  const created = await api.post(runtime.url + '/api/portability/exports', { headers: { Origin: runtime.url }, data: {} });
  expect(created.status(), await created.text()).toBe(201);
  const { id } = await created.json();
  let complete = false;
  for (let pass = 0; pass < 100 && !complete; pass++) {
    const next = await api.post(`${runtime.url}/api/portability/exports/${id}/advance`, { headers: { Origin: runtime.url }, data: { maxParts: 16 } });
    expect(next.status(), await next.text()).toBe(200);
    complete = (await next.json()).phase === 'complete';
  }
  expect(complete).toBe(true);
  const download = await api.get(`${runtime.url}/api/portability/exports/${id}/download`);
  expect(download.status()).toBe(200);
  const records: any[] = [];
  for await (const record of readArchive(new Response(await download.body()).body!)) records.push(record);
  const items = records.filter(record => record.kind === 'part').flatMap(part => part.items);
  for (const [table, rows] of Object.entries(snapshots)) {
    expect(items.filter(item => item.kind === 'row' && item.table === table).map(item => item.row)).toEqual(rows);
    const persisted = await readDesignRecords(api, runtime);
    expect(table === 'design_jobs' ? persisted.jobs : persisted.candidates).toEqual(rows);
  }
  for (const original of originals) {
    const descriptor = records[0].objects.find(object => object.bucket === 'ASSETS_BUCKET' && object.key === original.key);
    expect(descriptor).toMatchObject({ size: original.bytes.byteLength, sha256: digest(original.bytes) });
    const chunks = items.filter(item => item.kind === 'object' && item.key === original.key).sort((a, b) => a.offset - b.offset);
    expect(Buffer.concat(chunks.map(chunk => Buffer.from(chunk.data, 'base64')))).toEqual(Buffer.from(original.bytes));
  }
  // The restore target holds matching private authority, but its own owner session.
  const restored = await portabilityRuntime({ restore: true, key: runtime.token });
  try {
    await restored.db.prepare('CREATE TABLE task_authoring_jobs (kind TEXT,payload TEXT)').run();
    const importId = await stageArchive(restored, records);
    const closing = records.at(-1);
    const imported = await transferRequest(restored, `imports/${importId}/finalize`, { contentHash: closing.contentHash, archiveHash: closing.archiveHash });
    expect(imported.status, await imported.clone().text()).toBe(200);
    await restored.resume();
    for (const [table, rows] of Object.entries(snapshots)) {
      expect((await restored.db.prepare(`SELECT * FROM ${table} ORDER BY ${table === 'design_jobs' ? 'id' : 'job_id, slot'}`).all()).results).toEqual(rows);
    }
    for (const original of originals) {
      const response = await restored.call(original.path, { cookie: restored.cookie });
      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(original.bytes);
      expect((await restored.call(original.path)).status).toBe(401);
    }
    const signout = await restored.call('/api/auth/signout', { method: 'POST', cookie: restored.cookie, body: {} });
    expect(signout.status).toBe(204);
    for (const original of originals) {
      expect((await restored.call(original.path, { cookie: restored.cookie })).status).toBe(401);
    }
  } finally { await restored.close(); }
}

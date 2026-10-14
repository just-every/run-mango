import { expect } from '@playwright/test';
import { readArchive } from '../../src/vendor/base/portability/index.mjs';
export const transferRequest = (runtime: any, path: string, body?: unknown, method = 'POST') => runtime.call('/api/portability/' + path, { cookie: runtime.cookie, method, body });
export async function archiveRecords(runtime: any, cookie = runtime.cookie) {
  const response = await runtime.call('/api/portability/exports', {cookie, method: 'POST', body: {}});
  expect(response.status).toBe(201);
  const {id} = await response.json();
  let status;
  do {
    const next = await runtime.call(`/api/portability/exports/${id}/advance`, {cookie, method: 'POST', body: {maxParts: 16}});
    expect(next.status).toBe(200); status = await next.json();
  } while (status.phase !== 'complete');
  const download = await runtime.call(`/api/portability/exports/${id}/download`, {cookie});
  expect(download.status).toBe(200);
  const records: any[] = [];
  for await (const record of readArchive(download.body!)) records.push(record);
  return records;
}
export async function stageArchive(runtime: any, records: any[]) {
  const created = await transferRequest(runtime, 'imports', {confirmed: true, manifest: records[0]});
  expect(created.status, await created.clone().text()).toBe(201);
  const {id} = await created.json();
  for (const part of records.filter(row => row.kind === 'part')) {
    const uploaded = await transferRequest(runtime, `imports/${id}/parts/${part.index}`, part, 'PUT');
    expect(uploaded.status).toBe(200);
    // Replayed parts retain content verification and resumability.
    expect((await transferRequest(runtime, `imports/${id}/parts/${part.index}`, part, 'PUT')).status).toBe(200);
  }
  return id;
}
export async function durableRows(db: D1Database) {
  const tables = (await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> '_cf_METADATA'").all<{name: string}>()).results;
  const snapshots = await db.batch(tables.map(({name}) => db.prepare(`SELECT * FROM "${name.replaceAll('"', '""')}"`)));
  const rows = tables.map(({name}, index) => ({name, rows: snapshots[index].results}));
  return JSON.stringify(rows);
}

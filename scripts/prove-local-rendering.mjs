import { evidenceDirectory } from '../tests/support/artifacts.mjs';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { ensureLocalBootstrapToken } from '../tests/support/bootstrap-token.mjs';
const port = 15665;
const base = `http://127.0.0.1:${port}`;
const state = '.wrangler/state';
const evidence = evidenceDirectory('local-rendering');
await mkdir(evidence, {recursive: true});
const token = await ensureLocalBootstrapToken();
const server = spawn('pnpm', ['exec', 'wrangler', 'dev', '--config', 'dist/server/wrangler.json', '--local', '--ip', '127.0.0.1', '--port', String(port), '--inspector-port', '15699', '--persist-to', state], {detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, WRANGLER_SEND_METRICS: 'false'}});
let logs = '';
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => {logs = (logs + chunk.toString()).replaceAll(token, '[redacted]').slice(-100000)});
const rows = [];
let originalName;
function sql(command) {
  execFileSync('pnpm', ['exec', 'wrangler', 'd1', 'execute', 'mango-local', '--local', '--config', 'wrangler.toml', '--persist-to', state, '--command', command], {stdio: 'pipe', env: {...process.env, WRANGLER_SEND_METRICS: 'false'}});
}
async function probe(path, headers = {}, expected = 200) {
  const response = await fetch(base + path, {headers, redirect: 'manual'});
  const body = await response.text();
  rows.push({path, status: response.status, contentType: response.headers.get('content-type'), location: response.headers.get('location')});
  assert.equal(response.status, expected, `${path}: ${body.slice(0,200)}`);
  return {response, body};
}
try {
  const deadline = Date.now() + 60000;
  while (true) {
    if (server.exitCode !== null) throw new Error(`Emitted Worker exited: ${logs}`);
    try {if ((await fetch(base + '/health')).ok) break;} catch {}
    if (Date.now() > deadline) throw new Error(`Emitted Worker startup timed out: ${logs}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const bootstrap = await fetch(base + '/api/_local/bootstrap', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-Mango-Local-Bootstrap-Token': token}, body: JSON.stringify({testSession: true})});
  assert.equal(bootstrap.status, 200);
  const {session} = await bootstrap.json();
  const headers = {Cookie: `mango_session=${session.token}`, 'Sec-Fetch-Mode': 'navigate'};
  originalName = session.operator.displayName;
  const front = await probe('/', {'Sec-Fetch-Mode': 'navigate'});
  assert(front.body.includes('Your store') && front.body.includes('Sign in'));
  const initial = await probe('/app', headers);
  assert(initial.body.includes(originalName));
  const changed = `Mango SSR binding proof ${Date.now()}`;
  sql(`UPDATE operators SET display_name = '${changed}' WHERE id = 'operator_sample'`);
  const updated = await probe('/app', headers);
  assert(updated.body.includes(changed));
  sql(`UPDATE operators SET display_name = '${originalName.replaceAll("'", "''")}' WHERE id = 'operator_sample'`);
  originalName = undefined;
  const anonymous = await probe('/app/audience', {'Sec-Fetch-Mode': 'navigate'}, 303);
  assert.equal(anonymous.response.headers.get('location'), '/signin?reason=session-required');
  await probe('/api/unknown-private-route', {}, 401);
  await probe('/api/unknown-private-route', headers, 404);
  for (const path of ['/unknown-public-document', '/assets/missing-proof.js', '/src/core/app/loaders.ts']) await probe(path, {'Sec-Fetch-Mode': 'navigate'}, 404);
  await probe('/app/unknown-private-document', headers, 404);
  // Wrangler's local proxy rewrites Host; hostile-host coverage belongs to the Vite request-boundary test.
  const asset = front.body.match(/(?:src|href)="(\/assets\/[^"?]+\.js)/)?.[1];
  assert(asset, 'Built HTML must identify a real emitted JS asset');
  const assetResponse = await probe(asset);
  assert(/javascript/.test(assetResponse.response.headers.get('content-type') ?? ''));
  await writeFile(`${evidence}/emitted-worker.json`, JSON.stringify({mode: 'local emitted Worker, no deployment or real providers', changedD1SSR: true, originalIdentityRestored: true, hostProbeLimitation: 'Wrangler local proxy rewrites Host; see rendering.spec.ts boundary coverage', rows}, null, 2));
  console.log(JSON.stringify({changedD1SSR: true, probes: rows.length, evidence: `${evidence}/emitted-worker.json`}));
} finally {
  if (originalName !== undefined) sql(`UPDATE operators SET display_name = '${originalName.replaceAll("'", "''")}' WHERE id = 'operator_sample'`);
  try { process.kill(-server.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  await writeFile(`${evidence}/emitted-worker.log`, logs);
}

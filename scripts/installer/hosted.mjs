import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { ownerWorkerName } from '@runeditrun/rer/modules/deploy-kit/owner';

/** Claim through Base's native bootstrap, using only the successful deploy's recorded origin. */
export async function claimOwner({ root = process.cwd(), environment = 'production', env = process.env, fetch = globalThis.fetch } = {}) {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(environment)) throw new Error('invalid-environment');
  if (!env.SETUP_TOKEN?.trim()) throw new Error('SETUP_TOKEN-required');
  const declaration = JSON.parse(await readFile(join(root, 'deploy.json'), 'utf8'));
  const state = JSON.parse(await readFile(join(root, '.rer', 'deploy', `${environment}.json`), 'utf8'));
  const worker = ownerWorkerName(declaration.project, environment);
  let origin;
  try { origin = new URL(state.receipt?.origin); } catch { throw new Error('successful-deploy-receipt-required'); }
  if (state.project !== declaration.project || state.environment !== environment || state.worker !== worker
    || origin.protocol !== 'https:' || origin.origin !== state.receipt.origin || origin.username || origin.password
    || !origin.hostname.startsWith(`${worker}.`) || !origin.hostname.endsWith('.workers.dev')) throw new Error('deploy-receipt-target-mismatch');
  const response = await fetch(new URL('/auth/bootstrap', origin), {
    method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json', Origin: origin.origin },
    body: JSON.stringify({ token: env.SETUP_TOKEN, displayName: 'Owner', returnTo: '/setup' }),
  });
  if (response.status === 303 && response.headers.has('set-cookie')) {
    await response.body?.cancel();
    return 'Owner claimed. Open the deployed site and sign in by email, then finish sender setup.';
  }
  let code;
  try { code = (await response.json()).error; } catch { /* Never echo the response or private capability. */ }
  if (response.status === 409 && code === 'already_initialized') return 'Owner already claimed and kept. Sign in by email.';
  throw new Error('owner-claim-refused');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { positionals, values } = parseArgs({ allowPositionals: true, options: { environment: { type: 'string', default: 'production' } } });
    if (positionals.length !== 1 || positionals[0] !== 'claim') throw new Error('usage: pnpm run hosted claim --environment production');
    console.log(await claimOwner({ environment: values.environment }));
  } catch (error) {
    console.error(/^(?:[A-Za-z][A-Za-z0-9-]*|usage: pnpm run hosted claim --environment production)$/.test(error.message) ? error.message : 'hosted-claim-failed');
    process.exitCode = 1;
  }
}

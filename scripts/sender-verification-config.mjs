import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deploymentNames } from './deployment/target.mjs';

export class SenderVerificationInputError extends Error {}
const invalid = message => { throw new SenderVerificationInputError(message); };

/** Use the same declared variables as deploy, and only the selected deployment's recorded target. */
export async function senderVerificationBindings({ env = process.env, root = process.cwd() } = {}) {
  for (const name of ['MANGO_DEPLOY_ENV', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN']) {
    if (typeof env[name] !== 'string' || !env[name].trim()) invalid(`${name} is required.`);
  }
  const environment = env.MANGO_DEPLOY_ENV;
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(environment)) invalid('MANGO_DEPLOY_ENV is invalid.');
  let declaration, state;
  try { declaration = JSON.parse(await readFile(resolve(root, 'deploy.json'), 'utf8')); }
  catch { invalid('deploy.json is missing or invalid.'); }
  if (declaration?.project !== 'just-every/mango' || declaration.originVar !== 'MANGO_PUBLIC_BASE_URL'
    || !declaration.vars || typeof declaration.vars !== 'object' || Array.isArray(declaration.vars)
    || Object.values(declaration.vars).some(value => typeof value !== 'string')) invalid('deploy.json configuration is invalid.');
  try { state = JSON.parse(await readFile(resolve(root, '.rer', 'deploy', `${environment}.json`), 'utf8')); }
  catch { invalid('Restore the matching successful deployment receipt before sender verification.'); }
  const { workerName, databaseName } = deploymentNames(environment);
  const database = state?.owned?.d1?.[databaseName];
  let origin;
  try { origin = new URL(state?.receipt?.origin); }
  catch { invalid('A successful deployment receipt with a canonical origin is required.'); }
  if (state.project !== declaration.project || state.environment !== environment || state.worker !== workerName
    || database?.status !== 'created' || typeof database.id !== 'string' || !database.id.trim()
    || origin.protocol !== 'https:' || origin.port || origin.origin !== state.receipt.origin || origin.username || origin.password
    || origin.hostname.split('.').length !== 4 || !origin.hostname.startsWith(`${workerName}.`) || !origin.hostname.endsWith('.workers.dev')) {
    invalid('Deployment receipt target mismatch. Restore the matching owner-account state file.');
  }
  if (env.MANGO_PUBLIC_BASE_URL?.trim() && env.MANGO_PUBLIC_BASE_URL !== origin.origin) {
    invalid('MANGO_PUBLIC_BASE_URL conflicts with the selected deployment receipt.');
  }
  // Shell product defaults cannot silently diverge from the Worker deployment declaration.
  return { bindings: { ...env, ...declaration.vars, [declaration.originVar]: origin.origin }, databaseId: database.id };
}

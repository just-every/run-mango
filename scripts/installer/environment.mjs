import { localBindings } from '../../src/core/platform/local-bindings.ts';
import { parseEnv } from 'node:util';

// Adapted from Base's local setup reference for Mango's binding names.
export function localVariables(text) {
  return parseEnv(text.replace(/(^[\t ]*(?:export[\t ]+)?[A-Za-z_]\w*[\t ]*=)[\t ]+(?=\r?$)/gm, '$1'));
}

export function buildEnvironment(environment = process.env) {
  const env = { ...environment, CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false', CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false', WRANGLER_SEND_METRICS: 'false' };
  for (const key of Object.keys(env)) if (/^(SESSION_|CONTACT_|MANGO_LOCAL_HASH_AUTHORITY$|SETUP_TOKEN|OWNER_EMAIL|INITIAL_OPERATOR|AUTH_|MAIL_|MARKETING_MAIL_|OIDC_)/.test(key)) delete env[key];
  return env;
}

export function localAddress(vars) {
  vars = localBindings(vars);
  let url;
  try { url = new URL(vars.MANGO_PUBLIC_BASE_URL); } catch { /* Fixed diagnostic avoids echoing an input value. */ }
  if (!url || !['127.0.0.1','localhost','[::1]'].includes(url.hostname) || url.protocol !== 'http:' || url.origin !== vars.MANGO_PUBLIC_BASE_URL || url.username || url.password) {
    throw new Error('Run pnpm run auth:rotate -- --force to configure a loopback origin.');
  }
  return url;
}

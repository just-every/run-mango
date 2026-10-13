import assert from 'node:assert/strict';
import { contract } from '../tests/contract.js';
import { localVariables, buildEnvironment } from '../scripts/installer/environment.mjs';

const valid = {
  INITIAL_OPERATOR_EMAILS: 'owner@example.test', SESSION_SIGNING_KEY: 'local-session-test',
  AUTH_SETUP_TOKEN: 'local-setup-test', CONTACT_HASH_SALT: 'local-contact-test',
  MANGO_PUBLIC_BASE_URL: 'http://127.0.0.1:15660',
};
contract('OPER-001', 'local development parses quoted dotenv values without consuming an empty binding', () => {
  const vars = localVariables('INITIAL_OPERATOR_EMAILS="owner@example.test"\r\nSESSION_SIGNING_KEY=   \r\nAUTH_SETUP_TOKEN="local-setup-test"\r\nCONTACT_HASH_SALT=local-contact-test\r\nMANGO_PUBLIC_BASE_URL="http://127.0.0.1:15660"\r\n');
  assert.equal(vars.INITIAL_OPERATOR_EMAILS, valid.INITIAL_OPERATOR_EMAILS);
  assert.equal(vars.SESSION_SIGNING_KEY, '');
  assert.equal(vars.AUTH_SETUP_TOKEN, valid.AUTH_SETUP_TOKEN);
});
contract('OPER-001', 'local setup removes inherited auth and mail bindings before invoking local commands', () => {
  const input = { PATH: '/test-bin', MANGO_LOCAL_HASH_AUTHORITY: 'inherited-test-version', SESSION_SIGNING_KEY: 'session', CONTACT_HASH_SALT: 'salt', AUTH_SETUP_TOKEN: 'token', INITIAL_OPERATOR_EMAILS: 'owner', MAIL_PROVIDER_API_KEY: 'mail', OWNER_EMAIL: 'owner', SETUP_TOKEN: 'token', OIDC_CLIENT_SECRET: 'oidc', CLOUDFLARE_INCLUDE_PROCESS_ENV: 'true' };
  const env = buildEnvironment(input);
  for (const name of Object.keys(input).filter(name => name !== 'PATH' && name !== 'CLOUDFLARE_INCLUDE_PROCESS_ENV')) assert.equal(env[name], undefined);
  assert.equal(env.PATH, input.PATH);
  assert.equal(env.CLOUDFLARE_INCLUDE_PROCESS_ENV, 'false');
  assert.equal(env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV, 'false');
  assert.equal(env.WRANGLER_SEND_METRICS, 'false');
  assert.equal(input.AUTH_SETUP_TOKEN, 'token');
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFile, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveDeclaration } from '../scripts/installer/deploy-declaration.mjs';
import { productionMail } from '../node_modules/@runeditrun/rer/cli/production-mail.mjs';
import { ownerPlan } from '@runeditrun/rer/modules/deploy-kit/owner';
// Exercise the pinned kit's actual upload boundary; no account is contacted.
import { secretBindings, uploadWorker } from '../node_modules/@runeditrun/rer/modules/deploy-kit/worker.mjs';

const design = { DESIGN_PROVIDER_API_KEY: 'test-design-key', DESIGN_PROVIDER_ORIGIN: 'https://12ui.com' };
const receiver = { MAILBOX_RECEIPT_URL: 'https://receiver.example.test/receipts?token=synthetic-test-capability', MAILBOX_RECEIPT_RECIPIENT: 'receiver@example.test', MANGO_TEST_EMAIL_ALLOWLIST: 'receiver@example.test,qa@example.test' };
const challenge = { TURNSTILE_SITE_KEY: 'test-turnstile-site', TURNSTILE_SECRET_KEY: 'test-turnstile-secret' };
const optionalInputs = { ...design, ...receiver, ...challenge };
const directMail = { MAIL_FROM: 'synthetic-mango-150@synthetic-mango-150.com', MAIL_API_KEY: 'synthetic-mango-150' };

test('optional design, receiver and signup challenge inputs reach deploy, partial pairs fail, and later deploys preserve configured secrets', async () => {
  const declaration=JSON.parse(await readFile('deploy.json','utf8'));
  const deferred={...declaration,vars:{...declaration.vars,MAIL_PROVIDER:'later'}};
  const mail=await productionMail(process.cwd(),deferred,directMail);
  assert.equal(mail.configured(),true,'Deferred direct-provider mail is configured by declared canonical inputs without a Managed relay.');
  const placeholder=await productionMail(process.cwd(),deferred,{...directMail,MAIL_FROM:'synthetic-mango-150@example.test'});
  assert.equal(placeholder.configured(),false,'Placeholder senders are refused before any upload.');
  const root = await mkdtemp(join(tmpdir(), 'mango-declaration-'));
  try {
    await copyFile('deploy.json', join(root, 'deploy.json'));
    const plan = async (purpose, env) => {
      const declaration = JSON.parse(await readFile(join(root, resolveDeclaration(root, purpose, env)), 'utf8'));
      return ownerPlan({ project: declaration.project, environment: 'production', worker: 'mango-production', origin: 'https://mango-production.example.workers.dev' }, declaration, { migrations: [] });
    };
    const held = new Map();
    const provider = { async request(path, options) {
      if (path.endsWith('/secrets')) return [...held.keys()].map(name => ({ name, type: 'secret_text' }));
      assert.equal(options.method, 'PUT');
      const metadata = JSON.parse(await options.body.get('metadata').text());
      const previous = new Map(held); held.clear();
      if (metadata.keep_bindings?.includes('secret_text')) for (const [name, value] of previous) held.set(name, value);
      for (const binding of metadata.bindings) {
        if (binding.type === 'secret_text') held.set(binding.name, binding.text);
        if (binding.type === 'inherit') { assert.ok(previous.has(binding.name)); held.set(binding.name, previous.get(binding.name)); }
      }
      return {};
    } };
    const deploy = async env => {
      const selected = await plan('deploy', env);
      const secrets = await secretBindings(provider, selected.worker, selected, env, held.size > 0);
      await uploadWorker(provider, { plan: selected, artifact: { main: 'worker.mjs', modules: [], assets: [] }, bindings: [], secrets, fingerprint: 'test-upload' });
    };
    const off = await plan('deploy', {});
    const required = Object.fromEntries(off.secrets.map(item => [item.environment, `value of ${item.environment}`]));
    await deploy(required);
    for (const name of Object.keys(optionalInputs)) assert.ok(!held.has(name));
    const original = new Map(held);
    for (const env of [{ MAILBOX_RECEIPT_URL: receiver.MAILBOX_RECEIPT_URL }, { MAILBOX_RECEIPT_RECIPIENT: receiver.MAILBOX_RECEIPT_RECIPIENT }, { DESIGN_PROVIDER_API_KEY: design.DESIGN_PROVIDER_API_KEY }, { TURNSTILE_SITE_KEY: challenge.TURNSTILE_SITE_KEY }, { TURNSTILE_SECRET_KEY: challenge.TURNSTILE_SECRET_KEY }]) {
      await assert.rejects(plan('deploy', env), /Configure both/);
      assert.deepEqual(held, original);
    }
    await deploy(optionalInputs);
    for (const [name, value] of Object.entries(optionalInputs)) assert.equal(held.get(name), value);
    const configured = new Map(held);
    // Repeated resolution of the same optional bindings must not invalidate
    // the build cache by changing the generated declaration's modification time.
    const declarationPath = join(root, '.rer/declarations/deploy.json');
    const previous = await readFile(declarationPath);
    const modified = (await stat(declarationPath, { bigint: true })).mtimeNs;
    await deploy(optionalInputs);
    assert.deepEqual(await readFile(declarationPath), previous);
    assert.equal((await stat(declarationPath, { bigint: true })).mtimeNs, modified);
    await deploy({});
    assert.deepEqual(held, configured);
    const verify = await plan('verify', optionalInputs);
    assert.deepEqual(verify.secrets, off.secrets);
    const resolved = await readFile(join(root, '.rer/declarations/deploy.json'), 'utf8');
    for (const value of Object.values(optionalInputs)) assert.ok(!resolved.includes(value));
    held.clear();
    await deploy({...required,...directMail});
    assert.equal(held.get('MAIL_FROM'),directMail.MAIL_FROM);
    assert.equal(held.get('MAIL_API_KEY'),directMail.MAIL_API_KEY);
    assert.ok(!held.has('MAIL_AUTH_FROM'));
    assert.ok(!held.has('MAIL_PROVIDER_API_KEY'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

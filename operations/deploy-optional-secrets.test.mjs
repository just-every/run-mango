import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveDeclaration } from '../scripts/installer/deploy-declaration.mjs';
import { ownerPlan } from '@runeditrun/rer/modules/deploy-kit/owner';
// Exercise the pinned kit's actual upload boundary; no account is contacted.
import { secretBindings, uploadWorker } from '../node_modules/@runeditrun/rer/modules/deploy-kit/worker.mjs';

const design = { DESIGN_PROVIDER_API_KEY: 'test-design-key', DESIGN_PROVIDER_ORIGIN: 'https://12ui.com' };
const receiver = { MAILBOX_RECEIPT_URL: 'https://receiver.example.test/receipts?token=synthetic-test-capability', MAILBOX_RECEIPT_RECIPIENT: 'receiver@example.test', MANGO_TEST_EMAIL_ALLOWLIST: 'receiver@example.test,qa@example.test' };

test('optional design and receiver inputs reach the deploy upload, partial pairs fail, and later deploys preserve configured secrets', async () => {
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
    for (const name of [...Object.keys(design), ...Object.keys(receiver)]) assert.ok(!held.has(name));
    const original = new Map(held);
    for (const env of [{ MAILBOX_RECEIPT_URL: receiver.MAILBOX_RECEIPT_URL }, { MAILBOX_RECEIPT_RECIPIENT: receiver.MAILBOX_RECEIPT_RECIPIENT }, { DESIGN_PROVIDER_API_KEY: design.DESIGN_PROVIDER_API_KEY }]) {
      await assert.rejects(plan('deploy', env), /Configure both/);
      assert.deepEqual(held, original);
    }
    await deploy({ ...design, ...receiver });
    for (const [name, value] of Object.entries({ ...design, ...receiver })) assert.equal(held.get(name), value);
    const configured = new Map(held);
    await deploy({});
    assert.deepEqual(held, configured);
    const verify = await plan('verify', { ...design, ...receiver });
    assert.deepEqual(verify.secrets, off.secrets);
    const resolved = await readFile(join(root, '.rer/declarations/deploy.json'), 'utf8');
    for (const value of Object.values({ ...design, ...receiver })) assert.ok(!resolved.includes(value));
  } finally { await rm(root, { recursive: true, force: true }); }
});

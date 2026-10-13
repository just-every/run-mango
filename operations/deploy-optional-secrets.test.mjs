import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveDeclaration } from '../scripts/installer/deploy-declaration.mjs';
import { ownerPlan } from '@runeditrun/rer/modules/deploy-kit/owner';
// The package exports no subpath for the kit's secret step; read it from the pinned package itself.
import { secretBindings } from '../node_modules/@runeditrun/rer/modules/deploy-kit/worker.mjs';

// The deploy kit's own planning and secret steps against a stand-in for the provider's secret list; no account is contacted.
const provider = names => ({ async request(path) { assert.match(path, /^\/workers\/scripts\/[a-z-]+\/secrets$/); return names.map(name => ({ name, type: 'secret_text' })); } });
const design = ['DESIGN_PROVIDER_API_KEY', 'DESIGN_PROVIDER_ORIGIN'];

test('DESIGN-001: deploy.json lets a hosted deployment upload the design inputs as secrets only when the owner sets them', async () => {
  const root = await mkdtemp(join(tmpdir(), 'mango-declaration-'));
  try {
    await copyFile('deploy.json', join(root, 'deploy.json'));
    assert.deepEqual(JSON.parse(await readFile('deploy.json', 'utf8')).secrets.filter(item => item.optional).map(item => item.binding).sort(), design);
    const plan = async (purpose, env) => {
      const declaration = JSON.parse(await readFile(join(root, resolveDeclaration(root, purpose, env)), 'utf8'));
      return ownerPlan({ project: declaration.project, environment: 'production', worker: 'mango-production', origin: 'https://mango-production.example.workers.dev' }, declaration, { migrations: [] });
    };
    const names = secrets => secrets.map(item => item.binding).sort();

    // Without the design inputs the kit is asked for the required secrets only, so a first deploy needs nothing more.
    const off = await plan('deploy', {});
    assert.ok(!names(off.secrets).some(name => design.includes(name)));
    const inputs = Object.fromEntries(off.secrets.map(item => [item.environment, `value of ${item.environment}`]));
    const first = await secretBindings(provider([]), off.worker, off, inputs, false);
    assert.deepEqual(first.bindings.map(binding => binding.name).sort(), names(off.secrets));
    // The hosted check of rer verify serves the build without them, whatever is set.
    assert.deepEqual(names((await plan('verify', { DESIGN_PROVIDER_API_KEY: 'test-design-key', DESIGN_PROVIDER_ORIGIN: 'https://12ui.com' })).secrets), names(off.secrets));

    // With both set, a later deploy uploads them beside the secrets already there, which stay as they are.
    const on = await plan('deploy', { DESIGN_PROVIDER_API_KEY: 'test-design-key', DESIGN_PROVIDER_ORIGIN: 'https://12ui.com' });
    assert.deepEqual(names(on.secrets), [...names(off.secrets), ...design].sort());
    const later = await secretBindings(provider(names(off.secrets)), on.worker, on, { DESIGN_PROVIDER_API_KEY: 'test-design-key', DESIGN_PROVIDER_ORIGIN: 'https://12ui.com' }, true);
    assert.deepEqual(later.missing.sort(), design);
    assert.deepEqual(later.bindings.filter(binding => binding.type === 'secret_text').map(binding => binding.name).sort(), design);
    assert.ok(later.bindings.filter(binding => binding.type !== 'secret_text').every(binding => binding.type === 'inherit'));
    // The resolved declaration holds names only, never a value.
    assert.doesNotMatch(await readFile(join(root, '.rer/declarations/deploy.json'), 'utf8'), /test-design-key/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

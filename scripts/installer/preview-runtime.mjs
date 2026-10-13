import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { realpath } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readSettings } from '../base-onboarding/adapter-settings.mjs';
import { productionModules } from '../base-onboarding/production-modules.mjs';

// Build the local worker once into `.seed/preview`, then serve it from one Miniflare over `.wrangler/state`,
// as Base's production runtime serves `dist/server`. No bundler or file watcher runs while it serves.
const root = process.cwd(), output = '.seed/preview';
const run = (command, args, env) => new Promise((done, fail) => {
  const child = spawn(command, args, { cwd: root, env: { ...process.env, ...env }, stdio: ['ignore', 'inherit', 'inherit'] });
  child.on('error', fail);
  child.on('close', code => code === 0 ? done() : fail(new Error(`${args.join(' ')} failed (exit ${code}).`)));
});
await run(process.execPath, ['scripts/generate-local-wrangler-config.mjs']);
await run('pnpm', ['exec', 'vite', 'build'], { MANGO_PREVIEW_OUT: output });

const require = createRequire(await realpath(resolve(root, 'node_modules/wrangler/package.json')));
const { unstable_getMiniflareWorkerOptions, unstable_readConfig } = require('wrangler');
const miniflare = require('miniflare'), { Miniflare, convertV4MiniflareOptions } = miniflare;
const selected = unstable_getMiniflareWorkerOptions(unstable_readConfig({ config: resolve(root, output, 'server/wrangler.json') }));
const { modulesRules, ...workerOptions } = selected.workerOptions;
const vars = (await readSettings(root, { file: '.dev.vars' })).values;
const origin = process.env.RER_DEV_ORIGIN;
const worker = { ...workerOptions, name: 'mango-local', ...await productionModules(selected.main, modulesRules, miniflare),
  bindings: { ...workerOptions.bindings, ...vars, AUTH_ORIGIN: origin, RER_DEV_ORIGIN: origin, RER_DEV_KEY: process.env.RER_DEV_KEY } };
const runtime = new Miniflare({ ...convertV4MiniflareOptions({ host: process.env.RER_RUNTIME_HOST, port: Number(process.env.RER_RUNTIME_PORT), unsafeTriggerHandlers: false, unsafeLocalExplorer: false, workers: [worker, ...selected.externalWorkers] }),
  resourcePersistencePath: resolve(root, '.wrangler/state/v3') });
let stopping;
const stop = () => stopping ??= runtime.dispose();
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
try { await runtime.ready; } catch (error) { await stop(); throw error; }

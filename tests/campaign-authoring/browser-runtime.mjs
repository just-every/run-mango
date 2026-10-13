import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { once } from 'node:events';
import { basename, join } from 'node:path';
import { freePort } from '../support/free-port.mjs';
import { scratchDirectory } from '../support/artifacts.mjs';
import { createCommands } from '@runeditrun/rer/commands';

export async function authoringRuntime({
  suite = 'campaign-authoring',
  fixtureWorker = 'tests/campaign-authoring/worker.ts',
  startupTimeout = 45000,
  vars = {},
  token = crypto.randomUUID(),
  stateDirectory,
} = {}) {
  const scratch = scratchDirectory(suite);
  await mkdir(scratch, { recursive: true });
  const directory = await mkdtemp(join(scratch, 'runtime-'));
  const port = await freePort(), url = `http://127.0.0.1:${port}`;
  // A caller-owned state directory outlives this runtime, so a restart keeps its D1 and R2.
  const config = join(directory, 'wrangler.toml'), state = stateDirectory ?? join(directory, 'state');
  const env = { ...process.env, CI: '1', TMPDIR: directory, MANGO_AUTHORING_TEST_CONFIG: config,
    MANGO_AUTHORING_TEST_STATE: state, CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false', CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false' };
  let logs = '', commands, closing;
  const options = { cwd: process.cwd(), env };
  const close = () => closing ??= (async () => {
    try {
      await commands?.closeCommands();
    } finally {
      try { await writeFile(join(scratch, `${basename(directory)}.log`), logs, { mode: 0o600 }); }
      finally { await rm(directory, { recursive: true, force: true }); }
    }
  })();
  try {
    const template = (await readFile('deploy/wrangler.local.template.toml', 'utf8'))
      .replace('./src/core/app/worker.local.ts', join(process.cwd(), fixtureWorker))
      .replace('migrations_dir = "migrations/core"', `migrations_dir = ${JSON.stringify(join(process.cwd(), 'migrations/core'))}`);
    const extra = Object.entries(vars).map(([name, value]) => `${name} = ${JSON.stringify(value)}\n`).join('');
    await writeFile(config, `${template}\n[vars]\nLOCAL_BOOTSTRAP_TOKEN = ${JSON.stringify(token)}\n${extra}`, { mode: 0o600 });
    commands = await createCommands(directory, { logs: [] }, { terminal: text => { logs += text; } });
    commands.addSecrets([token]);
    await commands.run('Migrating authoring fixture', 'pnpm', ['exec', 'wrangler', 'd1', 'migrations', 'apply', 'mango-local', '--local', '--config', config, '--persist-to', state], options);
    const dev = commands.spawn('Starting authoring fixture', 'pnpm', ['exec', 'vite', 'dev', '--port', String(port), '--strictPort'], options);
    const sql = async command => {
      if (closing) throw new Error('Authoring fixture SQL failed: runtime is closing.');
      try {
        // Keep the event loop serving HTTP socket events while Wrangler reads D1.
        const child = commands.spawn('Executing authoring fixture SQL', 'pnpm', ['exec', 'wrangler', 'd1', 'execute', 'mango-local', '--command', command,
          '--json', '--local', '--config', config, '--persist-to', state], options);
        let output = '';
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', chunk => { output += chunk; });
        let result;
        try { result = await once(child, 'exit'); }
        // Retire descendants at exit: inherited pipes can delay close forever.
        finally { await commands.stop(child); }
        const [code, signal] = result;
        if (code !== 0 || signal) throw new Error('SQL command failed.');
        return JSON.parse(output)[0].results;
      } catch { throw new Error('Authoring fixture SQL failed.'); }
    };
    await commands.waitForReady('Starting authoring fixture', dev, async signal =>
      (await fetch(`${url}/health`, { headers: { Connection: 'close' }, signal })).status === 200,
      { timeoutMs: startupTimeout, intervalMs: 100 });
    return { url, token, sql, close, logs: () => logs, directory, state };
  } catch (error) { await close(); throw error; }
}

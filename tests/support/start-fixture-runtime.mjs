import { scratchDirectory } from './artifacts.mjs';
import { mkdir, mkdtemp, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ensureLocalBootstrapToken } from '../../tests/support/bootstrap-token.mjs';
import { testTemplate } from './queue-consumers.mjs';
import { runCommand } from '../../scripts/installer/run-command.mjs';
const root = process.cwd();
const scratch = scratchDirectory('fixture-runtimes');
await mkdir(scratch, { recursive: true });
const directory = await mkdtemp(join(scratch, 'run-'));
const config = join(directory, 'wrangler.toml'), state = join(directory, 'state');
const token = await ensureLocalBootstrapToken();
const template = testTemplate(await readFile('deploy/wrangler.local.template.toml', 'utf8'))
  .replace('./src/core/app/worker.local.ts', resolve('tests/support/worker.ts'))
  .replace('migrations_dir = "migrations/core"', `migrations_dir = ${JSON.stringify(resolve('migrations/core'))}`);
const authoringDatabase = `
[[d1_databases]]
binding = "AUTHORING_DB"
database_name = "mango-authoring-fixture"
database_id = "00000000-0000-0000-0000-000000000001"
migrations_dir = ${JSON.stringify(resolve('migrations/core'))}
`;
await writeFile(config, `${template}\n${authoringDatabase}\n[vars]\nLOCAL_BOOTSTRAP_TOKEN = ${JSON.stringify(token)}\nMANGO_FIXTURE_TURNSTILE = ${JSON.stringify(process.env.MANGO_FIXTURE_TURNSTILE ?? "0")}\nMANGO_FIXTURE_SIGNUP_MAIL = ${JSON.stringify(process.env.MANGO_FIXTURE_SIGNUP_MAIL ?? "0")}\n`, {mode:0o600});
const env = { ...process.env, CI: '1', MANGO_AUTHORING_TEST_CONFIG: config, MANGO_AUTHORING_TEST_STATE: state, CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV:'false', CLOUDFLARE_INCLUDE_PROCESS_ENV:'false' };
const cancellation = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => cancellation.abort(Object.assign(new Error(`Cancelled by ${signal}.`), { signal })));
try {
  // This runtime always starts from an empty database. Apply every unchanged
  // migration in order in one Wrangler process per binding.
  const migrationFile = join(directory, 'migrations.sql');
  const migrations = (await readdir('migrations/core')).filter(name => name.endsWith('.sql')).sort();
  await writeFile(migrationFile, (await Promise.all(migrations.map(name => readFile(join('migrations/core', name), 'utf8')))).join('\n'));
  for (const name of ['mango-local', 'mango-authoring-fixture']) {
    await runCommand('pnpm', ['exec', 'wrangler', 'd1', 'execute', name, '--file', migrationFile, '--local', '--config', config, '--persist-to', state], {cwd:root,env,secrets:[token],signal:cancellation.signal,write:text=>process.stdout.write(text)});
  }
  await runCommand('pnpm', ['exec', 'vite', 'dev', '--port', process.env.MANGO_FIXTURE_PORT, '--strictPort'], {cwd:root,env,secrets:[token],signal:cancellation.signal,write:text=>process.stdout.write(text)});
} catch(error) {
  if(error!==cancellation.signal.reason) throw error;
} finally { await rm(directory,{recursive:true,force:true}); }

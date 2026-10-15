import {finishSetup} from './finish-setup.mjs';
import {localBindings} from '../../src/core/platform/local-bindings.ts';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { scratchDirectory } from '../support/artifacts.mjs';
import { freePort } from '../support/free-port.mjs';
import { runCommand } from '../../scripts/installer/run-command.mjs';
import { localVariables } from '../../scripts/installer/environment.mjs';
import { startNativeDev } from './native-dev.mjs';
import { enterOwner, rememberKey } from './dev-gate.mjs';

// Real copied Mango entrypoints and persistent D1. Dependencies are reused from
// this verified source tree; the separate fresh-start journey installs its own.
export async function authorityRuntime() {
  const scratch = scratchDirectory('local-contact-authority');
  await mkdir(scratch, { recursive: true });
  const directory = await mkdtemp(join(scratch, 'native-'));
  const checkout = join(directory, 'mango');
  await mkdir(checkout);
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  for (const file of files) {
    if (file === 'node_modules' || file.startsWith('node_modules/')) continue;
    await cp(resolve(file), join(checkout, file), { recursive: true });
  }
  await symlink(resolve('node_modules'), join(checkout, 'node_modules'));
  const port = await freePort(), url = `http://127.0.0.1:${port}`;
  const env = { ...process.env, CI: '1', RER_SERVER_JOURNEY: '1', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false' };
  for (const key of Object.keys(env)) if (key !== 'MANGO_TEST_WORK_DIR' && /^(MANGO_|PLAYWRIGHT_PORT|MAIL_|AUTH_|INITIAL_OPERATOR|SESSION_|CONTACT_)/.test(key)) delete env[key];
  delete env.RER_LOCAL_OPERATION;
  let output = '', dev, secrets = [];
  const command = ([verb, ...args]) => runCommand(process.execPath, verb === 'auth:rotate' ? ['scripts/installer/rotate.mjs', ...args] : ['node_modules/@runeditrun/rer/bin/rer.mjs', verb, ...args], { cwd: checkout, env, secrets, write: text => { output += text; } });
  const variables = async () => {
    const values = localBindings(localVariables(await readFile(join(checkout, '.dev.vars'), 'utf8')));
    secrets.push(...['SESSION_SIGNING_KEY', 'AUTH_SETUP_TOKEN', 'CONTACT_HASH_SALT'].map(key => values[key]).filter(Boolean));
    assert.ok(secrets.every(value => !output.includes(value)), 'Local commands never print credentials');
    return values;
  };
  const stop = async () => {
    if (!dev) return;
    await dev.stop(); dev = undefined;
  };
  return {
    checkout, directory, url, variables, command,
    setup: (force, extra = []) => command([force ? 'auth:rotate' : 'setup', '--owner-email', 'owner@example.test', '--port', String(port), ...(force ? ['--force'] : []), ...extra]),
    async start(verb = 'dev') {
      secrets.push(await rememberKey(url, checkout));
      dev = await startNativeDev({ checkout, directory, url, env, secrets, verb, write: text => { output += text; } });
    },
    stop,
    async close() {
      try { await stop(); }
      finally {
        try {
          assert.ok(secrets.every(value => !output.includes(value)), 'Local commands never print credentials');
          await writeFile(join(directory, 'commands.log'), output, { mode: 0o600 });
        } finally { await rm(checkout, { recursive: true, force: true }); }
      }
    },
  };
}

export async function signIn(page, url) {
  await enterOwner(page, url);
  if (new URL(page.url()).pathname === '/setup') await finishSetup(page);
  await page.waitForURL(url + '/app');
}

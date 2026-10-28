import { scratchDirectory } from '../support/artifacts.mjs';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { runCommand } from '../../scripts/installer/run-command.mjs';
import { freePort } from '../support/free-port.mjs';
import { startNativeDev } from './native-dev.mjs';
import { rememberKey } from './dev-gate.mjs';
// The installed rer command at this checkout's pin. On the fresh clone, which has no node_modules yet, it installs the
// pinned rer with the frozen lockfile before its first verb, as a person's rer does.
const rer = resolve('node_modules/@runeditrun/rer/global/rer.mjs');
export async function freshCopy() {
  const scratch = scratchDirectory('local-start'); await mkdir(scratch, {recursive:true});
  const directory = await mkdtemp(join(scratch, 'copy-'));
  const checkout = join(directory, 'mango');
  const env = {...process.env, CI:'true', RER_SERVER_JOURNEY:'1', WRANGLER_SEND_METRICS:'false', CLOUDFLARE_INCLUDE_PROCESS_ENV:'false'};
  for (const key of Object.keys(env)) if (key !== 'MANGO_TEST_WORK_DIR' && /^(MANGO_|PLAYWRIGHT_PORT|MAIL_|AUTH_|INITIAL_OPERATOR|SESSION_|CONTACT_)/.test(key)) delete env[key];
  delete env.RER_LOCAL_OPERATION;
  let log=''; const write=text=>{log+=text;};
  let dev;
  const stop=async()=>{if(!dev)return;await dev.stop();dev=undefined;};
  const close=async()=>{try {await stop();} finally {try {await writeFile(join(directory,'journey.log'),log,{mode:0o600});} finally {await rm(checkout,{recursive:true,force:true});}}};
  try {
    execFileSync('git', ['clone', '--quiet', '--no-local', '--depth', '1', resolve('.'), checkout], { env, stdio: 'pipe' });
    await runCommand(process.execPath,[rer,'check','--profile','first-party'],{cwd:checkout,env,write});
    await runCommand(process.execPath,[rer,'install'],{cwd:checkout,env,write});
    const port=await freePort(), url=`http://127.0.0.1:${port}`;
    await runCommand(process.execPath,[rer,'setup','--owner-email','owner@example.test','--port',String(port)],{cwd:checkout,env,write});
    const previous=await readFile(join(checkout,'.dev.vars'),'utf8');
    await runCommand(process.execPath,[rer,'setup','--owner-email','owner@example.test'],{cwd:checkout,env,write});
    if( await readFile(join(checkout,'.dev.vars'),'utf8')!==previous) throw new Error('Setup did not preserve existing local credentials.');
    const vars=await readFile(join(checkout,'.dev.vars'),'utf8');
    const secrets=(vars+'\n'+previous).split('\n').filter(line=>/SECRET=|KEY=|TOKEN=|SALT=/.test(line)).map(line=>line.slice(line.indexOf('=')+1));
    if(secrets.some(secret=>secret && log.includes(secret))) throw new Error('Setup printed a generated secret.');
    secrets.push(await rememberKey(url,checkout));
    dev=await startNativeDev({checkout,directory,url,env,secrets,write});
    return {directory,checkout,url,stop,close,command:([verb,...args])=>runCommand(process.execPath,[rer,verb,...args],{cwd:checkout,env,secrets,write})};
  } catch(error) {await close();throw error;}
}

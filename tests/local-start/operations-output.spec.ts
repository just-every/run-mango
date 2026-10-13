import { expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, cp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { scratchDirectory } from '../support/artifacts.mjs';
import { contract } from '../contract';

contract('OPER-001','rer doctor diagnoses missing inputs and configured private values without exposing them',async()=>{
  const scratch=scratchDirectory('doctor');await mkdir(scratch,{recursive:true});
  const directory=await mkdtemp(join(scratch,'doctor-'));
  try {
    // Isolate private settings; no application, setup or provider is started.
    for(const path of ['OPERATIONS.json','OPERATIONS.md','ACCEPTANCE.md','package.json','rer-setup.json','scripts','src']) {
      await cp(resolve(path),join(directory,path),{recursive:true});
    }
    await symlink(resolve('node_modules'),join(directory,'node_modules'));
    const descriptor=JSON.parse(await readFile('OPERATIONS.json','utf8'));
    const shell={PATH:process.env.PATH,HOME:process.env.HOME};
    const run=(env)=>spawnSync(process.execPath,['scripts/rer.mjs','doctor','--json'],{cwd:directory,env,encoding:'utf8'});
    const result=(command)=>JSON.parse(command.stdout.trim().split('\n').at(-1));
    const fresh=run(shell);
    expect(fresh.status).toBe(3);expect(result(fresh).ok).toBe(false);
    expect(result(fresh).diagnostics.missingInputs.length).toBeGreaterThan(0);
    const values=Object.fromEntries(descriptor.requiredEnvironment.map(key=>[key,'private-test-value']));
    Object.assign(values,{MAIL_PROVIDER:'sendgrid',SENDGRID_API_KEY:'private-test-value',SESSION_SECRET:'private-session-test-value-at-least-thirty-two-bytes',SETUP_TOKEN:'private-setup-test-value-at-least-thirty-two-bytes',OWNER_EMAIL:'owner@example.test',MANGO_PUBLIC_BASE_URL:'https://newsletter.example.test',MANGO_ALLOWED_LINK_HOSTS:'example.test',MANGO_TEST_EMAIL_ALLOWLIST:'qa@example.test',MANGO_DEPLOY_ENV:'stage'});
    for(const key of Object.keys(values))if(/_MINUTES$|_HOURS$|_PER_MINUTE$|_DAYS$/.test(key))values[key]='10';
    await writeFile(join(directory,'.dev.vars'),`OWNER_EMAIL=${values.OWNER_EMAIL}\nSESSION_SECRET=${values.SESSION_SECRET}\nCONTACT_HASH_SALT=${values.CONTACT_HASH_SALT}\nAUTH_ORIGIN=http://127.0.0.1:15660\n`,{mode:0o600});
    const complete=run({...shell,...values});
    expect(complete.status).toBe(0);expect(result(complete).ok).toBe(true);
    expect(complete.stdout+complete.stderr).not.toContain('private-test-value');
    expect(complete.stdout+complete.stderr).not.toContain(values.SESSION_SECRET);
  } finally {await rm(directory,{recursive:true,force:true});}
});

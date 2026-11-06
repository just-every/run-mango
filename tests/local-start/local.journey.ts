import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { senderSetupJourney } from './sender-setup.flow';
import { freshCopy } from './fresh-copy.mjs';
let runtime: Awaited<ReturnType<typeof freshCopy>>;
test.beforeAll(async()=>{test.setTimeout(600000);runtime=await freshCopy();});
test.afterAll(async()=>{await runtime?.close();});
test('[OPER-001] fresh install completes sender setup after one-click owner sign-in at 1440', async({browser})=>{
  await senderSetupJourney(browser,runtime);
});
test('[OPER-001] a production build with local credentials present emits no local variable file or secret',async()=>{
  test.setTimeout(600000);
  const vars=await readFile(join(runtime.checkout,'.dev.vars'),'utf8');
  const secrets=vars.split('\n').filter(line=>/SECRET=|KEY=|TOKEN=|SALT=/.test(line)).map(line=>line.slice(line.indexOf('=')+1)).filter(Boolean);
  expect(secrets.length).toBeGreaterThan(0);
  await runtime.stop();
  await runtime.command(['build']);
  const files=(await readdir(join(runtime.checkout,'dist'),{recursive:true,withFileTypes:true})).filter(entry=>entry.isFile());
  expect(files.some(entry=>entry.name.startsWith('.dev.vars'))).toBe(false);
  for(const entry of files){
    const text=await readFile(join(entry.parentPath,entry.name)).then(bytes=>bytes.toString('latin1'));
    for(const secret of secrets) expect(text.includes(secret),`${entry.name} must not contain a local secret`).toBe(false);
  }
  expect(await readFile(join(runtime.checkout,'.dev.vars'),'utf8') === vars).toBe(true);
});

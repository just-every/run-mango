import { evidenceDirectory } from '../support/artifacts.mjs';
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const output = evidenceDirectory('sender-verification');
await mkdir(output, {recursive:true});
const browser = await chromium.launch();
const context = await browser.newContext();
const files=[];
try {
  const token=(await readFile('.seed/local-bootstrap-token','utf8')).trim();
  const result=await context.request.post('http://127.0.0.1:59200/api/_local/bootstrap',{headers:{'X-Mango-Local-Bootstrap-Token':token},data:{testSession:true}});
  if(!result.ok()) throw new Error(`Native bootstrap failed: ${result.status()}`);
  const {session}=await result.json();
  await context.addCookies([{name:'operator_session_local',value:session.token,url:'http://127.0.0.1:59200'}]);
  const page=await context.newPage();
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.goto('http://127.0.0.1:59200/app/settings');
    await page.getByRole('heading',{name:'Sender check unavailable',exact:true}).waitFor();
    if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw new Error('Settings overflow');
    const file=`settings-${width}.jpg`;
    await page.screenshot({path:`${output}/${file}`,type:'jpeg',quality:88,fullPage:true});
    files.push({file,width,sha256:createHash('sha256').update(await readFile(`${output}/${file}`)).digest('hex')});
  }
  await writeFile(`${output}/screenshots.json`,JSON.stringify({commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),source:'Native local Worker Settings; absent production provider and receiver truthfully unavailable. No mocked status or provider call.',files},null,2));
} finally {await context.close();await browser.close();}

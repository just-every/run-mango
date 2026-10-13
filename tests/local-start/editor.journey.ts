import {expect, test} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {contract} from '../contract';
import {authorityRuntime, signIn} from './authority-runtime.mjs';
import {openGate} from './dev-gate.mjs';

contract('MGMT-002','native owner editor mounts at 1440 and 390, refuses visitors and loses its grant on sign-out',async ({browser}) => {
  test.setTimeout(600000);
  const runtime=await authorityRuntime();
  const server=createServer((req,res)=>{
    const url=new URL(req.url!,'http://fixture');
    if(url.pathname!=='/editor'||url.searchParams.get('parentOrigin')!==runtime.url){res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type','text/html');res.setHeader('Content-Security-Policy',`frame-ancestors ${runtime.url}`);
    res.end(`<!doctype html><html><body><main style="position:fixed;right:10px;bottom:80px;width:300px;background:white;padding:12px">Editing Mango<script>
      const origin=${JSON.stringify(runtime.url)},installationId='mango-editor-test';let sessionId;
      const send=(type,data={})=>parent.postMessage({protocol:'rer-editor',version:1,installationId,type,...(sessionId?{sessionId}:{}),...data},origin);
      addEventListener('message',e=>{if(e.origin!==origin||e.source!==parent)return;const d=e.data;
        if(d.type==='protocol-offer'){sessionId=d.sessionId;send('protocol-accept');}
        if(d.type==='protocol-connected'||d.type==='editor-visibility')send('interactive-regions',{viewport:{width:innerWidth,height:innerHeight},regions:[{x:Math.max(0,innerWidth-330),y:Math.max(0,innerHeight-180),width:320,height:100}]});
      });send('ready');
    </script></main></body></html>`);
  });
  const context=await browser.newContext(),page=await context.newPage();
  try {
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const management=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
    await runtime.setup(false);await runtime.variables();
    const file=join(runtime.checkout,'.dev.vars');
    await writeFile(file,await readFile(file,'utf8')+`RER_MANAGEMENT_ORIGIN=${management}\nRER_INSTALLATION_ID=mango-editor-test\n`,{mode:0o600});
    await runtime.start();
    expect((await page.request.get(runtime.url+'/api/editor/config')).status()).toBe(401);
    expect((await (await page.request.get(runtime.url+'/auth/environment')).json()).editorEligible).toBe(false);
    await openGate(context,runtime.url);await page.goto(runtime.url+'/docs');
    await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');await expect(page.locator('[data-rer-editor]')).toHaveCount(0);
    await signIn(page,runtime.url);
    expect((await (await page.request.get(runtime.url+'/auth/environment')).json()).editorEligible).toBe(true);
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:900});
      await page.goto(runtime.url+'/docs');
      const host=page.locator('[data-rer-editor]');await expect(host).toHaveCount(1);
      await page.getByRole('button',{name:'Open Run Edit Run',exact:true}).click();
      await expect(host).toHaveAttribute('data-connection','connected');
      const frame=host.locator('iframe');await expect(frame).toBeVisible();
      await expect.poll(()=>frame.evaluate(node=>node.style.clipPath!=='inset(100%)')).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await test.info().attach(`editor-${width}`,{body:await page.screenshot(),contentType:'image/png'});
      await page.getByRole('button',{name:'Close Run Edit Run',exact:true}).click();
    }
    await page.goto(runtime.url+'/app');
    await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
    if(await page.getByRole('button',{name:/Menu ·/}).isVisible())await page.getByRole('button',{name:/Menu ·/}).click();
    await page.getByRole('button',{name:'Sign out',exact:true}).click();
    await expect(page.locator('[data-rer-editor]')).toHaveCount(0);
    expect((await page.request.get(runtime.url+'/api/editor/config')).status()).toBe(401);
    expect((await (await page.request.get(runtime.url+'/auth/environment')).json()).editorEligible).toBe(false);
  } finally {await context.close();await runtime.close();server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

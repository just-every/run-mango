// @ts-nocheck -- Browser exercises the React component against real native D1 routes.
import { expect, test } from '@playwright/test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { invitationRuntime } from '../../operations/fixtures/invitation-runtime.mjs';
const require = createRequire(import.meta.url);
const {build} = createRequire(require.resolve('vite/package.json'))('esbuild');

test('operator edits and reloads sender settings on a narrow screen', async ({page}) => {
  const f = await invitationRuntime();
  try {
    const owner = await f.bootstrap();
    const output = await build({entryPoints:[resolve('tests/settings-sender/client.tsx')],bundle:true,write:false,outdir:'/unused',format:'iife',platform:'browser',jsx:'automatic',alias:{'@':resolve('src')}});
    const js = output.outputFiles.find(file=>file.path.endsWith('.js')).text;
    const css = output.outputFiles.find(file=>file.path.endsWith('.css')).text;
    await page.route('http://sender-settings.test/**', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.pathname === '/') return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width"><style>:root{--ink-muted:#555;--paper:white}body{font:16px sans-serif}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden}${css}</style><main id="root"></main><script src="/client.js"></script>`});
      if (url.pathname === '/client.js') return route.fulfill({contentType:'text/javascript',body:js});
      const result = await f.call(url.pathname,{method:request.method(),cookie:owner,...(request.postData()?{body:request.postDataJSON()}:{})});
      await route.fulfill({status:result.status,body:await result.text(),contentType:'application/json'});
    });
    await page.setViewportSize({width:360,height:780});
    await page.goto('http://sender-settings.test/');
    await expect(page.getByLabel('Business display name',{exact:true})).toHaveValue('Example');
    await page.getByLabel('Business display name',{exact:true}).fill('Newsletter Business');
    await page.getByLabel('From email',{exact:true}).fill('news@example.test');
    await page.getByLabel('Reply-to email',{exact:true}).fill('reply@example.test');
    await page.getByLabel('Physical postal address',{exact:true}).fill('42 New Road\nBrisbane QLD 4000, Australia');
    await page.getByRole('button',{name:'Save sender details',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Sender details saved'})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Newsletter Business',exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.reload();
    await expect(page.getByLabel('Business display name',{exact:true})).toHaveValue('Newsletter Business');
    await expect(page.getByLabel('Physical postal address',{exact:true})).toHaveValue('42 New Road\nBrisbane QLD 4000, Australia');
    expect((await f.db.prepare('SELECT physical_address FROM sender_settings').first()).physical_address).toBe('42 New Road\nBrisbane QLD 4000, Australia');
  } finally { await f.close(); }
});

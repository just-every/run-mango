import { sqlStatements } from '../../operations/sql-statements.mjs';
import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
test('native Worker production services approve, hand off, and reload protected redacted evidence on real D1 [MSG-003]', async () => {
  const bundle = await build({ external:['node:*'],entryPoints:['tests/sender-verification/worker-entry.ts'], bundle:true,write:false,format:'esm',platform:'browser',alias:{'@':join(process.cwd(),'src')},logLevel:'silent' });
  const runtime = new Miniflare({host:'127.0.0.1',port: 0,cf:false,telemetry:{enabled:false},workers:[{config:{name:'sender-worker-proof',type:'worker',compatibilityDate:'2026-08-31',
    compatibilityFlags:['nodejs_compat'],
    manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:bundle.outputFiles[0].text}}},env:{DB:{type:'d1',id:crypto.randomUUID()}}}}]});
  try {
    const db = await runtime.getD1Database('DB');
    for(const file of (await readdir('migrations/core')).filter(file=>file.endsWith('.sql')).sort()) await db.batch(sqlStatements((await readFile(`migrations/core/${file}`,'utf8'))).map(sql=>db.prepare(sql)));
    const response = await runtime.dispatchFetch('https://mango.example.test/test-proof');
    const proof = await response.json();
    expect(proof, JSON.stringify(proof)).toMatchObject({approval:{kind:'approved'}});
    expect(proof.outbound).toHaveLength(2);
    expect(proof.outbound[1].headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    const contactStatus = () => db.prepare('SELECT channel_status FROM contact_email_addresses WHERE email = ?').bind(proof.outbound[1].to[0]).first('channel_status');
    const oneClickUrl = /^<(https:\/\/mango\.example\.test\/[^>]+)>$/.exec(proof.outbound[1].headers['List-Unsubscribe'])?.[1];
    expect(oneClickUrl).toBeTruthy();
    const visibleUrl = /<a href="(https:\/\/mango\.example\.test\/[^"]+)">Unsubscribe<\/a>/.exec(proof.outbound[1].html)?.[1];
    expect(visibleUrl).toBeTruthy();
    expect(visibleUrl).not.toBe(oneClickUrl);
    expect(proof.outbound[1].text).toContain(visibleUrl);
    for (const url of [visibleUrl!, oneClickUrl!]) expect((await runtime.dispatchFetch(url)).status).toBe(200);
    expect(await contactStatus()).toBe('subscribed');
    const oneClick = () => runtime.dispatchFetch(oneClickUrl!, {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'List-Unsubscribe=One-Click',redirect:'manual'});
    const first = await oneClick();
    expect(first.status).toBe(200);
    expect(await contactStatus()).toBe('unsubscribed');
    expect((await oneClick()).status).toBe(200);
    expect(await contactStatus()).toBe('unsubscribed');
    expect((await runtime.dispatchFetch('https://mango.example.test/api/settings/sender')).status).toBe(401);
    const status = await runtime.dispatchFetch('https://mango.example.test/api/settings/sender',{headers:{Host:'mango.example.test',Cookie:`__Host-operator_session=${proof.session}`}});
    expect(status.headers.get('cache-control')).toBe('no-store');
    const data = await status.json();
    expect(data.validation.ready).toBe(true);
    expect(data.evidence.observation.observedAt).toBeTruthy();
    expect(JSON.stringify(data)).not.toContain('receiver@example.test');
    expect(await db.prepare('SELECT count(*) n FROM sender_verification_associations').first()).toEqual({n:2});
  } finally { await runtime.dispose(); }
});

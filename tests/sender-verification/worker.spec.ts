import { sqlStatements } from '../../operations/sql-statements.mjs';
import { expect, test } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve('wrangler/package.json'))('miniflare');
const { build } = createRequire(require.resolve('vite/package.json'))('esbuild');
test('native Worker production services approve, hand off, reload protected evidence and renew sender reminders once per period with populated adapter upgrade [MSG-003][DELIV-007][INT-014]', async () => {
  const bundle = await build({ external:['node:*'],entryPoints:['tests/sender-verification/worker-entry.ts'], bundle:true,write:false,format:'esm',platform:'browser',alias:{'@':join(process.cwd(),'src')},logLevel:'silent' });
  const runtime = new Miniflare({host:'127.0.0.1',port: 0,cf:false,telemetry:{enabled:false},workers:[{config:{name:'sender-worker-proof',type:'worker',compatibilityDate:'2026-08-31',
    compatibilityFlags:['nodejs_compat'],
    manifest:{mainModule:'worker.js',modules:{'worker.js':{type:'esm',contents:bundle.outputFiles[0].text}}},env:{DB:{type:'d1',id:crypto.randomUUID()}}}}]});
  try {
    const db = await runtime.getD1Database('DB');
    const migrations=(await readdir('migrations/core')).filter(file=>file.endsWith('.sql')).sort();
    for(const file of migrations.filter(file=>!file.endsWith('_sender_renewal_deliveries.sql')&&!file.endsWith('_saved_report_schedules.sql')&&!file.endsWith('_review_loyalty_adapters.sql'))) await db.batch(sqlStatements((await readFile(`migrations/core/${file}`,'utf8'))).map(sql=>db.prepare(sql)));
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
    const populated=await db.prepare('SELECT (SELECT count(*) FROM contacts) contacts,(SELECT count(*) FROM campaigns) campaigns,(SELECT count(*) FROM sender_verification_observations) observations').first();
    for(const file of migrations.filter(file=>file.endsWith('_sender_renewal_deliveries.sql')||file.endsWith('_saved_report_schedules.sql')||file.endsWith('_review_loyalty_adapters.sql')))await db.batch(sqlStatements(await readFile(`migrations/core/${file}`,'utf8')).map(sql=>db.prepare(sql)));
    expect(await db.prepare('SELECT (SELECT count(*) FROM contacts) contacts,(SELECT count(*) FROM campaigns) campaigns,(SELECT count(*) FROM sender_verification_observations) observations').first()).toEqual(populated);
    expect(await db.prepare('SELECT count(*) n FROM review_loyalty_connections').first()).toEqual({n:0});
    const renewed=await (await runtime.dispatchFetch('https://mango.example.test/test-renewal-proof')).json();
    expect(renewed.day22).toMatchObject({due:false,ready:true});expect(renewed.sends22).toBe(0);
    expect(renewed.day23).toMatchObject({due:true,stage:'renewal',ready:true});
    expect(renewed.delivered23).toHaveLength(3);expect(renewed.delivered23.filter((row:any)=>row.subject.startsWith('Confirm '))).toHaveLength(1);
    expect(renewed.replay).toBe(0);expect(renewed.sends29).toBe(2);
    expect(renewed.day31).toMatchObject({due:true,stage:'lapsed',ready:false,reason:'sender-evidence-lapsed'});
    expect(renewed.changed).toMatchObject({due:true,stage:'changed',ready:false});
    expect(renewed.rows).toEqual(expect.arrayContaining([expect.objectContaining({kind:'diagnostic',state:'accepted',count:1}),expect.objectContaining({kind:'reminder',stage:'renewal',state:'accepted',count:2}),expect.objectContaining({kind:'reminder',stage:'final',state:'accepted',count:2})]));
  } finally { await runtime.dispose(); }
});

import {expect, test} from '@playwright/test';
import {readFile, writeFile, stat, access} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {contract} from '../contract';
import {authorityRuntime} from './authority-runtime.mjs';
import {nativeDatabase} from './authority-data.mjs';

contract('DATA-001','rer commands restore complete local D1 and R2 with matching authority, then reset to one empty native owner',async () => {
  test.setTimeout(600000);
  const runtime=await authorityRuntime();
  try {
    await runtime.command(['check','--profile','first-party']);
    await runtime.command(['describe','--json']);
    await runtime.setup(false);
    const vars=await readFile(join(runtime.checkout,'.dev.vars'),'utf8');
    await runtime.variables();
    const db=await nativeDatabase(runtime.checkout);
    db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('command-contact','contact@example.test','Retained contact','subscribed','non-subscribed',1,1)").run();db.close();
    const {getPlatformProxy}=createRequire(join(runtime.checkout,'package.json'))('wrangler');
    let proxy=await getPlatformProxy({configPath:join(runtime.checkout,'wrangler.toml'),persist:{path:join(runtime.checkout,'.wrangler/state/v3')},remoteBindings:false});
    try {await proxy.env.ASSETS_BUCKET.put('command-original',new Uint8Array([0,1,7,128,255]),{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{purpose:'roundtrip'}});} finally {await proxy.dispose();}
    await runtime.command(['export','--output','exports/source.jsonl']);
    await expect(runtime.command(['export','--output','exports/source.jsonl'])).rejects.toThrow();
    await expect(runtime.command(['import','--input','exports/source.jsonl'])).rejects.toThrow();
    await expect(runtime.command(['export','--target','remote','--output','exports/remote.jsonl'])).rejects.toThrow();
    await expect(runtime.command(['outbox','--origin','https://example.test'])).rejects.toThrow();
    await expect(runtime.command(['reset','--non-interactive'])).rejects.toThrow();
    await runtime.command(['reset','--yes']);
    await expect(access(join(runtime.checkout,'.dev.vars'))).rejects.toThrow();
    await access(join(runtime.checkout,'exports/source.jsonl'));await access(join(runtime.checkout,'src/core/app/app.ts'));
    await writeFile(join(runtime.checkout,'.dev.vars'),vars,{mode:0o600});
    await runtime.command(['import','--input','exports/source.jsonl','--yes']);
    await runtime.command(['export','--output','exports/restored.jsonl']);
    const closing=async path=>JSON.parse((await readFile(join(runtime.checkout,path),'utf8')).trim().split('\n').at(-1));
    expect((await closing('exports/restored.jsonl')).contentHash===(await closing('exports/source.jsonl')).contentHash).toBe(true);
    expect((await stat(join(runtime.checkout,'exports/source.jsonl'))).mode&0o777).toBe(0o600);
    proxy=await getPlatformProxy({configPath:join(runtime.checkout,'wrangler.toml'),persist:{path:join(runtime.checkout,'.wrangler/state/v3')},remoteBindings:false});
    try {const object=await proxy.env.ASSETS_BUCKET.get('command-original');expect(Array.from(new Uint8Array(await object.arrayBuffer()))).toEqual([0,1,7,128,255]);expect(object.customMetadata.purpose).toBe('roundtrip');} finally {await proxy.dispose();}
    await runtime.command(['reset','--yes']);await runtime.setup(false);
    const fresh=await nativeDatabase(runtime.checkout);
    try {expect(fresh.prepare('SELECT count(*) AS n FROM oa_operators').get().n).toBe(1);expect(fresh.prepare('SELECT count(*) AS n FROM contacts').get().n).toBe(0);} finally {fresh.close();}
  } finally {await runtime.close();}
});

import {expect,test} from '@playwright/test';
import {readFile,writeFile,stat,access} from 'node:fs/promises';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {authorityRuntime} from './authority-runtime.mjs';
import {nativeDatabase} from './authority-data.mjs';

test('[DATA-001] rer exports private local records and assets, refuses overwrite, restores into an empty installation and retains the backup after reset',async()=>{
  test.setTimeout(600000);
  const runtime=await authorityRuntime();
  try {
    await runtime.setup(false);await runtime.variables();
    const settings=await readFile(join(runtime.checkout,'.dev.vars'),'utf8');
    let db=await nativeDatabase(runtime.checkout);
    db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('command-contact','contact@example.test','Retained contact','subscribed','non-subscribed',1,1)").run();db.close();
    const {getPlatformProxy}=createRequire(join(runtime.checkout,'package.json'))('wrangler');
    const proxy=()=>getPlatformProxy({configPath:join(runtime.checkout,'wrangler.toml'),persist:{path:join(runtime.checkout,'.wrangler/state/v3')},remoteBindings:false});
    let store=await proxy();
    try {await store.env.ASSETS_BUCKET.put('command-original',new Uint8Array([0,1,7,128,255]),{httpMetadata:{contentType:'application/octet-stream'},customMetadata:{purpose:'roundtrip'}});}finally{await store.dispose();}
    await runtime.command(['export','--output','exports/source.jsonl']);
    await expect(runtime.command(['export','--output','exports/source.jsonl'])).rejects.toThrow();
    await expect(runtime.command(['import','--input','exports/source.jsonl','--yes'])).rejects.toThrow();
    await runtime.command(['reset','--yes']);
    await expect(access(join(runtime.checkout,'.dev.vars'))).rejects.toThrow();
    await access(join(runtime.checkout,'exports/source.jsonl'));
    await writeFile(join(runtime.checkout,'.dev.vars'),settings,{mode:0o600});
    await runtime.command(['import','--input','exports/source.jsonl','--yes']);
    await runtime.command(['export','--output','exports/restored.jsonl']);
    const closing=async(name:string)=>JSON.parse((await readFile(join(runtime.checkout,'exports',name),'utf8')).trim().split('\n').at(-1)!);
    expect((await closing('restored.jsonl')).contentHash).toBe((await closing('source.jsonl')).contentHash);
    expect((await stat(join(runtime.checkout,'exports/source.jsonl'))).mode&0o777).toBe(0o600);
    db=await nativeDatabase(runtime.checkout);
    try {expect(db.prepare("SELECT email,display_name FROM contacts WHERE id='command-contact'").get()).toMatchObject({email:'contact@example.test',display_name:'Retained contact'});}finally{db.close();}
    store=await proxy();
    try {const object=await store.env.ASSETS_BUCKET.get('command-original');expect(Array.from(new Uint8Array(await object.arrayBuffer()))).toEqual([0,1,7,128,255]);expect(object.customMetadata.purpose).toBe('roundtrip');}finally{await store.dispose();}
    await runtime.command(['reset','--yes']);
    await expect(access(join(runtime.checkout,'.dev.vars'))).rejects.toThrow();
    await access(join(runtime.checkout,'exports/source.jsonl'));
  } finally {await runtime.close();}
});

import { expect, test } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { portabilityRuntime } from './portability/runtime.mjs';
import { runCommand } from '../scripts/installer/run-command.mjs';
import { readArchive } from '../src/vendor/base/portability/index.mjs';
import { stageArchive } from './portability/flows';
import { png } from './support/images';

test('[DATA-001] complete native records and uploaded assets round-trip without restoring login authority', async () => {
  test.setTimeout(180000);
  const source = await portabilityRuntime(), target = await portabilityRuntime({ restore: true });
  try {
    const draft = await source.call('/api/campaigns', { method: 'POST', cookie: source.cookie, body: { mode: 'blank' } });
    expect(draft.status).toBe(201);
    const reusable=await source.call('/api/campaign-templates',{method:'POST',cookie:source.cookie,body:{revisionId:(await draft.clone().json()).revisionId,name:'Portable newsletter template'}});
    expect(reusable.status).toBe(201);
    await source.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES('portable-contact','contact@example.test','Contact','unsubscribed','never-subscribed',1,1)").run();
    await source.db.prepare("INSERT INTO surviving_opt_outs(id,destination_hash,channel,reason,occurred_at,created_at,updated_at) VALUES('portable-opt-out','already-hashed','email','unsubscribed',1,1,1)").run();
    const bytes = Uint8Array.from([0, 255, 127, 1]);
    await source.bucket.put('campaigns/original.png', bytes, { httpMetadata: { contentType: 'image/png' }, customMetadata: { label: 'Original' } });
    const image = png(5, 4);
    const form = new FormData();
    form.append('file', new Blob([image]), 'original.png');
    const uploaded = await fetch(`${source.origin}/api/campaign-assets`, { method: 'POST', body: form, headers: { Origin: source.origin, Cookie: source.cookie } });
    expect(uploaded.status).toBe(201);
    const campaignImage = (await uploaded.json()).asset;
    const archive = join(source.directory, 'source.ndjson'), session = join(source.directory, 'session');
    await writeFile(session, source.cookie, { mode: 0o600 });
    const command = (args: string[]) => runCommand('node', [resolve('src/vendor/base/portability/cli.mjs'), ...args], { write: () => {} });
    const allTables = (await source.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND sql IS NOT NULL").all()).results;
    await command(['export', '--origin', source.origin, '--session-file', session, '--out', archive]);
    const records = [];
    for await (const record of readArchive(new Response(await readFile(archive)).body!)) records.push(record);
    const manifest = records[0], original = records.filter(record => record.kind === 'part').flatMap(part => part.items).filter(item => item.kind === 'row');
    // Inventory before export creates temporary snapshot tables. Every source
    // table is archived or explicitly excluded by the maintained policy.
    for (const { name } of allTables) expect([...manifest.tables.map(table => table.name), ...manifest.excludedTables]).toContain(name);
    expect(original.some(row => row.table === 'campaign_templates' && row.row.name === 'Portable newsletter template')).toBe(true);
    expect(original.some(row => row.table === 'contacts' && row.row.id === 'portable-contact')).toBe(true);
    expect(original.some(row => row.table === 'surviving_opt_outs' && row.row.id === 'portable-opt-out')).toBe(true);
    expect(original.some(row => row.table.startsWith('oa_'))).toBe(false);
    expect((await target.call('/api/campaigns', { method: 'POST', cookie: target.cookie, body: { mode: 'blank' } })).status).toBe(503);
    expect((await target.call('/l/invalid-link-during-restore')).status).toBe(503);
    expect((await target.call('/subscribe/info')).status).toBe(503);
    expect((await target.call('/api/portability/exports', { method: 'POST', body: {} })).status).toBe(401);
    expect((await target.call('/api/portability/exports', { method: 'POST', cookie: target.cookie, body: {}, origin: 'https://other.example.test' })).status).toBe(403);
    const wrong = await portabilityRuntime({ restore: true, key: 'different-private-key-at-least-thirty-two-bytes' });
    try {
      const request = (path: string, body: unknown, method = 'POST') => wrong.call('/api/portability/' + path, { method, cookie: wrong.cookie, body });
      const id = (await (await request('imports', { confirmed: true, manifest })).json()).id;
      for (const part of records.filter(record => record.kind === 'part')) expect((await request(`imports/${id}/parts/${part.index}`, part, 'PUT')).status).toBe(200);
      expect((await request(`imports/${id}/finalize`, { contentHash: records.at(-1).contentHash, archiveHash: records.at(-1).archiveHash })).status).toBe(409);
      expect((await wrong.db.prepare('SELECT count(*) AS n FROM contacts').first()).n).toBe(0);
      expect((await wrong.bucket.list()).objects).toEqual([]);
    } finally { await wrong.close(); }
    await writeFile(session, target.cookie, { mode: 0o600 });
    await command(['import', '--origin', target.origin, '--session-file', session, '--from', archive]);
    // Restore and erasure cannot share a running app: only restore mode can
    // publish R2 objects, and that mode rejects deletion of an existing contact.
    expect((await target.call('/api/contacts/portable-contact', {method:'DELETE',cookie:target.cookie})).status).toBe(503);
    expect((await target.db.prepare("SELECT email FROM contacts WHERE id='portable-contact'").first()).email).toBe('contact@example.test');
    expect((await target.db.prepare('SELECT count(*) AS n FROM audience_erasures').first()).n).toBe(0);
    await target.resume();
    expect((await target.call('/api/portability/imports',{method:'POST',cookie:target.cookie,body:{confirmed:true,manifest}})).status).toBe(401);
    expect((await target.call('/api/portability/imports/prior-transfer/finalize',{method:'POST',cookie:target.cookie,body:{}})).status).toBe(401);
    expect(new Uint8Array(await (await target.bucket.get('campaigns/original.png'))!.arrayBuffer())).toEqual(bytes);
    expect((await target.call('/api/operator', { cookie: source.cookie })).status).toBe(401);
    expect((await target.call('/api/operator', { cookie: target.cookie })).status).toBe(200);
    const media = await target.call(`/media/${campaignImage.sha256}`);
    expect(media.status).toBe(200);
    expect(media.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await media.arrayBuffer())).toEqual(image);
    const asset = await target.bucket.get('campaigns/original.png');
    expect(new Uint8Array(await asset!.arrayBuffer())).toEqual(bytes);
    expect(asset!.httpMetadata.contentType).toBe('image/png');
    expect(asset!.customMetadata).toEqual({ label: 'Original' });
    const restored = join(target.directory, 'restored.ndjson');
    await command(['export', '--origin', target.origin, '--session-file', session, '--out', restored]);
    const roundTrip = [];
    for await (const record of readArchive(new Response(await readFile(restored)).body!)) roundTrip.push(record);
    const rows = roundTrip.filter(record => record.kind === 'part').flatMap(part => part.items).filter(item => item.kind === 'row');
    for (const row of original) expect(rows.some(restored => restored.table === row.table && JSON.stringify(restored.row) === JSON.stringify(row.row))).toBe(true);
    // Authentication adds only its current profile after import; domain records are unchanged.
    expect(rows.filter(row => row.table !== 'operators')).toEqual(original.filter(row => row.table !== 'operators'));
    expect((await target.db.prepare('SELECT id FROM oa_operators').all()).results).toEqual([{ id: target.actor.id }]);
  } finally { await source.close(); await target.close(); }
});

test('[CONT-013] current erasure authority refuses an old archive on an empty restore target', async () => {
  test.setTimeout(180000);
  const source=await portabilityRuntime(),target=await portabilityRuntime({restore:true});
  const archive=async()=>{
    const response=await source.call('/api/portability/exports',{cookie:source.cookie,method:'POST',body:{}});
    expect(response.status).toBe(201);const {id}=await response.json();let status;
    do {const next=await source.call(`/api/portability/exports/${id}/advance`,{cookie:source.cookie,method:'POST',body:{}});expect(next.status).toBe(200);status=await next.json();}while(status.phase!=='complete');
    const download=await source.call(`/api/portability/exports/${id}/download`,{cookie:source.cookie});expect(download.status).toBe(200);
    const records=[];for await(const record of readArchive(download.body!))records.push(record);return records;
  };
  try {
    const email='archive-erasure-canary@example.test',name='ArchivePrivateCanary';
    const preview=await source.call('/api/audience/import-preview',{cookie:source.cookie,method:'POST',body:{files:[{name:'canary.csv',preset:'csv-unsubscribed',csv:`Email Address,First Name\n${email},${name}`}]}});
    expect(preview.status).toBe(200);const {fingerprint}=await preview.json();
    const started=await source.call('/api/audience/imports',{cookie:source.cookie,method:'POST',body:{fingerprint}});expect(started.status).toBe(200);let {job}=await started.json();
    while(['queued','applying'].includes(job.state)){const next=await source.call(`/api/audience/imports/${job.id}/resume`,{cookie:source.cookie,method:'POST',body:{}});expect(next.status).toBe(200);({job}=await next.json());}
    expect(job.state).toBe('completed');
    const before=await archive();expect(JSON.stringify(before)).toContain(email);
    const artifacts=(await source.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND (name GLOB 'rer_portability_snap_*' OR name GLOB 'rer_portability_stage_*')").all()).results.map(row=>row.name);
    artifacts.push('rer_portability_segments','rer_portability_parts','rer_portability_owned','rer_portability_jobs');
    let discarded=0;for(const table of artifacts)discarded+=(await source.db.prepare(`SELECT count(*) AS n FROM "${table.replaceAll('"','""')}"`).first()).n;
    expect(discarded).toBeGreaterThan(0);
    const contact=await source.db.prepare('SELECT id FROM contacts WHERE email=?').bind(email).first();
    const erased=await source.call(`/api/contacts/${contact.id}`,{cookie:source.cookie,method:'DELETE'});expect(erased.status).toBe(202);let {receipt}=await erased.json();
    while(receipt.state==='pending'){const next=await source.call(`/api/audience/erasures/${receipt.reference}/resume`,{cookie:source.cookie,method:'POST',body:{}});expect([200,202]).toContain(next.status);({receipt}=await next.json());}
    expect(receipt.removed.transfer_artifacts).toBe(discarded);
    const after=await archive();expect(JSON.stringify(after)).not.toContain(email);expect(JSON.stringify(after)).not.toContain(name);
    const latest=after[0];expect(latest.journal).toEqual([]);
    const request=(path:string,body:unknown,method='POST')=>target.call('/api/portability/'+path,{cookie:target.cookie,method,body});
    const created=await request('imports',{confirmed:true,manifest:before[0]});expect(created.status).toBe(201);const {id}=await created.json();
    for(const part of before.filter(record=>record.kind==='part'))expect((await request(`imports/${id}/parts/${part.index}`,part,'PUT')).status).toBe(200);
    expect((await target.db.prepare('SELECT count(*) AS n FROM contacts').first()).n).toBe(0);
    const restored=await request(`imports/${id}/finalize`,{contentHash:before.at(-1).contentHash,archiveHash:before.at(-1).archiveHash,laterJournal:{sourceIdentity:latest.sourceIdentity,epoch:latest.epoch,journal:latest.journal}});
    const refusal=await restored.json();expect(restored.status,JSON.stringify(refusal)).toBe(400);expect(refusal.error).toBe('erasure_epoch');
    expect((await target.db.prepare('SELECT count(*) AS n FROM contacts').first()).n).toBe(0);
    expect((await target.call('/api/operator',{cookie:target.cookie})).status).toBe(200);
    expect((await request(`imports/${id}/abort`,{})).status).toBe(200);
    const currentId=await stageArchive(target,after);
    const current=await request(`imports/${currentId}/finalize`,{contentHash:after.at(-1).contentHash,archiveHash:after.at(-1).archiveHash,laterJournal:{sourceIdentity:latest.sourceIdentity,epoch:latest.epoch,journal:[]}});
    expect(current.status,await current.clone().text()).toBe(200);
    expect((await target.db.prepare('SELECT count(*) AS n FROM contacts').first()).n).toBe(0);
    const exportedRows=after.filter(record=>record.kind==='part').flatMap(part=>part.items).filter(item=>item.kind==='row');
    const optouts=(await target.db.prepare('SELECT * FROM surviving_opt_outs').all()).results;
    expect(optouts).toEqual(exportedRows.filter(item=>item.table==='surviving_opt_outs').map(item=>item.row));
    expect(optouts.length).toBeGreaterThan(0);
    // Current authority is now durable locally; an old manifest fails before staging.
    expect((await request('imports',{confirmed:true,manifest:before[0]})).status).toBe(400);
  } finally {await source.close();await target.close();}
});

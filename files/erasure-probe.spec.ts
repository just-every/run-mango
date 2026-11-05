import { expect, test } from '@playwright/test';
import { portabilityRuntime } from './portability/runtime.mjs';
import { crc32 } from 'node:zlib';
import { png } from './support/images';
import { eraseHttp } from './audience-import/erase';

test('CAMP-012 diagnostic: a complete PNG holding an exact contact identifier is gone after erasure', async () => {
  test.setTimeout(120000);
  const runtime = await portabilityRuntime();
  try {
    const id = 'synthetic-mango-156-person-6';
    const base = Buffer.from(png(8, 6, 156)), text = Buffer.from(`Description\0${id}`);
    const chunk = Buffer.alloc(text.length + 12);
    chunk.writeUInt32BE(text.length, 0);
    chunk.write('tEXt', 4);
    text.copy(chunk, 8);
    chunk.writeUInt32BE(crc32(chunk.subarray(4, -4)) >>> 0, chunk.length - 4);
    const bytes = new Uint8Array(Buffer.concat([base.subarray(0, 33), chunk, base.subarray(33)]));
    expect(Buffer.from(bytes).includes(id)).toBe(true);
    await runtime.db.prepare("INSERT INTO contacts(id,email,display_name,email_status,sms_status,created_at,updated_at) VALUES(?,?,?,'never-subscribed','never-subscribed',1,1)")
      .bind(id, ['synthetic-mango-156', 'example.test'].join('@'), 'Image proof person').run();
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'image/png' }), 'synthetic-mango-156.png');
    const uploaded = await fetch(runtime.origin + '/api/campaign-assets', { method: 'POST', body: form, headers: { Origin: runtime.origin, Cookie: runtime.cookie } });
    expect(uploaded.status).toBe(201);
    const { asset } = await uploaded.json();
    const receipt = await eraseHttp(runtime, runtime.cookie, id);
    const response = await fetch(asset.url);
    const remaining = new Uint8Array(await response.arrayBuffer());
    console.log('PROBE CAMP-012 acceptance-3 ' + JSON.stringify({ imageHoldsIdentifier: Buffer.from(bytes).includes(id), complete: receipt.state, status: response.status, unchangedBytes: Buffer.from(remaining).equals(Buffer.from(bytes)), removedStoredObjects: receipt.removed.stored_objects ?? 0 }));
    expect(response.status).toBe(410);
  } finally { await runtime.close(); }
});

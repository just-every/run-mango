import { test, expect } from '@playwright/test';
import { crc32 } from 'node:zlib';
import { createHash } from 'node:crypto';
import { installation, json, sender, confirmedContact } from '../go-live/harness';
import { providerEdge } from '../go-live/edge';
import { eventSigner } from '../go-live/sendgrid-events';
import { eraseHttp } from '../audience-import/erase';
import { png } from '../support/images';

test('diagnostic CAMP-012 contact identifier followed by a PNG checksum byte', async () => {
  test.setTimeout(360000);
  const edge = await providerEdge(), signer = eventSigner();
  let site: Awaited<ReturnType<typeof installation>> | undefined;
  try {
    site = await installation(edge, signer);
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', { method: 'PUT', cookie, body: sender }), 200);
    const address = ['synthetic-mango-161', 'example.test'].join('@');
    await confirmedContact(site, edge, cookie, address, 'Image reader');
    const contact = (await site.rows(`SELECT id FROM contacts WHERE email='${address}'`))[0];
    // Keep an exact identifier at the end of a valid text chunk. The checksum is
    // binary structure, and its first byte must never extend that identifier.
    let description = '', checksumByte = -1;
    for (let padding = 0; padding < 4096; padding++) {
      description = `synthetic-mango-${padding} ${contact.id}`;
      checksumByte = (crc32(Buffer.from(`tEXtDescription\0${description}`)) >>> 24) & 255;
      if (checksumByte === 65) break;
    }
    expect(checksumByte).toBe(65);
    const bytes = png(8, 6, 161, description);
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'image/png' }), 'synthetic-mango-boundary.png');
    const { asset } = await json(await site.call('/api/campaign-assets', { method: 'POST', cookie, raw: form }), 201);
    const before = await site.call(new URL(asset.url).pathname);
    expect(before.status).toBe(200);
    expect(new Uint8Array(await before.arrayBuffer())).toEqual(bytes);
    const receipt = await eraseHttp(site, cookie, contact.id);
    const response = await site.call(new URL(asset.url).pathname);
    const observed = new Uint8Array(await response.arrayBuffer());
    console.log('ERASURE_BOUNDARY_PROBE ' + JSON.stringify({ receiptState: receipt.state,
      checksumFirstByte: checksumByte, identifierImageStatus: response.status,
      retainedOriginal: createHash('sha256').update(observed).digest('hex') === asset.sha256 }));
    expect(response.status, 'erased identifier-bearing image must answer gone').toBe(410);
  } finally {
    await site?.runtime.close();
    await edge.close();
  }
});

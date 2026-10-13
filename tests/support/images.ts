import { crc32, deflateSync } from 'node:zlib';

function chunk(type: string, data: Uint8Array) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body) >>> 0, 8 + data.length);
  return out;
}

const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function header(width: number, height: number) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit RGB, no interlace
  return chunk('IHDR', ihdr);
}

/** A complete, decodable RGB PNG whose pixels vary with `seed`. */
export function png(width: number, height: number, seed = 0) {
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width * 3; x += 1) rows[y * (width * 3 + 1) + 1 + x] = (x * 37 + y * 11 + seed) & 255;
  return new Uint8Array(Buffer.concat([signature, header(width, height), chunk('IDAT', deflateSync(rows)), chunk('IEND', new Uint8Array())]));
}

/** Only the PNG signature and header: enough for Mango to read the declared size. */
export function pngHeaderOnly(width: number, height: number) {
  return new Uint8Array(Buffer.concat([signature, header(width, height)]));
}

import { crc32, deflateRawSync } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

// A small ZIP writer for synthetic account exports and for archives that break the
// rules on purpose. Every field the reader checks can be set per entry.
export type ZipEntry = { name: string; data: Uint8Array | string; method?: 0 | 8; flags?: number; host?: number; external?: number; declaredSize?: number };

export function zip(entries: ZipEntry[]) {
  const locals: Buffer[] = [], central: Buffer[] = []; let offset = 0;
  for (const entry of entries) {
    const data = Buffer.from(entry.data), name = Buffer.from(entry.name, 'utf8'), method = entry.method ?? 8;
    const body = method === 8 ? deflateRawSync(data) : data, crc = crc32(data), size = entry.declaredSize ?? data.length, flags = (entry.flags ?? 0) | 0x800;
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(flags, 6); local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(size, 22); local.writeUInt16LE(name.length, 26);
    const header = Buffer.alloc(46); header.writeUInt32LE(0x02014b50, 0); header.writeUInt8(20, 4); header.writeUInt8(entry.host ?? 3, 5); header.writeUInt16LE(20, 6);
    header.writeUInt16LE(flags, 8); header.writeUInt16LE(method, 10); header.writeUInt32LE(crc, 16); header.writeUInt32LE(body.length, 20); header.writeUInt32LE(size, 24);
    header.writeUInt16LE(name.length, 28); header.writeUInt32LE(entry.external ?? (0o100644 << 16) >>> 0, 38); header.writeUInt32LE(offset, 42);
    locals.push(local, name, body); central.push(header, name); offset += 30 + name.length + body.length;
  }
  const directory = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}

const fixtures = join(process.cwd(), 'tests/move-in/fixtures/account-export');
async function files(directory: string): Promise<string[]> {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat();
}
/** The synthetic account export, its entries in path order or reversed. */
export async function accountExport(order: 'path' | 'reverse' = 'path', change: (name: string, data: Buffer) => Buffer = (_name, data) => data) {
  const paths = (await files(fixtures)).map(path => relative(fixtures, path).split('\\').join('/')).sort();
  if (order === 'reverse') paths.reverse();
  return zip(await Promise.all(paths.map(async name => ({ name, data: change(name, await readFile(join(fixtures, name))) }))));
}

import { createHash } from 'node:crypto';
import { archiveLimits } from './archive-limits';

// Structural ZIP reading for an uploaded account export. Nothing is written to disk:
// the central directory is validated first, then each entry is streamed through
// inflate, size-fenced against its declared size, CRC-checked and hashed. Only the
// entries kept for review are decoded into memory, as text.

export type ArchiveRefusalCode = 'not-zip' | 'truncated' | 'multi-disk' | 'zip64' | 'too-many-entries' | 'absolute-path' | 'path-traversal'
  | 'invalid-name' | 'duplicate-name' | 'symbolic-link' | 'encrypted-entry' | 'unsupported-compression' | 'inconsistent-header'
  | 'overlapping-entries' | 'entry-too-large' | 'expanded-too-large' | 'compression-ratio' | 'corrupt-entry' | 'archive-too-large'
  | 'retained-text-too-large' | 'nothing-to-import';

export class ArchiveRefused extends Error {
  constructor(readonly code: ArchiveRefusalCode, message: string, readonly entry?: string) { super(message); }
}

export type ArchiveEntry = {
  path: string; size: number; compressedSize: number; sha256: string;
  /** Present only for entries the caller asked to keep as text. */
  text?: string;
};
export type ReadArchive = { sha256: string; size: number; entries: ArchiveEntry[]; folders: number };

const nestedArchive = /\.(zip|gz|tgz|tar|7z|rar|bz2|xz|zst|jar)$/i;
export const isNestedArchive = (path: string) => nestedArchive.test(path);

let crcTable: Uint32Array | undefined;
/** Running CRC-32: start at 0xffffffff and finish with `^ 0xffffffff`. */
function crc32(crc: number, bytes: Uint8Array) {
  crcTable ??= Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return crc;
}
export async function sha256Hex(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

function decodeName(bytes: Uint8Array, utf8Flag: boolean) {
  if (bytes.includes(0)) throw new ArchiveRefused('invalid-name', 'An entry name contains a NUL byte.');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { if (utf8Flag) throw new ArchiveRefused('invalid-name', 'An entry name is not valid UTF-8.'); return new TextDecoder('latin1').decode(bytes); }
}

/** A safe relative path, or a refusal that names the entry. */
export function entryPath(name: string) {
  const unified = name.replaceAll('\\', '/');
  if (unified.startsWith('/') || /^[A-Za-z]:/.test(unified)) throw new ArchiveRefused('absolute-path', `${name} is an absolute path.`, name);
  const segments = unified.split('/');
  if (segments.includes('..')) throw new ArchiveRefused('path-traversal', `${name} climbs out of the archive with "..".`, name);
  if (segments.some(segment => /[\u0000-\u001f]/.test(segment))) throw new ArchiveRefused('invalid-name', `${JSON.stringify(name)} contains control characters.`, name);
  return segments.filter(segment => segment && segment !== '.').join('/');
}

/** Stream one entry: count, CRC and hash every byte; decode text only when kept. */
async function expand(data: Uint8Array<ArrayBuffer>, method: number, declared: number, name: string, keep: boolean) {
  const hash = createHash('sha256'), decoder = keep ? new TextDecoder('utf-8') : undefined, text: string[] = [];
  let total = 0, crc = 0xffffffff;
  const take = (chunk: Uint8Array) => {
    total += chunk.byteLength;
    if (total > declared) throw new ArchiveRefused('inconsistent-header', `${name} expands past the size its header declares.`, name);
    crc = crc32(crc, chunk); hash.update(chunk);
    if (decoder) text.push(decoder.decode(chunk, { stream: true }));
  };
  if (method === 0) for (let offset = 0; offset < data.byteLength; offset += 1 << 20) take(data.subarray(offset, offset + (1 << 20)));
  else {
    const reader = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; take(value); } }
    catch (error) {
      await reader.cancel().catch(() => undefined);
      if (error instanceof ArchiveRefused) throw error;
      throw new ArchiveRefused('truncated', `${name} is truncated or its compressed data is damaged.`, name);
    }
  }
  if (decoder) text.push(decoder.decode());
  return { size: total, crc: (crc ^ 0xffffffff) >>> 0, sha256: hash.digest('hex'), text: decoder ? text.join('').replace(/^\uFEFF/, '') : undefined };
}

/** Validate and expand every entry. `keepText` selects entries returned as decoded text. */
export async function readZip(archive: Uint8Array<ArrayBuffer>, keepText: (path: string) => boolean): Promise<ReadArchive> {
  if (archive.byteLength > archiveLimits.archiveBytes) throw new ArchiveRefused('archive-too-large', 'archive-too-large');
  const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
  let end = -1;
  for (let at = archive.byteLength - 22; at >= Math.max(0, archive.byteLength - 22 - 0xffff); at--) {
    if (view.getUint32(at, true) === 0x06054b50) { end = at; break; }
  }
  if (end < 0) throw new ArchiveRefused(archive.byteLength >= 4 && view.getUint32(0, true) === 0x04034b50 ? 'truncated' : 'not-zip',
    archive.byteLength >= 4 && view.getUint32(0, true) === 0x04034b50 ? 'The archive is truncated: its central directory is missing.' : 'This file is not a ZIP archive.');
  if (view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0) throw new ArchiveRefused('multi-disk', 'Split (multi-part) archives are not supported.');
  const count = view.getUint16(end + 10, true), directorySize = view.getUint32(end + 12, true), directoryOffset = view.getUint32(end + 16, true);
  if (count === 0xffff || directorySize === 0xffffffff || directoryOffset === 0xffffffff) throw new ArchiveRefused('zip64', 'ZIP64 archives are not supported.');
  if (count !== view.getUint16(end + 8, true)) throw new ArchiveRefused('multi-disk', 'Split (multi-part) archives are not supported.');
  if (count > archiveLimits.entries) throw new ArchiveRefused('too-many-entries', `The archive lists ${count} entries; Mango reads at most ${archiveLimits.entries}.`);
  if (directoryOffset + directorySize > end) throw new ArchiveRefused('truncated', 'The archive is truncated: its central directory is incomplete.');

  type Header = { path: string; method: number; crc: number; compressedSize: number; size: number; local: number; flags: number };
  const headers: Header[] = []; const seen = new Set<string>(); let folders = 0;
  let at = directoryOffset;
  for (let index = 0; index < count; index++) {
    if (at + 46 > end || view.getUint32(at, true) !== 0x02014b50) throw new ArchiveRefused('truncated', 'The archive is truncated: a central directory entry is missing.');
    const host = view.getUint8(at + 5), flags = view.getUint16(at + 8, true), method = view.getUint16(at + 10, true);
    const crc = view.getUint32(at + 16, true), compressedSize = view.getUint32(at + 20, true), size = view.getUint32(at + 24, true);
    const nameLength = view.getUint16(at + 28, true), extraLength = view.getUint16(at + 30, true), commentLength = view.getUint16(at + 32, true);
    const external = view.getUint32(at + 38, true), local = view.getUint32(at + 42, true);
    if (at + 46 + nameLength > end) throw new ArchiveRefused('truncated', 'The archive is truncated inside an entry name.');
    const name = decodeName(archive.subarray(at + 46, at + 46 + nameLength), Boolean(flags & 0x800));
    at += 46 + nameLength + extraLength + commentLength;
    const path = entryPath(name);
    if (compressedSize === 0xffffffff || size === 0xffffffff || local === 0xffffffff) throw new ArchiveRefused('zip64', `${name} uses ZIP64 sizes, which are not supported.`, name);
    if ((host === 3 || host === 19) && ((external >>> 16) & 0xf000) === 0xa000) throw new ArchiveRefused('symbolic-link', `${name} is a symbolic link.`, name);
    if (flags & 0x41) throw new ArchiveRefused('encrypted-entry', `${name} is encrypted.`, name);
    const key = path.toLowerCase();
    if (seen.has(key)) throw new ArchiveRefused('duplicate-name', `${name} appears more than once in the archive.`, name);
    seen.add(key);
    if (name.endsWith('/') || name.endsWith('\\')) { if (size || compressedSize) throw new ArchiveRefused('inconsistent-header', `Folder ${name} carries data.`, name); folders++; continue; }
    if (!path) throw new ArchiveRefused('invalid-name', `${JSON.stringify(name)} has no usable name.`, name);
    if (method !== 0 && method !== 8) throw new ArchiveRefused('unsupported-compression', `${name} uses a compression method Mango does not read.`, name);
    if (method === 0 && size !== compressedSize) throw new ArchiveRefused('inconsistent-header', `${name} is stored uncompressed but its sizes differ.`, name);
    if (size > archiveLimits.entryBytes) throw new ArchiveRefused('entry-too-large', `${name} expands to ${size} bytes; one entry may expand to at most ${archiveLimits.entryBytes}.`, name);
    if (size > archiveLimits.ratioFloorBytes && size > compressedSize * archiveLimits.compressionRatio) throw new ArchiveRefused('compression-ratio', `${name} expands more than ${archiveLimits.compressionRatio} times its compressed size.`, name);
    headers.push({ path, method, crc, compressedSize, size, local, flags });
  }
  if (at !== directoryOffset + directorySize) throw new ArchiveRefused('inconsistent-header', 'The central directory size does not match its entries.');
  if (headers.reduce((sum, header) => sum + header.size, 0) > archiveLimits.expandedBytes) throw new ArchiveRefused('expanded-too-large', `The archive expands past ${archiveLimits.expandedBytes} bytes.`);

  // Each entry's local data must lie inside the archive, before the directory, without overlap.
  const ranges: Array<[number, number, string]> = [];
  for (const header of headers) {
    const { local, path } = header;
    if (local + 30 > directoryOffset || view.getUint32(local, true) !== 0x04034b50) throw new ArchiveRefused('truncated', `${path} has no local header where the directory says.`, path);
    const nameLength = view.getUint16(local + 26, true), extraLength = view.getUint16(local + 28, true);
    if ((view.getUint16(local + 6, true) & 0x41) !== (header.flags & 0x41) || view.getUint16(local + 8, true) !== header.method) throw new ArchiveRefused('inconsistent-header', `${path}'s local header disagrees with the directory.`, path);
    const start = local + 30 + nameLength + extraLength, finish = start + header.compressedSize;
    if (finish > directoryOffset) throw new ArchiveRefused('truncated', `${path} is truncated.`, path);
    ranges.push([local, finish, path]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  for (let index = 1; index < ranges.length; index++) {
    if (ranges[index][0] < ranges[index - 1][1]) throw new ArchiveRefused('overlapping-entries', `${ranges[index][2]} overlaps another entry's data.`, ranges[index][2]);
  }

  const entries: ArchiveEntry[] = []; let retained = 0;
  for (const header of headers) {
    const nameLength = view.getUint16(header.local + 26, true), extraLength = view.getUint16(header.local + 28, true);
    const start = header.local + 30 + nameLength + extraLength;
    const keep = keepText(header.path);
    if (keep && (retained += header.size) > archiveLimits.retainedTextBytes) throw new ArchiveRefused('retained-text-too-large', 'retained-text-too-large');
    const expanded = await expand(archive.subarray(start, start + header.compressedSize), header.method, header.size, header.path, keep);
    if (expanded.size !== header.size) throw new ArchiveRefused('truncated', `${header.path} ended before its declared size.`, header.path);
    if (expanded.crc !== header.crc) throw new ArchiveRefused('corrupt-entry', `${header.path} fails its CRC check.`, header.path);
    const entry: ArchiveEntry = { path: header.path, size: header.size, compressedSize: header.compressedSize, sha256: expanded.sha256, ...(keep ? { text: expanded.text } : {}) };
    entries.push(entry);
  }
  entries.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { sha256: await sha256Hex(archive), size: archive.byteLength, entries, folders };
}

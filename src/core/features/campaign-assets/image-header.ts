/** The image type and pixel size read from a file's own header bytes (CAMP-012).
 * Nothing is decoded; a header Mango does not fully understand is no image. */
export type ImageHeader = { contentType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp'; width: number; height: number };

const ascii = (bytes: Uint8Array, start: number, text: string) =>
  bytes.length >= start + text.length && [...text].every((char, index) => bytes[start + index] === char.charCodeAt(0));
const u16be = (bytes: Uint8Array, at: number) => (bytes[at] << 8) | bytes[at + 1];
const u16le = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8);
const u24le = (bytes: Uint8Array, at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
const u32be = (bytes: Uint8Array, at: number) => ((bytes[at] << 24) >>> 0) + (bytes[at + 1] << 16) + (bytes[at + 2] << 8) + bytes[at + 3];

function png(bytes: Uint8Array): ImageHeader | undefined {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 33 || signature.some((byte, index) => bytes[index] !== byte)) return undefined;
  if (u32be(bytes, 8) !== 13 || !ascii(bytes, 12, 'IHDR')) return undefined;
  return { contentType: 'image/png', width: u32be(bytes, 16), height: u32be(bytes, 20) };
}

function gif(bytes: Uint8Array): ImageHeader | undefined {
  if (bytes.length < 10 || !(ascii(bytes, 0, 'GIF87a') || ascii(bytes, 0, 'GIF89a'))) return undefined;
  return { contentType: 'image/gif', width: u16le(bytes, 6), height: u16le(bytes, 8) };
}

// Start-of-frame markers carry the frame size; C4 (DHT), C8 (JPG) and CC (DAC) do not.
const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
function jpeg(bytes: Uint8Array): ImageHeader | undefined {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return undefined;
  let at = 2;
  while (at + 3 < bytes.length) {
    if (bytes[at] !== 0xff) return undefined;
    while (bytes[at] === 0xff && at + 1 < bytes.length) at += 1;
    const marker = bytes[at];
    at += 1;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    // Image data or end of image before any frame header: not an image Mango can size.
    if (marker === 0xd9 || marker === 0xda || at + 2 > bytes.length) return undefined;
    const length = u16be(bytes, at);
    if (length < 2) return undefined;
    if (startOfFrame.has(marker)) {
      if (length < 7 || at + 7 > bytes.length) return undefined;
      return { contentType: 'image/jpeg', height: u16be(bytes, at + 3), width: u16be(bytes, at + 5) };
    }
    at += length;
  }
  return undefined;
}

function webp(bytes: Uint8Array): ImageHeader | undefined {
  if (bytes.length < 30 || !ascii(bytes, 0, 'RIFF') || !ascii(bytes, 8, 'WEBP')) return undefined;
  if (ascii(bytes, 12, 'VP8 ')) {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return undefined;
    return { contentType: 'image/webp', width: u16le(bytes, 26) & 0x3fff, height: u16le(bytes, 28) & 0x3fff };
  }
  if (ascii(bytes, 12, 'VP8L')) {
    if (bytes[20] !== 0x2f) return undefined;
    const bits = (bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24)) >>> 0;
    return { contentType: 'image/webp', width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (ascii(bytes, 12, 'VP8X')) return { contentType: 'image/webp', width: u24le(bytes, 24) + 1, height: u24le(bytes, 27) + 1 };
  return undefined;
}

export function readImageHeader(bytes: Uint8Array): ImageHeader | undefined {
  return png(bytes) ?? jpeg(bytes) ?? gif(bytes) ?? webp(bytes);
}

const u32le = (bytes: Uint8Array, at: number) => (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0;
/** PNG chunks must chain, inside the file, through image data to IEND at the very end. */
function completePng(bytes: Uint8Array) {
  let at = 8, data = false;
  while (at + 12 <= bytes.length) {
    const length = u32be(bytes, at), end = at + 12 + length;
    if (end > bytes.length) return false;
    if (ascii(bytes, at + 4, 'IDAT')) data = true;
    if (ascii(bytes, at + 4, 'IEND')) return data && end === bytes.length;
    at = end;
  }
  return false;
}
/** Whether the file runs to its format's own end marker: a truncated upload is refused, not stored (CAMP-012). */
export function completeImage(bytes: Uint8Array, contentType: ImageHeader['contentType']) {
  if (contentType === 'image/png') return completePng(bytes);
  if (contentType === 'image/jpeg') return bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  if (contentType === 'image/gif') return bytes.at(-1) === 0x3b;
  return u32le(bytes, 4) + 8 === bytes.length;
}

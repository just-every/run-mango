const prefix = 'm1_';

function encodeBytes(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function decodeBytes(value: string): string | undefined {
  try {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
  } catch {
    return undefined;
  }
}

export function encodeProviderReference(value: string): string {
  if (!value) throw new Error('Provider references must not be empty.');
  return `${prefix}${encodeBytes(value)}`;
}

export function decodeProviderReference(value: string): string | undefined {
  return value.startsWith(prefix) ? decodeBytes(value.slice(prefix.length)) : undefined;
}

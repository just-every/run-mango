const encoder = new TextEncoder();
const crockford = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function encodeTime(time: number) {
  let source = time;
  let output = '';
  for (let index = 0; index < 10; index += 1) {
    output = crockford[source % 32] + output;
    source = Math.floor(source / 32);
  }
  return output;
}

export function ulid(now = Date.now()) {
  const entropy = crypto.getRandomValues(new Uint8Array(16));
  let output = encodeTime(now);
  for (const byte of entropy) output += crockford[byte & 31];
  return output;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stable(entry)]),
    );
  }
  return value;
}

export function stableJson(value: unknown) {
  return JSON.stringify(stable(value));
}

const bytes = new TextEncoder();
async function key(secret: string) {
  return crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', bytes.encode('mango-stripe-v1:' + secret)), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(value: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await key(secret), bytes.encode(value)));
  return JSON.stringify([Array.from(iv), Array.from(encrypted)]);
}
export async function unseal(value: string, secret: string) {
  const [iv, encrypted] = JSON.parse(value);
  return new TextDecoder().decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: new Uint8Array(iv)}, await key(secret), new Uint8Array(encrypted)));
}

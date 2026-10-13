import type { PublicTokenClaims, PublicTokenSigner } from '@/core/shared/platform';

import { base64UrlDecode, base64UrlDecodeBytes, base64UrlEncode, hmacSha256, sha256, timingSafeEqual } from './crypto';

type EncodedClaims = Omit<PublicTokenClaims, 'expiresAt'> & { expiresAt: string };

function bufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export function createPublicTokenSigner(secret: string): PublicTokenSigner {
  return {
    async issue(claims) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedClaims = JSON.stringify({ ...claims, expiresAt: claims.expiresAt.toISOString() } satisfies EncodedClaims);
      const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(secret), new TextEncoder().encode(encodedClaims)));
      const nonce = base64UrlEncode(iv);
      const ciphertext = base64UrlEncode(encrypted);
      return `${nonce}.${ciphertext}.${await hmacSha256(secret, `${nonce}.${ciphertext}`)}`;
    },

    async verify(token, purpose, now = new Date()) {
      const [nonce, ciphertext, signature, extra] = token.split('.');
      if (!nonce || !ciphertext || !signature || extra || !timingSafeEqual(signature, await hmacSha256(secret, `${nonce}.${ciphertext}`))) {
        throw new Error('Public token signature is invalid.');
      }
      let claims: EncodedClaims;
      try {
        const plaintext = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: bufferSource(base64UrlDecodeBytes(nonce)) },
          await encryptionKey(secret),
          bufferSource(base64UrlDecodeBytes(ciphertext)),
        );
        claims = JSON.parse(new TextDecoder().decode(plaintext)) as EncodedClaims;
      } catch {
        throw new Error('Public token payload is invalid.');
      }
      const expiresAt = new Date(claims.expiresAt);
      if (!claims.id || claims.purpose !== purpose || Number.isNaN(expiresAt.valueOf()) || expiresAt <= now) {
        throw new Error('Public token is expired or is for another action.');
      }
      return { id: claims.id, purpose: claims.purpose, expiresAt };
    },

    digest: sha256,
  };
}

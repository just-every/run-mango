declare module '@/vendor/base/operator-auth/crypto.mjs' {
  export function hashToken(secret: string, purpose: string, token: string): Promise<string>;
}

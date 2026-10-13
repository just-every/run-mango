// The browser consumes only Base's pure return-path policy, never its server entry.
declare module '@/vendor/base/operator-auth/policy.mjs' {
  export function safeReturnTo(value: unknown, fallback?: string): string;
}

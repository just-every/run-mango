import { fileURLToPath } from 'node:url';

// Preview uses the local sign-in surface and a fixed build of the local worker
// (src/core/app/worker.local.ts) from `.seed/preview`, over the same local state as `rer dev`.
export const previewTarget = ({ origin, runtimePort, devKey }) => [process.execPath, [fileURLToPath(new URL('./preview-runtime.mjs', import.meta.url))], {
  env: { ...process.env, RER_DEV_ORIGIN: origin, RER_RUNTIME_HOST: runtimePort ? '127.0.0.1' : new URL(origin).hostname.replace(/^\[|\]$/g, ''), RER_RUNTIME_PORT: String(runtimePort ?? new URL(origin).port), WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_INCLUDE_PROCESS_ENV: 'false', X_LOCAL_EXPLORER: 'false', ...(devKey ? { RER_DEV_KEY: devKey } : {}) },
}];

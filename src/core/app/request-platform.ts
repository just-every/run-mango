import { AsyncLocalStorage } from 'node:async_hooks';
import type { Platform } from '@/core/shared/platform';
// The Worker entry chooses the platform. SSR cannot infer local authority from bindings.
export const requestPlatform = new AsyncLocalStorage<Platform>();
export function currentPlatform() {
  const platform = requestPlatform.getStore();
  if (!platform) throw new Error('Missing request platform.');
  return platform;
}

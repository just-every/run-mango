import type { Platform, AppBindings } from '@/core/shared/platform';
import { createLocalPlatform } from '@/core/platform/runtime';
import { createApp } from './app';
import { devGate, devNotFound } from '@/vendor/base/operator-auth/index.mjs';
export type LocalAppBindings = AppBindings;
export function createLocalApp(environment: LocalAppBindings, suppliedPlatform?: Platform) {
  const platform = suppliedPlatform ?? createLocalPlatform(environment, environment.SESSION_SIGNING_KEY);
  return createApp(environment, platform, app => {
    const gate = devGate({ key: environment.RER_DEV_KEY, origin: platform.config.publicBaseUrl.origin, local: platform.config.local === true });
    app.all('/__dev/key', async context => gate ? await gate.exchange(context.req.raw) ?? devNotFound() : devNotFound());
    app.all('/api/_local/*', context => context.json({ error: 'not_found' }, 404));
  });
}

import type { Platform, AppBindings } from '@/core/shared/platform';
import { createLocalPlatform } from '@/core/platform/runtime';
import { createApp } from './app';
import { mountDevelopmentOutbox } from './development-outbox';
export type LocalAppBindings = AppBindings;
export function createLocalApp(environment: LocalAppBindings, suppliedPlatform?: Platform) {
  const platform = suppliedPlatform ?? createLocalPlatform(environment, environment.SESSION_SIGNING_KEY);
  return createApp(environment, platform, app => {
    mountDevelopmentOutbox(app, environment, platform);
    app.all('/api/_local/*', context => context.json({ error: 'not_found' }, 404));
  });
}

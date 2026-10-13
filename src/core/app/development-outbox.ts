import type { Hono } from 'hono';
import { createDevelopmentOutboxHandler, createD1DevelopmentOutbox } from '@/vendor/base/mail/src/development/index.mjs';
import { devGate, devNotFound } from '@/vendor/base/operator-auth/index.mjs';
import type { Platform, AppBindings } from '@/core/shared/platform';
import type { AppEnvironment } from './app';

// The local sign-in mail lands in the D1 development outbox, so every local
// Worker that builds the app mounts this page next to it. Non-local platforms
// answer 404 here and in document dispatch. A tunnel or local proxy makes remote
// requests look local, so the outbox and the key exchange also need RER_DEV_KEY:
// the outbox answers only a request holding the gate's cookie or the rer harness's key header.
export function mountDevelopmentOutbox(app: Hono<AppEnvironment>, environment: AppBindings, platform: Platform) {
  const local = platform.config.local === true, origin = platform.config.publicBaseUrl.origin;
  const gate = devGate({ key: environment.RER_DEV_KEY, origin, local });
  const handle = createDevelopmentOutboxHandler({ local, origin, outbox: createD1DevelopmentOutbox({ db: environment.DB }) });
  app.all('/__dev/key', async context => gate ? await gate.exchange(context.req.raw) ?? devNotFound() : devNotFound());
  app.all('/__dev/outbox', async context => !gate || !await gate.admits(context.req.raw) ? devNotFound() : await handle(context.req.raw) ?? context.notFound());
}

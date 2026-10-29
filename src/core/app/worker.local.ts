import {loadWooCommerce} from '@/core/features/store/woocommerce/connection';
import { withDemo } from '../../vendor/base/demo/index.mjs';
import { seedDemo } from '../../demo';
import { dispatchDocuments } from './document-dispatch';
import { createLocalWorkerPlatform as createLocalPlatform } from '@/core/platform/worker-runtime';
import { createAppServices } from './app';
import { createLocalApp } from './local-app';
import type { LocalAppBindings } from './local-app';
import { consumeLifecycleQueue, type LifecycleQueueBatch } from '@/core/features/lifecycle';
import { runScheduled } from './scheduled';
import { acknowledgeHealthProbe } from '@/core/features/health/queue-probe';

const worker = {
  async fetch(request, environment, executionContext) {
    const bindings = environment as LocalAppBindings;
    const platform = createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY);
    if (new URL(request.url).pathname !== '/health') await loadWooCommerce(platform);
    return dispatchDocuments(request, bindings, executionContext, platform, createLocalApp(bindings, platform));
  },
  // A copy running on a computer consumes every job, as a demo does: its mail is suppressed, so an approved campaign sends quietly.
  async queue(batch, environment) {
    const messages = (batch as unknown as LifecycleQueueBatch).messages.filter(message => !acknowledgeHealthProbe(message));
    if (!messages.length) return;
    const bindings = environment as LocalAppBindings;
    const platform = createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY);
    await loadWooCommerce(platform);
    const runtime = createAppServices(platform).lifecycleRuntime;
    await consumeLifecycleQueue({ messages }, runtime);
  },
  // rer dev fires the Cron Trigger every minute: record the tick and run the same lifecycle work; its mail never leaves this computer.
  scheduled(controller, environment, executionContext) {
    const bindings = environment as LocalAppBindings;
    executionContext.waitUntil(runScheduled(controller, bindings,
      async () => {const platform = createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY); await loadWooCommerce(platform); return createAppServices(platform).lifecycleRuntime;}));
  },
} satisfies ExportedHandler<LocalAppBindings>;

export default withDemo(worker, { seed: seedDemo });

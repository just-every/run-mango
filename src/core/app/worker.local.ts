import { withDemo } from '../../vendor/base/demo/index.mjs';
import { seedDemo } from '../../demo';
import { dispatchDocuments } from './document-dispatch';
import { createLocalWorkerPlatform as createLocalPlatform } from '@/core/platform/worker-runtime';
import { createAppServices } from './app';
import { createLocalApp } from './local-app';
import type { LocalAppBindings } from './local-app';
import { consumeLifecycleQueue, type LifecycleQueueBatch } from '@/core/features/lifecycle';
import { runScheduled } from './scheduled';
import { designCommandKinds } from '@/core/features/design-generation/advance';
import { acknowledgeHealthProbe } from '@/core/features/health/queue-probe';

const worker = {
  fetch(request, environment, executionContext) {
    const bindings = environment as LocalAppBindings;
    const platform = createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY);
    return dispatchDocuments(request, bindings, executionContext, platform, createLocalApp(bindings, platform));
  },
  // Ordinary local development consumes design jobs; demos exercise all jobs through mocked effects.
  async queue(batch, environment) {
    const messages = (batch as unknown as LifecycleQueueBatch).messages.filter(message => !acknowledgeHealthProbe(message));
    if (!messages.length) return;
    const bindings = environment as LocalAppBindings;
    const runtime = createAppServices(createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY)).lifecycleRuntime;
    await consumeLifecycleQueue({ messages }, runtime, bindings.RER_DEMO === '1' ? undefined : designCommandKinds);
  },
  // rer dev fires the Cron Trigger every minute: record the tick and run the same lifecycle work, which sends nothing here.
  scheduled(controller, environment, executionContext) {
    const bindings = environment as LocalAppBindings;
    executionContext.waitUntil(runScheduled(controller, bindings,
      async () => createAppServices(createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY)).lifecycleRuntime));
  },
} satisfies ExportedHandler<LocalAppBindings>;

export default withDemo(worker, { seed: seedDemo });

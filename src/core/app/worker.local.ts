import { withDemo } from '../../modules/demo/index.mjs';
import { seedDemo } from '../../demo';
import { dispatchDocuments } from './document-dispatch';
import { createLocalPlatform } from '@/core/platform/runtime';
import { createAppServices } from './app';
import { createLocalApp } from './local-app';
import type { LocalAppBindings } from './local-app';
import { consumeLifecycleQueue, type LifecycleQueueBatch } from '@/core/features/lifecycle';
import { designCommandKinds } from '@/core/features/design-generation/advance';
import { acknowledgeHealthProbe } from '@/core/features/health/queue-probe';

const worker = {
  fetch(request, environment, executionContext) {
    const bindings = environment as LocalAppBindings;
    return dispatchDocuments(request, bindings, executionContext, createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY), createLocalApp(bindings));
  },
  // A copy running on a computer delivers nothing: acknowledge health probes and run designs
  // (DESIGN-002, decision D8a); other domain commands stay unconsumed as before.
  async queue(batch, environment) {
    const messages = (batch as unknown as LifecycleQueueBatch).messages.filter(message => !acknowledgeHealthProbe(message));
    if (!messages.length) return;
    const bindings = environment as LocalAppBindings;
    const runtime = createAppServices(createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY)).lifecycleRuntime;
    await consumeLifecycleQueue({ messages }, runtime, designCommandKinds);
  },
} satisfies ExportedHandler<LocalAppBindings>;

export default withDemo(worker, { seed: seedDemo });

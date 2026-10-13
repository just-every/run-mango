import { dispatchDocuments } from './document-dispatch';
import { createLocalPlatform } from '@/core/platform/runtime';
import { createAppServices } from './app';
import { createLocalApp } from './local-app';
import type { LocalAppBindings } from './local-app';
import { consumeLifecycleQueue, type LifecycleQueueBatch } from '@/core/features/lifecycle';
import { designCommandKinds } from '@/core/features/design-generation/advance';

export default {
  fetch(request, environment, executionContext) {
    const bindings = environment as LocalAppBindings;
    return dispatchDocuments(request, bindings, executionContext, createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY), createLocalApp(bindings));
  },
  // A copy running on a computer delivers nothing: its queue runs only design runs (DESIGN-002, decision D8a),
  // and every other command stays unconsumed as before.
  async queue(batch, environment) {
    const bindings = environment as LocalAppBindings;
    const runtime = createAppServices(createLocalPlatform(bindings, bindings.SESSION_SIGNING_KEY)).lifecycleRuntime;
    await consumeLifecycleQueue(batch as unknown as LifecycleQueueBatch, runtime, designCommandKinds);
  },
} satisfies ExportedHandler<LocalAppBindings>;

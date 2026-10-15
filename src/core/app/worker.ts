import { runScheduled } from './scheduled';
import { dispatchDocuments } from './document-dispatch';
import { createApp, createAppServices } from './app';
import type { AppBindings } from '@/core/shared/platform';
import { createProductionPlatform } from '@/core/platform/runtime';
import { loadSenderSettings } from '@/core/features/settings/sender-persistence';
import { loadLinkHosts } from '@/core/features/settings/link-hosts';
import { staticAssetResponse } from '@/base/static-assets';
import { acknowledgeHealthProbe } from '@/core/features/health/queue-probe';
import { consumeLifecycleQueue, type LifecycleQueueBatch } from '@/core/features/lifecycle';

async function lifecycleRuntime(environment: AppBindings) {
  const platform = createProductionPlatform(environment);
  await loadSenderSettings(platform);
  await loadLinkHosts(platform);
  return createAppServices(platform).lifecycleRuntime;
}

export default {
  async fetch(request, environment, executionContext) {
    // Hosted deploys run this Worker before static assets; built files come from env.ASSETS.
    const asset = await staticAssetResponse(request, environment);
    if (asset) return asset;
    const bindings = environment as AppBindings;
    const platform = createProductionPlatform(bindings);
    return dispatchDocuments(request, bindings, executionContext, platform, createApp(bindings, platform));
  },
  async queue(batch, environment) {
    const messages = (batch as unknown as LifecycleQueueBatch).messages.filter(message => !acknowledgeHealthProbe(message));
    if (!messages.length) return;
    if (environment.MANGO_RESTORE_MODE === '1') throw new Error('Mango restore maintenance is active; retry the queue later.');
    return consumeLifecycleQueue({ messages }, await lifecycleRuntime(environment as AppBindings));
  },
  scheduled(controller, environment, executionContext) {
    executionContext.waitUntil(runScheduled(controller, environment, lifecycleRuntime));
  },
} satisfies ExportedHandler<AppBindings>;

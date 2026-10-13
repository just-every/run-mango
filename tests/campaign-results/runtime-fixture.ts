import { test as base, type PlaywrightTestArgs, type PlaywrightWorkerArgs, type TestInfo } from '@playwright/test';
import { authoringRuntime } from '../campaign-authoring/browser-runtime.mjs';

// One compatible Vite/browser worker for these files. Each test still gets new
// browser contexts and the existing explicit campaign seed/reset actions.
export let runtime: Awaited<ReturnType<typeof authoringRuntime>>;
export const test = base.extend<{}, { resultsRuntime: typeof runtime }>({
  resultsRuntime: [async ({}, use) => {
    runtime = await authoringRuntime({ suite: 'campaign-results', fixtureWorker: 'tests/campaign-results/worker.ts', startupTimeout: 90000 });
    try { await use(runtime); } finally { await runtime.close(); }
  }, { scope: 'worker', auto: true }],
});
export const contract = (id: string, title: string, body: (args: PlaywrightTestArgs & PlaywrightWorkerArgs, info: TestInfo) => Promise<void>) => test(`[${id}] ${title}`, body);

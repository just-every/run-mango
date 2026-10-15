import { withDemo } from './vendor/base/demo/index.mjs';
import { createWorker } from './core/app/worker';
import { createWorkerPlatform } from './core/platform/worker-runtime';
import { seedDemo } from './demo';

export default withDemo(createWorker(createWorkerPlatform), { seed: seedDemo });

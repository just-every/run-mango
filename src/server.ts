import { withDemo } from './modules/demo/index.mjs';
import worker from './core/app/worker';
import { seedDemo } from './demo';

export default withDemo(worker, { seed: seedDemo });

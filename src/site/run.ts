import type { RunData } from '@/base/run-site';
import { runPricing } from '../base/run-pricing';

/** Every string and command the run site's Run page (run-mango.com/run) shows. */
export const run: RunData = {
  name: 'Mango',
  repository: 'https://github.com/just-every/run-mango',
  clone: 'npx -y @runeditrun/rer dev just-every/run-mango',
  licence: 'MIT',
  docs: true,
  paths: { product: 'mango' },
  pricing: runPricing,
};

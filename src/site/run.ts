import type { RunData } from '@/base/run-site';
import { sourceUrl } from '../core/features/site/links';
import { runPricing } from '../base/run-pricing';

/** Every string and command the run site's Run page (run-mango.com/run) shows. */
export const run: RunData = {
  name: 'Mango',
  repository: sourceUrl,
  clone: 'npx -y @runeditrun/rer dev just-every/run-mango',
  licence: 'MIT',
  docs: true,
  paths: { product: 'mango' },
  pricing: runPricing,
};

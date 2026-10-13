import { readProductionConfig } from '../src/core/platform/config.ts';

// Execute the production parser itself. Do not duplicate it or inspect credential files.
// The shared inspector suppresses parser errors and never serializes the result.
export function validateConfiguration(env) {
  readProductionConfig(env);
  if (!/^[a-z0-9-]+$/.test(env.MANGO_DEPLOY_ENV ?? '')) {
    throw new Error('Explicit deployment environment required.');
  }
}

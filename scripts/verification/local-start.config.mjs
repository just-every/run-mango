import { fileURLToPath } from 'node:url';
import config from '../../tests/local-start/config.js';

// Preserve the native journey settings, excluding only the fresh dependency
// installation/README clone file, which the slow tier runs with its own config.
export default { ...config, testDir: fileURLToPath(new URL('../../tests/local-start', import.meta.url)),
  testIgnore: ['**/local.journey.ts'] };

import { evidenceDirectory } from './tests/support/artifacts.mjs';
import { defineConfig } from '@playwright/test';

import { testPort } from './tests/support/free-port.mjs';
const port = await testPort('PLAYWRIGHT_PORT');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  grepInvert: /@release/,
  // tests/docs holds node:test files, run by `pnpm test:docs`.
  testIgnore: '**/tests/docs/**',
  outputDir: evidenceDirectory('main'),
  fullyParallel: true,
  workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'off',
  },
  webServer: {
    command: 'exec node tests/support/start-fixture-runtime.mjs',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 15000 },
    env: { MANGO_FIXTURE_PORT: String(port) },
    url: `${baseURL}/health`,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === '1' && !process.env.CI,
    timeout: 120_000,
  },
});

import { evidenceDirectory } from './tests/support/artifacts.mjs';
import { defineConfig } from '@playwright/test';

import { fixtureServer } from './tests/support/fixture-server.mjs';
const { baseURL, webServer } = await fixtureServer();

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
  webServer,
});

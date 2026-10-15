import { evidenceDirectory } from './tests/support/artifacts.mjs';
import { defineConfig } from '@playwright/test';

import { fixtureServer } from './tests/support/fixture-server.mjs';
const { baseURL, webServer } = await fixtureServer();

export default defineConfig({
  testDir: './tests',
  outputDir: evidenceDirectory('main'),
  fullyParallel: true,
  workers: process.env.PLAYWRIGHT_WORKERS ? Number(process.env.PLAYWRIGHT_WORKERS) : 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'off',
  },
  webServer,
});

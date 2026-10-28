import {launchOptions} from '../support/browser.mjs';
import { evidenceDirectory } from '../support/artifacts.mjs';
import { defineConfig } from '@playwright/test';

import { testPort } from '../support/free-port.mjs';
const port = await testPort('PLAYWRIGHT_PORT');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: '.',
  testMatch: '*.journeys.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  outputDir: evidenceDirectory('newsletter-ui'),
  use: {
    launchOptions,
    baseURL,
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  webServer: {
    command: 'exec node tests/support/start-fixture-runtime.mjs',
    stdout: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 15000 },
    url: `${baseURL}/health`,
    cwd: new URL('../..', import.meta.url).pathname,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { MANGO_FIXTURE_PORT: String(port), MANGO_FIXTURE_TURNSTILE: '1' },
  },
});

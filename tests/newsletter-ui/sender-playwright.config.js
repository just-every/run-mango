import { evidenceDirectory } from '../support/artifacts.mjs';
import { defineConfig } from '@playwright/test';

import { testPort } from '../support/free-port.mjs';
const port = await testPort('MANGO_UI_SENDER_PORT');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: '.',
  testMatch: 'sender-disclosure.isolated.ts',
  workers: 1,
  retries: 0,
  timeout: 120_000,
  reporter: 'list',
  outputDir: evidenceDirectory('sender-disclosure'),
  use: { baseURL, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'off' },
  webServer: {
    command: 'exec node tests/support/start-fixture-runtime.mjs',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 15000 },
    url: `${baseURL}/health`,
    cwd: new URL('../..', import.meta.url).pathname,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { MANGO_FIXTURE_PORT: String(port) },
  },
});

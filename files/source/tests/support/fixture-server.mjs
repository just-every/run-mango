import { testPort } from './free-port.mjs';

// Both the main suite and focused authoring suite use one real Vite/Worker
// server. Individual scenarios retain their own database where needed.
export async function fixtureServer() {
  const port = await testPort('PLAYWRIGHT_PORT');
  const baseURL = `http://127.0.0.1:${port}`;
  return {
    baseURL,
    webServer: {
      command: 'exec node tests/support/start-fixture-runtime.mjs',
      gracefulShutdown: { signal: 'SIGTERM', timeout: 15000 },
      env: { MANGO_FIXTURE_PORT: String(port) },
      url: `${baseURL}/health`,
      reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === '1' && !process.env.CI,
      timeout: 120_000,
    },
  };
}

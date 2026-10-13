import { evidenceDirectory } from '../support/artifacts.mjs';
import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ensureLocalBootstrapToken } from '../../tests/support/bootstrap-token.mjs';

const destination = evidenceDirectory('sender-settings', process.env.SETTINGS_CAPTURE_DIR);
execFileSync('git', ['diff', '--exit-code', 'HEAD'], { stdio: 'pipe' });
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const baseURL = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT}`;
const response = await fetch(`${baseURL}/api/_local/bootstrap`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Mango-Local-Bootstrap-Token': await ensureLocalBootstrapToken() },
  body: JSON.stringify({ testSession: true }),
});
if (!response.ok) throw new Error(`Native bootstrap failed: ${response.status}`);
const { session } = await response.json();
const browser = await chromium.launch({ headless: true });
const captures = [];
try {
  await mkdir(destination, { recursive: true });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1100 } });
    try {
      await context.addCookies([{ name: 'operator_session_local', value: session.token, url: baseURL }]);
      const page = await context.newPage();
      await page.goto(`${baseURL}/app/settings`);
      await expect(page.getByRole('heading', { name: 'Sender check unavailable' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Add operator' })).toBeEnabled();
      await page.evaluate(() => document.fonts.ready);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      if (scrollWidth > width) throw new Error(`Settings overflow: ${scrollWidth} > ${width}`);
      const file = `settings-${width}.jpg`;
      await page.screenshot({ path: join(destination, file), type: 'jpeg', quality: 85, fullPage: true });
      captures.push({ file, width, scrollWidth, url: '/app/settings', state: 'native local sender unavailable; persisted local operator' });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
await writeFile(join(destination, 'manifest.json'), JSON.stringify({ sha, capturedAt: new Date().toISOString(), runtime: 'native Vite Cloudflare Worker + local D1, no synthetic review or external provider calls', captures }, null, 2));
console.log(JSON.stringify({ sha, destination, captures }));

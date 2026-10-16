import type { Page } from '@playwright/test';

// Server snapshots can paint controls before their React handlers are attached.
// Interaction journeys wait for the document's existing hydration signal.
export async function openPage(page: Page, ...args: Parameters<Page['goto']>) {
  const response = await page.goto(...args);
  await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
  return response;
}

export async function reloadPage(page: Page) {
  const response = await page.reload();
  await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
  return response;
}

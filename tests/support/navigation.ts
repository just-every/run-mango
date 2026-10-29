import { expect, type Page } from '@playwright/test';

// Server snapshots can paint controls before their React handlers are attached.
// Interaction journeys wait for the document's existing hydration signal.
export async function hydrated(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
}

export async function openPage(page: Page, ...args: Parameters<Page['goto']>) {
  const response = await page.goto(...args);
  await hydrated(page);
  return response;
}

export async function reloadPage(page: Page) {
  const response = await page.reload();
  await hydrated(page);
  return response;
}

// An empty campaigns list opens its starters at once; a list with campaigns opens them from New campaign.
export async function openCampaignStarters(page: Page) {
  const starters = page.getByRole('region', {name: 'Choose a campaign starter'});
  const button = page.getByRole('button', {name: 'New campaign', exact: true});
  await expect(button.or(starters)).toBeVisible();
  if (await button.count()) await button.click();
  await expect(starters).toBeVisible();
}

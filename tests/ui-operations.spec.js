import { expect, test } from '@playwright/test';
import { localBootstrapToken } from './local-bootstrap.js';

async function signInAsLocalOperator(page, request) {
  const response = await request.post('/api/_local/bootstrap', {
    headers: { 'X-Mango-Local-Bootstrap-Token': await localBootstrapToken() },
    data: { testSession: true },
  });
  await expect(response).toBeOK();
  const { session } = await response.json();
  await page.context().addCookies([
    { name: 'operator_session_local', value: session.token, url: new URL(response.url()).origin },
  ]);
}

test('operator supporting surfaces use semantic tables and explicit capability states', async ({ page, request }) => {
  await signInAsLocalOperator(page, request);

  await page.goto('/app/audience');
  await expect(page.getByRole('heading', { name: 'Consent stays visible at every decision.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Audience' })).toHaveAttribute('aria-current', 'page');
  const audienceTable = page.getByRole('table', { name: 'Saved contact ledger' });
  await expect(audienceTable.getByRole('columnheader', { name: 'Email consent' })).toBeVisible();
  await expect(audienceTable.getByRole('columnheader', { name: 'SMS consent' })).toBeVisible();
  await page.locator('a[href="/app/audience/contact_alex_v4"]').click();
  await expect(page.getByRole('heading', { name: 'Alex Morgan' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recorded contact activity' })).toBeVisible();

  await page.goto('/app/insights');
  await expect(page.getByRole('heading', { name: 'Observed outcomes, never invented forecasts.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'There is nothing to graph yet.' })).toBeVisible();

  await page.goto('/app/store');
  await expect(page.getByRole('heading', { name: 'Sending and service connections' })).toBeVisible();
  await expect(page.locator('.provider-status').getByText('No commerce adapter is configured.', { exact: false })).toBeVisible();

  await page.route('**/api/store', (route) => route.fulfill({ json: { providers: [], sourceSyncs: [], sourceCapabilities: [], syncRuns: [] } }));
  await page.goto('/app/store');
  await expect(page.getByText('No commerce source types have been declared by the server.')).toBeVisible();
  await expect(page.getByText('No provider capabilities have been declared by the server. Sending and proposal generation are unavailable.')).toBeVisible();
  await page.unroute('**/api/store');

  await page.route('**/api/settings/providers', (route) => route.fulfill({ json: { providers: [], sourceSyncs: [], sourceCapabilities: [], syncRuns: [] } }));
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', { name: 'No source connection is declared.' })).toBeVisible();
  await expect(page.getByText('There are no roles.')).toBeVisible();
});

test('a 401 resource load redirects an established operator session to the session-ended sign-in state', async ({ page, request }) => {
  await signInAsLocalOperator(page, request);
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Nothing sends until you approve it.' })).toBeVisible();
  await page.waitForFunction(() => document.documentElement.dataset.mangoHydrated === 'true');
  await page.context().clearCookies();
  await page.getByRole('link', { name: 'Audience', exact: true }).click();
  await expect(page).toHaveURL(/\/signin\?reason=session-ended/);
  await expect(page.getByRole('heading', { name: 'Your session has ended.' })).toBeVisible();
});

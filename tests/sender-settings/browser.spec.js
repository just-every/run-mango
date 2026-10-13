import { invitationRuntime, cookie } from '../../operations/fixtures/invitation-runtime.mjs';
import { expect, test } from '@playwright/test';
import { localBootstrapToken } from '../local-bootstrap.js';

async function signIn(page, request, baseURL) {
  const response = await request.post('/api/_local/bootstrap', {
    headers: { 'X-Mango-Local-Bootstrap-Token': await localBootstrapToken() },
    data: { testSession: true },
  });
  expect(response.ok()).toBeTruthy();
  const { session } = await response.json();
  await page.context().addCookies([{ name: 'operator_session_local', value: session.token, url: baseURL }]);
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', { name: 'Operators', exact: true })).toBeVisible();
}

test('native Settings supports add, duplicate, cancel and remove through real routes', async ({ page, request, baseURL }) => {
  const f=await invitationRuntime();
  try {
    await f.bootstrap();
    expect((await f.call('/auth/magic-link',{method:'POST',body:{email:'owner@example.test'}})).status).toBe(202);
    const confirmedOwner=await f.call('/auth/confirm',{method:'POST',body:{token:await f.token()}});
    expect(confirmedOwner.status).toBe(303);const session=cookie(confirmedOwner);
    await page.route(/\/api\/operators(?:\/[^?]+)?$/,async route=>{
      const request=route.request();const path=new URL(request.url()).pathname;
      const response=await f.call(path,{method:request.method(),cookie:session,body:request.postData()?JSON.parse(request.postData()):undefined});
      await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
    });
    await signIn(page, request, baseURL);
    await expect(page.getByRole('heading', { name: 'Sender check unavailable' })).toBeVisible();
    const email = `settings-${Date.now()}@example.test`;
    await page.getByLabel('Operator email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Add operator' }).click();
    await expect(page.locator('.action-notice[role="status"]').filter({ hasText: 'An invitation email has been sent' })).toBeVisible();
    await page.reload();
    const cancellation = page.getByRole('button', { name: `Remove ${email}`, exact: true });
    await expect(cancellation).toBeVisible();
    await page.getByLabel('Operator email', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Add operator' }).click();
    await expect(page.locator('.action-notice[role="status"]').filter({ hasText: 'already has access' })).toBeVisible();
    await expect(cancellation).toHaveCount(1);
    await cancellation.click();
    await page.getByRole('button', { name: 'Keep operator' }).click();
    await expect(cancellation).toBeVisible();
    await cancellation.click();
    await page.getByRole('button', { name: 'Confirm removal' }).click();
    await expect(page.locator('.action-notice[role="status"]').filter({ hasText: 'Invitation cancelled' })).toBeVisible();
    await page.reload();await expect(cancellation).toHaveCount(0);
    const activeEmail=`active-${Date.now()}@example.test`;
    await page.getByLabel('Operator email',{exact:true}).fill(activeEmail);
    await page.getByRole('button',{name:'Add operator'}).click();
    await expect(page.locator('.action-notice[role="status"]').filter({hasText:'An invitation email has been sent'})).toBeVisible();
    expect((await f.call('/auth/confirm',{method:'POST',body:{token:await f.token()}})).status).toBe(303);
    await page.reload();const removal=page.getByRole('button',{name:`Remove ${activeEmail}`,exact:true});
    await expect(removal).toBeVisible();await removal.click();
    await page.getByRole('button',{name:'Confirm removal'}).click();
    await expect(page.locator('.action-notice[role="status"]').filter({hasText:'Their sessions have been revoked'})).toBeVisible();
    await page.reload();await expect(removal).toHaveCount(0);
  } finally {await f.close();}
});

test('operator errors remain actionable and do not expose server payloads', async ({ page, request, baseURL }) => {
  await signIn(page, request, baseURL);
  for (const [status, error, expected] of [
    [400, 'A valid operator email address is required.', 'Enter a valid email address.'],
    [503, 'private-server-detail', 'The change could not be saved.'],
  ]) {
    await page.route('**/api/operators', async (route) => {
      if (route.request().method() === 'POST') await route.fulfill({ status, json: { error } });
      else await route.continue();
    });
    await page.getByLabel('Operator email', { exact: true }).fill('valid@example.test');
    await page.getByRole('button', { name: 'Add operator' }).click();
    await expect(page.locator('.inline-error[role="alert"]')).toContainText(expected);
    await expect(page.getByRole('button', { name: 'Add operator' })).toBeEnabled();
    await expect(page.getByText('private-server-detail')).toHaveCount(0);
    await page.unroute('**/api/operators');
  }
});

for (const width of [1440, 390]) {
  test(`Settings remains usable at ${width}px`, async ({ page, request, baseURL }) => {
    await page.setViewportSize({ width, height: 1000 });
    await signIn(page, request, baseURL);
    await expect(page.getByRole('heading', { name: 'Sender check unavailable' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: 'Add operator' })).toBeVisible();
  });
}

test('a mutation with an expired session redirects to sign-in', async ({ page, request, baseURL }) => {
  await signIn(page, request, baseURL);
  await page.context().clearCookies();
  await page.getByLabel('Operator email', { exact: true }).fill('valid@example.test');
  await page.getByRole('button', { name: 'Add operator' }).click();
  await expect(page).toHaveURL(/\/signin\?reason=session-ended/);
});

test('initial-operator protection and self-removal warning are visible before any mutation', async ({ page, request, baseURL }) => {
  await signIn(page, request, baseURL);
  const { operator: current } = await (await page.request.get('/api/operator')).json();
  await page.route('**/api/operators', (route) => route.fulfill({ json: { operators: [
    current,
    { id: 'test-setup-owner', displayName: 'Setup owner', email: 'setup@example.test', isInitial: true },
  ] } }));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove setup@example.test', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: `Remove ${current.email}`, exact: true }).click();
  await expect(page.getByText('You will lose access and be signed out immediately.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Keep operator' }).click();
  expect((await page.request.get('/api/operator')).status()).toBe(200);
});

test('sender request failure can be refreshed without hiding operator controls', async ({ page, request, baseURL }) => {
  await page.route('**/api/settings/sender', (route) => route.fulfill({ status: 503, json: { error: 'private-provider-error' } }));
  await signIn(page, request, baseURL);
  await expect(page.locator('.inline-error[role="alert"]')).toContainText('Unable to load sender settings. Try again.');
  await expect(page.getByRole('button', { name: 'Add operator' })).toBeEnabled();
  await expect(page.getByText('private-provider-error')).toHaveCount(0);
  await page.unroute('**/api/settings/sender');
  await page.getByRole('button', { name: 'Check again' }).click();
  await expect(page.getByRole('heading', { name: 'Sender check unavailable' })).toBeVisible();
});

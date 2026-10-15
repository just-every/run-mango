import { expect, test } from '@playwright/test';
import { signInAsLocalOperator } from './browser-checks';

test('saved sender disclosure is current and stale consent cannot create evidence', async ({ page, request }, testInfo) => {
  await signInAsLocalOperator(page, request);
  const baseURL = new URL(testInfo.project.use.baseURL as string);
  const cookie = (await page.context().cookies()).find((entry) => entry.name === 'operator_session_local');
  expect(cookie?.value).toBeTruthy();
  const headers = { Cookie: `operator_session_local=${cookie?.value}` };
  const identity = {
    displayName: `Mango newsletter ${Date.now()}`,
    fromEmail: 'newsletter@example.test',
    replyToEmail: 'reply@example.test',
    physicalAddress: '1 Audience Way, Sydney NSW 2000 Australia',
  };
  const saveSender = (displayName: string) => request.put('/api/settings/sender', {
    headers: { ...headers, Origin: baseURL.origin },
    data: { ...identity, displayName },
  });
  const firstSender = identity.displayName;
  const latestSender = `${firstSender} updated`;
  await expect(await saveSender(firstSender)).toBeOK();

  await page.setViewportSize({ width: 1440, height: 1000 });
  const firstConsent = `I agree to receive email newsletters from ${firstSender}. I can unsubscribe at any time.`;
  const response = await page.goto('/subscribe');
  expect(response?.ok()).toBe(true);
  const serverHtml = await response?.text();
  expect(serverHtml).toContain(firstConsent);
  expect(serverHtml?.match(/<input[^>]*name="email"[^>]*>/)?.[0]).toContain('disabled');
  await expect(page.getByRole('checkbox', { name: firstConsent })).toBeVisible();

  await expect(await saveSender(latestSender)).toBeOK();
  const staleEmail = `ui-stale-consent-${Date.now()}@example.test`;
  const [staleResponse] = await Promise.all([
    page.waitForResponse((result) => result.request().method() === 'POST' && new URL(result.url()).pathname === '/subscribe'),
    (async () => {
      await page.getByLabel('Email address').fill(staleEmail);
      await page.getByRole('checkbox', { name: firstConsent }).check();
      await expect(page.getByLabel('Email address')).toHaveValue(staleEmail);
      await page.getByRole('button', { name: 'Request confirmation' }).click();
    })(),
  ]);
  expect(staleResponse.status()).toBe(409);
  expect((await staleResponse.json()).error).toBe('signup_disclosure_changed');
  await expect(page.getByRole('alert')).toContainText('newsletter details changed');
  await expect(page.getByRole('status')).toHaveCount(0);
  const staleList = await request.get('/api/audience', { headers });
  await expect(staleList).toBeOK();
  expect(JSON.stringify(await staleList.json())).not.toContain(staleEmail);

  await page.reload();
  const latestConsent = `I agree to receive email newsletters from ${latestSender}. I can unsubscribe at any time.`;
  await expect(page.getByRole('checkbox', { name: latestConsent })).toBeVisible();
  const capturedEmail = `ui-consent-evidence-${Date.now()}@example.test`;
  const [captureResponse] = await Promise.all([
    page.waitForResponse((result) => result.request().method() === 'POST' && new URL(result.url()).pathname === '/subscribe'),
    (async () => {
      await page.getByLabel('Email address').fill(capturedEmail);
      await page.getByRole('checkbox', { name: latestConsent }).check();
      await expect(page.getByLabel('Email address')).toHaveValue(capturedEmail);
      await page.getByRole('button', { name: 'Request confirmation' }).click();
    })(),
  ]);
  // Locally the confirmation lands in the development outbox, so signup succeeds.
  expect(captureResponse.status()).toBe(202);
  expect((await captureResponse.json()).status).toBe('confirmation-required');
  await expect(page.getByText('Request received')).toBeVisible();

  const contactsResponse = await request.get('/api/audience', { headers });
  await expect(contactsResponse).toBeOK();
  const contactsData = await contactsResponse.json();
  const contact = contactsData.contacts.find((entry: { email: string }) => entry.email === capturedEmail);
  expect(contact?.id).toBeTruthy();
  expect(contact.emailStatus).toBe('pending');
  const detailResponse = await request.get(`/api/contacts/${encodeURIComponent(contact.id)}`, { headers });
  await expect(detailResponse).toBeOK();
  const detail = await detailResponse.json();
  const evidence = detail.consent.find((entry: { captureSource: string }) => entry.captureSource === new URL('/subscribe', baseURL).toString());
  expect(evidence).toMatchObject({
    brandOrLegalSender: latestSender,
    captureMethod: 'hosted-signup-form',
    consentText: latestConsent,
    consentVersion: 'newsletter-signup-v1',
    confirmationRequired: true,
    confirmedAt: null,
  });
  expect(evidence.captureIp).toBeTruthy();

});

import {createServer} from 'node:http';
import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import { signInAsLocalOperator } from './browser-checks';

function csv(headers: string[], rows: string[][]) {
  return [headers, ...rows].map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(',')).join('\r\n');
}

function makeImportFiles(runId: string) {
  const time = '2026-10-06 12:00:00';
  const confirmed = '2026-10-06 12:01:00';
  const subscribedRows = Array.from({ length: 10 }, (_, index) => [
    `ui-${runId}-${index + 1}@example.test`, `Audience ${index + 1}`, 'Journey', time, '192.0.2.10', index === 3 ? '' : confirmed, '192.0.2.11',
    index === 1 ? 'unsubscribed' : index === 2 ? 'cleaned' : 'subscribed',
  ]);
  return [
    {
      name: 'subscribed-export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv(['Email Address', 'First Name', 'Last Name', 'Optin Time', 'Optin IP', 'Confirm Time', 'Confirm IP', 'Email Marketing Status'], subscribedRows)),
    },
    {
      name: 'unsubscribed-export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv(['Email Address', 'Email Marketing Status', 'First Name'], [[`ui-${runId}-unsub@example.test`, 'unsubscribed', 'Opted Out']])),
    },
    {
      name: 'cleaned-export.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv(['Email Address', 'Email Marketing Status', 'First Name'], [[`ui-${runId}-cleaned@example.test`, 'cleaned', 'Suppressed']])),
    },
  ];
}

test('operator imports reviewed CSVs to completion without further clicks, undoes them, and exports the saved ledger at desktop and mobile widths', async ({ page, request }, testInfo) => {
  await signInAsLocalOperator(page, request);
  const runId = `${Date.now()}`;
  const importedEmail = `ui-${runId}-1@example.test`;
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/app/audience');
  await expect(page.getByRole('heading', { name: /consent stays visible/i })).toBeVisible();
  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'operator_session_local');
  expect(sessionCookie?.value).toBeTruthy();
  const actualSignup = await request.get('/api/audience/signup', {
    headers: { Cookie: `operator_session_local=${sessionCookie?.value}` },
  });
  await expect(actualSignup).toBeOK();
  const signupData = await actualSignup.json();
  const publicUrl = new URL(signupData.url);
  expect(publicUrl.origin).toBe(new URL(testInfo.project.use.baseURL as string).origin);
  await expect(page.getByRole('link', { name: 'Open hosted form' })).toHaveAttribute('href', signupData.url);
  await expect(page.getByLabel('Hosted signup iframe embed snippet')).toHaveValue(signupData.embed);
  expect(signupData.embed).toContain(signupData.url);

  await page.getByRole('link', { name: 'Import contacts' }).click();
  await expect(page.getByRole('heading', { name: 'Import contacts' })).toBeVisible();
  await page.getByLabel('Choose CSV files').setInputFiles(makeImportFiles(runId));
  for (const [file, preset] of [
    ['subscribed-export.csv', 'csv-subscribed'],
    ['unsubscribed-export.csv', 'csv-unsubscribed'],
    ['cleaned-export.csv', 'csv-cleaned'],
  ]) {
    await page.getByLabel(`Preset for ${file}`).selectOption(preset);
  }
  await page.getByLabel('Brand or legal sender').fill('Mango local');
  await page.getByLabel('Message category').fill('newsletter');
  await page.getByLabel('Disclosed frequency').fill('Occasional newsletters');
  await page.getByLabel('Destination jurisdiction').fill('Australia');
  await page.getByLabel('Consent version').fill('newsletter-v1');
  await page.getByLabel('Original consent text').fill('I agree to receive occasional newsletter emails from Mango local.');
  const previewResponse = page.waitForResponse((response) => response.request().method() === 'POST'
    && new URL(response.url()).pathname === '/api/audience/import-preview');
  await page.getByRole('button', { name: 'Preview import' }).click();
  const preview = await previewResponse;
  const previewData = await preview.json();
  expect(preview.status(), JSON.stringify(previewData)).toBe(200);
  expect(previewData.fingerprint).toBeTruthy();
  expect(previewData.columns[0].mapping.status).toBe('Email Marketing Status');
  expect(previewData.counts.created).toBeGreaterThanOrEqual(10);
  expect(previewData.counts.unsubscribed).toBeGreaterThanOrEqual(2);
  expect(previewData.counts.suppressed).toBeGreaterThanOrEqual(2);
  expect(previewData.rows.find((row: { email: string }) => row.email === `ui-${runId}-2@example.test`)?.status).toBe('unsubscribed');
  expect(previewData.rows.find((row: { email: string }) => row.email === `ui-${runId}-3@example.test`)?.status).toBe('suppressed');
  expect(previewData.rows.find((row: { email: string }) => row.email === importedEmail)?.status).toBe('subscribed');
  const missingEvidenceRow = previewData.rows.find((row: { email: string }) => row.email === `ui-${runId}-4@example.test`);
  expect(missingEvidenceRow?.status).toBe('non-subscribed');
  expect(missingEvidenceRow?.warnings).toContain('Original consent scope, opt-in time and confirmation time are required before this contact can receive marketing.');
  await expect(page.getByRole('heading', { name: 'Preview totals' })).toBeVisible();
  await expect(page.getByLabel('Email marketing status in subscribed-export.csv')).toHaveValue('Email Marketing Status');
  await page.getByLabel('First Name in subscribed-export.csv').selectOption('');
  await expect(page.getByRole('button', { name: 'Start import' })).toBeDisabled();
  const unmappedResponse = page.waitForResponse((response) => response.request().method() === 'POST'
    && new URL(response.url()).pathname === '/api/audience/import-preview');
  await page.getByRole('button', { name: 'Preview import' }).click();
  expect((await (await unmappedResponse).json()).columns[0].mapping.first_name).toBe('');
  await expect(page.getByLabel('First Name in subscribed-export.csv')).toHaveValue('');
  await page.getByLabel('First Name in subscribed-export.csv').selectOption('First Name');
  await page.getByRole('button', { name: 'Preview import' }).click();
  await expect(page.getByRole('button', { name: 'Start import' })).toBeEnabled();
  await expect(page.getByText(/Original consent scope, opt-in time and confirmation time/).first()).toBeVisible();
  await expect(page.getByText('Unsubscribed', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Suppressed', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mapped source columns' })).toBeVisible();
  await expect(page.locator('.audience-import-mapped-review').getByText('Optin Time', { exact: true }).first()).toBeVisible();
  await expect(page.locator('.audience-import-mapped-review').getByText('Email Marketing Status', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(importedEmail)).toBeVisible();
  await expect(page.getByText('Import complete', { exact: false })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });

  const startResponse = page.waitForResponse((response) => response.request().method() === 'POST'
    && new URL(response.url()).pathname === '/api/audience/imports');
  await page.getByRole('button', { name: 'Start import' }).click();
  const started = await startResponse;
  const startedData = await started.json();
  expect(started.status(), JSON.stringify(startedData)).toBe(200);
  const { job } = startedData;
  expect(job.id).toBeTruthy();
  // Journeys share the native installation and its saved import history.
  // Follow the job accepted by this request through every subsequent action.
  const importJob = page.locator('.audience-import-job').filter({ has: page.getByText(job.id, { exact: true }) });
  // The first step writes 10 of the 12 rows; the page keeps writing until the import completes.
  expect(job.checkpoint).toBeLessThan(job.total);
  await expect(importJob).toHaveCount(1);
  await expect(importJob).toContainText('completed');
  await expect(importJob).toContainText(/12 of 12 rows/);
  await expect(importJob.getByRole('button', { name: 'Resume import' })).toHaveCount(0);

  const audienceCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'operator_session_local');
  const audienceResponse = await request.get('/api/audience', { headers: { Cookie: `operator_session_local=${audienceCookie?.value}` } });
  await expect(audienceResponse).toBeOK();
  const audience = await audienceResponse.json();
  const importedContact = audience.contacts.find((contact: { email: string }) => contact.email === importedEmail);
  expect(importedContact?.id).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/app/audience/${encodeURIComponent(importedContact.id)}`);
  await expect(page.getByRole('heading', { name: 'Consent evidence' })).toBeVisible();
  await expect(page.getByText('I agree to receive occasional newsletter emails from Mango local.')).toBeVisible();
  await expect(page.getByText('192.0.2.10').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Import source observations' })).toBeVisible();
  await expect(page.getByText(/subscribed-export\.csv · row 2/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Consent evidence' }).getByText('CSV import: subscribed-export.csv')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Import source observations' }).getByText('CSV import: subscribed-export.csv')).toBeVisible();
  await expect(page.getByText('Confirmed', { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });

  await page.reload();
  await expect(page.getByText('I agree to receive occasional newsletter emails from Mango local.')).toBeVisible();
  await expect(page.getByText(/subscribed-export\.csv · row 2/)).toBeVisible();
  await page.goto('/app/audience/import');
  await expect(importJob).toContainText('completed');
  await importJob.getByRole('button', { name: 'Undo import' }).click();
  await expect(importJob.getByRole('group', { name: /Confirm undo/ })).toBeVisible();
  await importJob.getByRole('button', { name: 'Confirm undo' }).click();
  await expect(importJob).toContainText('undoing');
  await expect(importJob.getByRole('button', { name: 'Undo import' })).toHaveCount(0);
  await importJob.getByRole('button', { name: 'Continue undo' }).click();
  await expect(importJob).toContainText('undone');

  for (const width of [390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto('/app/audience');
    await expect(page.getByRole('heading', { name: /consent stays visible/i })).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download contacts CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('audience.csv');
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const content = await readFile(downloadPath!, 'utf8');
    expect(content.split('\r\n')[0]).toContain('ledger_json');
    expect(content).not.toContain(importedEmail);
  }
});

test('the published embed loads the configured public form at desktop and mobile widths', async ({ page, request }, testInfo) => {
  await signInAsLocalOperator(page, request);
  const session = (await page.context().cookies()).find((cookie) => cookie.name === 'operator_session_local');
  const response = await request.get('/api/audience/signup', { headers: { Cookie: `operator_session_local=${session?.value}` } });
  await expect(response).toBeOK();
  const signup = await response.json();
  // Serve the owner's embed host through the real network. An intercepted
  // internet response has no loopback address classification in Chrome.
  const host = createServer((_request, response) => {
    response.setHeader('Content-Type', 'text/html');
    response.end(`<!doctype html><html lang="en"><head><title>Newsletter embed</title></head><body><main>${signup.embed}</main></body></html>`);
  });
  try {
    await new Promise<void>(resolve => host.listen(0, '127.0.0.1', resolve));
    await page.goto(`http://127.0.0.1:${(host.address() as {port: number}).port}/`);
    const frame = page.frameLocator('iframe[title="Subscribe to the newsletter"]');
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await expect(frame.getByRole('heading', { name: 'Get the newsletter' })).toBeVisible();
      await expect(frame.getByRole('checkbox', { name: signup.consentText })).toBeVisible();
      expect(await frame.locator('html').evaluate(node => node.scrollWidth <= window.innerWidth)).toBe(true);
    }
  } finally {
    host.closeAllConnections();
    await new Promise<void>(resolve => host.close(() => resolve()));
  }
});

test('public form renders the configured disclosure and acknowledges only after the server accepts a request', async ({ page, request }, testInfo) => {
  await signInAsLocalOperator(page, request);
  const session = (await page.context().cookies()).find((cookie) => cookie.name === 'operator_session_local');
  expect(session?.value).toBeTruthy();
  // Public capture requires a complete saved sender even for a honeypot acknowledgement.
  await expect(await request.put('/api/settings/sender', {
    headers: { Cookie: `operator_session_local=${session!.value}`, Origin: new URL(testInfo.project.use.baseURL as string).origin },
    data: {
      displayName: 'Mango local',
      fromEmail: 'newsletter@example.test',
      replyToEmail: 'reply@example.test',
      physicalAddress: '1 Audience Way, Sydney NSW 2000 Australia',
    },
  })).toBeOK();
  await page.context().clearCookies();
  expect(await page.context().cookies()).toEqual([]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const infoResponse = await request.get('/subscribe/info');
  await expect(infoResponse).toBeOK();
  const info = await infoResponse.json();
  const response = await page.goto('/subscribe');
  expect(response?.ok()).toBe(true);
  const html = await response?.text();
  expect(html).toContain(info.consentText);
  expect(info.disclosure).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Get the newsletter' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: info.consentText })).not.toBeChecked();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByText('Occasional newsletters')).toBeVisible();
  let release!: () => void, arrived!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const pending = new Promise<void>(resolve => { arrived = resolve; });
  await page.route('**/subscribe', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    arrived();
    await held;
    await route.continue();
  }, { times: 1 });
  const accepted = page.waitForResponse((result) => result.request().method() === 'POST' && new URL(result.url()).pathname === '/subscribe');
  try {
    await page.getByLabel('Email address').fill(`ui-subscribe-${Date.now()}@example.test`);
    await page.getByRole('checkbox', { name: info.consentText }).check();
    await page.locator('#subscribe-website').fill('automation honeypot');
    await page.getByRole('button', { name: 'Request confirmation' }).click();
    await pending;
    await expect(page.getByRole('status')).toHaveCount(0);
  } finally { release(); }
  const apiResponse = await accepted;
  expect(await apiResponse.request().headerValue('cookie')).toBeNull();
  expect(apiResponse.status()).toBe(202);
  expect((await apiResponse.json()).status).toBe('confirmation-required');
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).not.toBeEmpty();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).not.toBeEmpty();
});

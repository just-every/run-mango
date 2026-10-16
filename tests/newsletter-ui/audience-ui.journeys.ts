import { openPage, reloadPage } from '../support/navigation';
import {createServer} from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import {challengeEdge,untouchedForm,storedSignup} from './signup-privacy-support';
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
  await openPage(page, '/app/audience');
  await expect(page.getByRole('heading', { name: /consent stays visible/i })).toBeVisible();
  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name.startsWith('operator_session_local_'));
  expect(sessionCookie?.value).toBeTruthy();
  const actualSignup = await request.get('/api/audience/signup', {
    headers: { Cookie: `${sessionCookie?.name}=${sessionCookie?.value}` },
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
  await page.getByLabel('Message category', { exact: true }).selectOption('newsletter');
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

  const audienceCookie = (await page.context().cookies()).find((cookie) => cookie.name.startsWith('operator_session_local_'));
  const audienceResponse = await request.get('/api/audience', { headers: { Cookie: `${audienceCookie?.name}=${audienceCookie?.value}` } });
  await expect(audienceResponse).toBeOK();
  const audience = await audienceResponse.json();
  const importedContact = audience.contacts.find((contact: { email: string }) => contact.email === importedEmail);
  expect(importedContact?.id).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openPage(page, `/app/audience/${encodeURIComponent(importedContact.id)}`);
  await expect(page.getByRole('heading', { name: 'Consent evidence' })).toBeVisible();
  await expect(page.getByText('I agree to receive occasional newsletter emails from Mango local.')).toBeVisible();
  await expect(page.getByText('192.0.2.10').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Import source observations' })).toBeVisible();
  await expect(page.getByText(/subscribed-export\.csv · row 2/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Consent evidence' }).getByText('CSV import: subscribed-export.csv')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Import source observations' }).getByText('CSV import: subscribed-export.csv')).toBeVisible();
  await expect(page.getByText('Confirmed', { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });

  await reloadPage(page);
  await expect(page.getByText('I agree to receive occasional newsletter emails from Mango local.')).toBeVisible();
  await expect(page.getByText(/subscribed-export\.csv · row 2/)).toBeVisible();
  await openPage(page, '/app/audience/import');
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
    await openPage(page, '/app/audience');
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

    // A removed lossless export must not leave mapping validators on the next source.
    await openPage(page, '/app/audience/import');
    await page.getByLabel('Choose CSV files').setInputFiles({name:'audience.csv',mimeType:'text/csv',buffer:Buffer.from(content)});
    await page.getByLabel('Preset for audience.csv').selectOption('mango');
    const mangoPreview = page.waitForResponse(response => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/api/audience/import-preview');
    await page.getByRole('button', {name:'Preview import',exact:true}).click();
    const mangoResponse = await mangoPreview;
    expect(mangoResponse.status()).toBe(200);
    expect((await mangoResponse.json()).columns[0].mapping).toEqual({});
    await expect(page.getByRole('group', {name:'audience.csv',exact:true})).toBeVisible();
    await page.getByRole('button', {name:'Remove audience.csv',exact:true}).click();
    await expect(page.getByRole('group', {name:'audience.csv',exact:true})).toHaveCount(0);
    const replacementEmail = `ui-replacement-${runId}@example.test`;
    await page.getByLabel('Choose CSV files').setInputFiles({name:'audience.csv',mimeType:'text/csv',buffer:Buffer.from(`Email Address\n${replacementEmail}`)});
    await page.getByLabel('Preset for audience.csv').selectOption('csv-non-subscribed');
    const replacementPreview = page.waitForResponse(response => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/api/audience/import-preview');
    await page.getByRole('button', {name:'Preview import',exact:true}).click();
    const replacementResponse = await replacementPreview;
    expect(replacementResponse.status()).toBe(200);
    expect((await replacementResponse.json()).rows).toEqual([expect.objectContaining({email:replacementEmail,status:'non-subscribed'})]);
  }
});

test('the published embed enforces persisted exact origins and gates challenge traffic on trusted interaction', async ({ page, request, browser }, testInfo) => {
  await signInAsLocalOperator(page, request);
  const session = (await page.context().cookies()).find(cookie => cookie.name.startsWith('operator_session_local_'))!;
  const appOrigin = new URL(testInfo.project.use.baseURL as string).origin;
  const headers = {Cookie:`${session.name}=${session.value}`,Origin:appOrigin};
  const response = await request.get('/api/audience/signup',{headers});
  await expect(response).toBeOK();
  const signup = await response.json();
  expect(signup.turnstileSiteKey).toBe('fixture-public-site');
  const signupPaths=['/subscribe','/subscribe/','/Subscribe','/%73ubscribe','/%53ubscribe/'];
  let embed=signup.embed;
  const host = createServer((_request, response) => {
    response.setHeader('Content-Type','text/html');
    response.end(`<!doctype html><html lang="en"><head><title>Newsletter embed</title></head><body><main>${embed}</main></body></html>`);
  });
  let allowedOrigin='';
  const hostile = createServer((incoming, response) => {
    response.setHeader('Content-Type','text/html');
    response.end(incoming.url==='/nested' ? `<iframe title="Allowed wrapper" src="${allowedOrigin}"></iframe>` : embed);
  });
  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  const external = await challengeEdge(visitor);
  const denied = async (url:string) => {
    const violation = visitor.waitForEvent('console',{predicate:message=>message.text().includes('frame-ancestors')});
    await visitor.goto(url); await violation;
    expect(visitor.frames().some(frame=>frame.url().startsWith(appOrigin+'/subscribe'))).toBe(false);
    await expect(visitor.locator('iframe').first()).toBeVisible();
    expect(external).toEqual([]);
  };
  try {
    await Promise.all([new Promise<void>(resolve=>host.listen(0,'127.0.0.1',resolve)),new Promise<void>(resolve=>hostile.listen(0,'127.0.0.1',resolve))]);
    allowedOrigin=`http://127.0.0.1:${(host.address() as {port:number}).port}`;
    const hostileOrigin=`http://127.0.0.1:${(hostile.address() as {port:number}).port}`;
    const settings={frequencyDisclosure:signup.frequencyDisclosure,embedOrigins:[]};
    await expect(await request.put('/api/audience/signup',{headers,data:settings})).toBeOK();
    expect((await anonymous.request.put(appOrigin+'/api/audience/signup',{data:{...settings,embedOrigins:[allowedOrigin]}})).status()).toBe(401);
    expect((await request.put('/api/audience/signup',{headers:{...headers,Origin:hostileOrigin},data:{...settings,embedOrigins:[allowedOrigin]}})).status()).toBe(403);
    for(const origin of ['*','https://*.example.com','https://example.com/path','https://owner@example.com','javascript:alert(1)']) {
      expect((await request.put('/api/audience/signup',{headers,data:{...settings,embedOrigins:[origin]}})).status()).toBe(400);
    }
    const documents=[];
    for(const path of signupPaths) {
      const response=await visitor.goto(appOrigin+path+'?from=embed');
      await expect(visitor.getByRole('heading',{name:'Get the newsletter'})).toBeVisible();
      documents.push({requested:path,status:response!.status(),finalPath:new URL(visitor.url()).pathname,query:new URL(visitor.url()).search,csp:response!.headers()['content-security-policy']});
    }
    await writeFile(testInfo.outputPath('signup-alias-documents.json'),JSON.stringify(documents,null,2));
    for(const document of documents) {
      expect(document.status).toBe(200);expect(document.finalPath).toBe('/subscribe');expect(document.query).toBe('?from=embed');
      expect(document.csp).toBe(documents[0].csp);
      expect(document.csp).toContain("frame-ancestors 'none'");expect(document.csp).toContain('https://challenges.cloudflare.com');
    }
    for(const path of signupPaths) {
      embed=signup.embed.replace(appOrigin+'/subscribe',appOrigin+path);
      await denied(allowedOrigin);
      // Empty policy also denies same-origin aliases; top-level stays usable.
      await visitor.goto(appOrigin+path);
      await expect(visitor.getByRole('heading',{name:'Get the newsletter'})).toBeVisible();
      const sameOriginDenied=visitor.waitForEvent('console',{predicate:message=>message.text().includes('frame-ancestors')});
      await visitor.evaluate(path=>{const frame=document.createElement('iframe');frame.src=path;document.body.append(frame);},path);
      await sameOriginDenied;
    }
    await openPage(page, '/app/audience');
    await page.getByLabel('Allowed embed origins').fill(allowedOrigin);
    await page.getByRole('button',{name:'Save signup settings'}).click();
    await expect(page.getByRole('status').filter({hasText:'Signup settings saved'})).toBeVisible();
    await reloadPage(page);
    await expect(page.getByLabel('Allowed embed origins')).toHaveValue(allowedOrigin);
    expect((await (await request.get('/api/audience/signup',{headers})).json()).embedOrigins).toEqual([allowedOrigin]);
    for(const path of signupPaths) {
      embed=signup.embed.replace(appOrigin+'/subscribe',appOrigin+path);
      external.length=0;
      await denied(hostileOrigin);
      await denied(hostileOrigin+'/nested');
      await visitor.goto(allowedOrigin);
      const frame=visitor.frameLocator('iframe[title="Subscribe to the newsletter"]');
      await untouchedForm(visitor,frame,external);
      for(const width of [1440,390]) {
        await visitor.setViewportSize({width,height:width===390?844:1000});
        await expect(frame.getByRole('checkbox',{name:signup.consentText})).toBeVisible();
        expect(await frame.locator('html').evaluate(node=>node.scrollWidth<=window.innerWidth)).toBe(true);
      }
      // Playwright keyboard input is trusted; dispatchEvent above is not.
      await frame.getByLabel('Email address').focus();
      await visitor.keyboard.press('a');
      await expect(frame.getByRole('button',{name:'Complete verification'})).toBeVisible();
      expect(external).toHaveLength(1);
    }
    await visitor.screenshot({path:testInfo.outputPath('allowed-embed-mobile.png')});
    await writeFile(testInfo.outputPath('signup-privacy.json'),JSON.stringify({emptyDenied:true,sameOriginUnlistedDenied:true,hostileDenied:true,nestedHostileDenied:true,allowedOrigin,externalAfterTrustedInteraction:external},null,2));
    await page.getByLabel('Allowed embed origins').fill('');
    await page.getByRole('button',{name:'Save signup settings'}).click();
    await expect(page.getByRole('status').filter({hasText:'Signup settings saved'})).toBeVisible();
    external.length=0;
    await denied(allowedOrigin);
    await visitor.goto(appOrigin+'/subscribe');
    await expect(visitor.getByRole('heading',{name:'Get the newsletter'})).toBeVisible();
  } finally {
    await request.put('/api/audience/signup',{headers,data:{frequencyDisclosure:signup.frequencyDisclosure,embedOrigins:signup.embedOrigins}});
    await anonymous.close();
    for(const server of [host,hostile]){server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
  }
});

test('public form renders the configured disclosure and acknowledges only after the server accepts a request', async ({ page, request }, testInfo) => {
  await signInAsLocalOperator(page, request);
  const session = (await page.context().cookies()).find((cookie) => cookie.name.startsWith('operator_session_local_'));
  expect(session?.value).toBeTruthy();
  // Public capture requires a complete saved sender even for a honeypot acknowledgement.
  await expect(await request.put('/api/settings/sender', {
    headers: { Cookie: `${session!.name}=${session!.value}`, Origin: new URL(testInfo.project.use.baseURL as string).origin },
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
  const external = await challengeEdge(page);
  const response = await openPage(page, '/subscribe');
  expect(response?.ok()).toBe(true);
  const html = await response?.text();
  expect(html).toContain(info.consentText);
  expect(info.disclosure).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Get the newsletter' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: info.consentText })).not.toBeChecked();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByText('Occasional newsletters')).toBeVisible();
  await untouchedForm(page,page,external);
  await page.getByLabel('Email address').click();
  await expect(page.getByRole('button',{name:'Complete verification'})).toBeVisible();
  expect(external).toHaveLength(1);
  const signupEmail=`ui-subscribe-${Date.now()}@example.test`;
  await page.getByLabel('Email address').fill(signupEmail);
  await page.getByRole('checkbox', { name: info.consentText }).check();
  await page.getByRole('button',{name:'Complete verification'}).click();
  await expect(page.getByRole('button',{name:'Complete verification'})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Request confirmation'})).toBeEnabled();
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
    // This uses the real consent/storage path after the real server verifies
    // the network-edge challenge reply; no honeypot acknowledgement.
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

  await storedSignup(request,`${session!.name}=${session!.value}`,signupEmail,info,testInfo);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).not.toBeEmpty();
});

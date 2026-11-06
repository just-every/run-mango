import { expect, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { png } from '../support/images';
import { openPage } from '../support/navigation';

/** Import review through the same file controls, editor and save door as an operator. */
export async function designSummaryJourney(page: Page, info: TestInfo, origin: string, token: string) {
  const api = page.context().request, headers = { Origin: origin };
  const created = await api.post(origin + '/api/campaigns', { headers, data: {} });
  expect(created.status()).toBe(201);
  const { campaignId, revisionId } = await created.json();
  const read = async () => {
    const response = await api.get(`${origin}/api/campaigns/${campaignId}`);
    expect(response.status()).toBe(200);
    return response.json();
  };
  const seeded = await api.patch(`${origin}/api/campaign-revisions/${revisionId}`, { headers, data: {
    name: 'synthetic-mango-119', emailSubject: 'A pear afternoon', emailBody: '<p>The previous saved body.</p>',
  } });
  expect(seeded.status()).toBe(200);
  const prior = await read();
  const authority = async () => {
    const response = await api.get(origin + '/_authoring/state', { headers: { 'X-Test-Token': token } });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const before = await authority();
  await openPage(page, `${origin}/app/campaigns/${campaignId}/review`);
  const body = page.getByLabel('Email body', { exact: true });
  await page.getByRole('button', { name: 'Import 12ui design', exact: true }).click();
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Import a 12ui design', exact: true }) });
  await expect(dialog).toBeVisible();
  // This brief is authored independently of the layout; only the first image
  // description and heading are supplied by the operator.
  await dialog.getByRole('textbox', { name: 'Brief', exact: true }).fill('A pear afternoon\nA bowl of green pears');
  const document = {
    version: '2', canvas: { width: 600, height: 500 }, layers: [
      { kind: 'heading', content: 'A pear afternoon', box: [20, 20, 560, 40], fontSizePx: 32 },
      { kind: 'photo', content: 'A bowl of green pears', box: [20, 80, 560, 100] },
      { kind: 'photo', content: 'Red pears beside a cobalt vase', box: [20, 210, 540, 120] },
      { kind: 'paragraph', content: 'Our harvest preview is ready.', box: [20, 370, 560, 40] },
    ],
  };
  await dialog.getByLabel('LayerDoc', { exact: true }).setInputFiles({
    name: 'synthetic-mango-119.layerdoc.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)),
  });
  await dialog.getByLabel('Design image', { exact: true }).setInputFiles({
    name: 'synthetic-mango-119.png', mimeType: 'image/png', buffer: Buffer.from(png(600, 500, 119)),
  });
  await dialog.getByRole('button', { name: 'Import design', exact: true }).click();
  await page.getByRole('alertdialog').filter({ has: page.getByRole('heading', { name: 'Replace the email body?', exact: true }) }).getByRole('button', { name: 'Replace', exact: true }).click();
  const summary = page.locator('section.design-import-summary');
  await expect(summary).toHaveCount(1, { timeout: 30000 });
  await expect(summary.locator('.eyebrow')).toContainText('not saved yet');
  await expect(summary.locator('.eyebrow')).not.toContainText('edited');
  const matching = summary.locator('.design-import-images li').filter({ hasText: 'A bowl of green pears' });
  const novel = summary.locator('.design-import-images li').filter({ hasText: 'Red pears beside a cobalt vase' });
  await expect(matching).toHaveCount(1);
  await expect(matching.locator('mark')).toHaveCount(0);
  await expect(novel.locator('mark')).toHaveText('Red pears beside a cobalt vase');
  await expect(summary.locator('.design-import-images mark')).toHaveCount(1);
  await expect(summary.locator('.design-import-lines mark')).toHaveText(['Our harvest preview is ready.']);

  const imported = await body.inputValue();
  const imageContent = async () => body.evaluate(element => {
    const parsed = new DOMParser().parseFromString((element as HTMLTextAreaElement).value, 'text/html');
    return { alts: [...parsed.images].map(image => image.alt), marks: parsed.querySelectorAll('mark').length };
  });
  expect(await imageContent()).toEqual({ alts: ['A bowl of green pears', 'Red pears beside a cobalt vase'], marks: 0 });
  expect((await read()).revision.emailBody).toBe(prior.revision.emailBody);
  expect(await authority()).toEqual(before);

  const capture = async (state: string) => {
    // Assertions run at 1440; phone captures show the same state without a
    // second test registration or any promise of persistence across reload.
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await summary.screenshot({ path: info.outputPath(`design-summary-${state}-${width}.png`) });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  };
  await capture('imported');
  const edited = imported.replace('Our harvest preview is ready.', 'The operator checked this harvest preview.');
  expect(edited).not.toBe(imported);
  await body.fill(edited);
  await expect(summary.locator('.eyebrow')).toContainText('edited since import, not saved yet');
  await expect(summary).toContainText('before your edits');
  await expect(summary.locator('h3')).toContainText('before you save');
  await expect(summary.locator('.design-import-lines mark')).toHaveText(['Our harvest preview is ready.']);
  expect((await read()).revision.emailBody).toBe(prior.revision.emailBody);
  expect(await authority()).toEqual(before);
  await capture('edited');

  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && new URL(response.url()).pathname === `/api/campaign-revisions/${revisionId}`);
  await page.getByRole('button', { name: 'Save full draft', exact: true }).click();
  expect((await saved).status()).toBe(200);
  await expect(summary.locator('.eyebrow')).toContainText('edited since import and saved');
  await expect(summary.locator('.eyebrow')).not.toContainText('not saved yet');
  await expect(summary.locator('h3')).toContainText('before you approve');
  await expect(summary).toContainText('before your edits');
  await expect(summary.locator('.design-import-lines mark')).toHaveText(['Our harvest preview is ready.']);
  await expect(matching.locator('mark')).toHaveCount(0);
  await expect(novel.locator('mark')).toHaveText('Red pears beside a cobalt vase');
  const detail = await read();
  expect(detail.revision.emailBody).toBe(edited);
  expect(detail.revision.emailBody).toContain('The operator checked this harvest preview.');
  expect(detail.revision.emailBody).not.toMatch(/<mark\b/);
  expect(await imageContent()).toEqual({ alts: ['A bowl of green pears', 'Red pears beside a cobalt vase'], marks: 0 });
  expect(detail.campaign.state).toBe('draft');
  expect(detail.steps).toEqual([]);
  expect(await authority()).toEqual(before);
  await capture('edited-saved');
  await writeFile(info.outputPath('design-summary-receipt.json'), JSON.stringify({
    campaignState: detail.campaign.state,
    summaryState: await summary.locator('.eyebrow').textContent(),
    highlightedImageDescriptions: await summary.locator('.design-import-images mark').allTextContents(),
    authoredImages: await imageContent(),
    savedBodyEqualsEditedBody: detail.revision.emailBody === edited,
    savedBodySha256: createHash('sha256').update(detail.revision.emailBody).digest('hex'),
    authorityUnchanged: JSON.stringify(await authority()) === JSON.stringify(before),
    assertionWidth: 1440, captureWidths: [1440, 390],
  }, null, 2) + '\n');
}

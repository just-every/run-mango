import { test, expect, type APIRequestContext, type Locator, type Page, type Response, type TestInfo } from '@playwright/test';
import type { LayerDoc, LayerNode } from '../../src/core/features/design-import/layerdoc';

const leaves = (nodes: LayerNode[]): LayerNode[] => nodes.flatMap(node => node.children ? leaves(node.children) : [node]);
const editorBody = (body: Locator) => body.evaluate(element => element instanceof HTMLTextAreaElement ? element.value : element.innerHTML);

export async function importScreens(page: Page, info: TestInfo, name: string) {
  // Assertions run at the journey's desktop width; the phone capture shows the same outcome.
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({ path: info.outputPath(`${name}-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

/** Refusals enter through selected files and the real browser compiler, never a mocked import response. */
export async function designImportRefusals(input: {
  page: Page; request: APIRequestContext; info: TestInfo; url: string; token: string; layerdoc: string; destination: string;
  body: Locator; files: (page: Page, doc: string) => Promise<unknown>; read: () => Promise<any>;
  uploads: string[]; saves: string[];
}) {
  const { page, request, info, url, token, layerdoc, destination, body, files, read, uploads, saves } = input;
  const dialog = page.getByRole('dialog', { name: 'Import a 12ui design' });
  const saved = await read(), editor = await editorBody(body);
  const authority = async () => {
    const response = await page.context().request.get(url + '/_authoring/state', { headers: { 'X-Test-Token': token } });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const before = await authority();
  expect(before).toEqual({ jobs: [], recipients: [], approvals: [] });
  const assets: Response[] = [];
  const collect = (response: Response) => {
    if (response.request().method() === 'POST' && new URL(response.url()).origin === url && new URL(response.url()).pathname === '/api/campaign-assets') assets.push(response);
  };
  page.on('response', collect);
  try {
    const cases = [
      {
        name: 'reserved-personalization', error: 'reserves for personalisation', uploaded: 0,
        change(doc: LayerDoc) { leaves(doc.layers).find(node => node.kind === 'heading')!.content += ' {{displayName}}'; },
      },
      {
        name: 'compiled-grammar', error: 'The compiled email would not pass approval:', uploaded: 4,
        change(doc: LayerDoc) {
          const text = leaves(doc.layers).find(node => node.kind === 'text')!;
          text.style = { ...text.style, letterSpacing: '-20px' };
        },
      },
      {
        name: 'empty-crop', error: 'has no area to crop', uploaded: 0,
        change(doc: LayerDoc) { leaves(doc.layers).find(node => node.kind === 'logo' && node.surface === 'raster')!.box[2] = 0; },
      },
    ];
    for (const refusal of cases) await test.step(`Unrepresentable import: ${refusal.name}`, async () => {
      const doc: LayerDoc = JSON.parse(layerdoc);
      refusal.change(doc);
      const uploadedBefore = uploads.length, assetsBefore = assets.length;
      await files(page, JSON.stringify(doc));
      await dialog.getByLabel('Button destination', { exact: true }).fill(destination);
      await dialog.getByRole('button', { name: 'Import design', exact: true }).click();
      if (refusal.uploaded) await page.getByRole('alertdialog', { name: 'Replace the email body?' }).getByRole('button', { name: 'Replace', exact: true }).click();
      const error = dialog.getByRole('alert');
      await expect(error).toContainText(refusal.error, { timeout: 30000 });
      if (refusal.name === 'compiled-grammar') await expect(error).toContainText('letter-spacing');
      await expect(error).toContainText('The email body was not changed.');
      expect(await editorBody(body)).toBe(editor);
      const after = await read();
      expect(after.revision).toEqual(saved.revision);
      expect(after.campaign).toEqual(saved.campaign);
      expect(after.steps).toEqual(saved.steps);
      expect(saves).toEqual([]);
      expect(await authority()).toEqual(before);
      expect(uploads.length - uploadedBefore).toBe(refusal.uploaded);
      expect(assets.length - assetsBefore).toBe(refusal.uploaded);
      for (const response of assets.slice(assetsBefore)) {
        expect([200, 201]).toContain(response.status());
        const { asset } = await response.json();
        const served = await request.get(url + new URL(asset.url).pathname);
        expect(served.status()).toBe(200);
        expect(served.headers()['content-type']).toBe('image/jpeg');
        expect((await served.body()).length).toBeGreaterThan(0);
      }
      await importScreens(page, info, `design-refused-${refusal.name}`);
      console.log(`PROBE DESIGN-004 acceptance-4 ${refusal.name}: selected LayerDoc and PNG through Import design -> named refusal; editor and authenticated saved revision unchanged; no draft PATCH or authority change; ${refusal.uploaded} permitted public crop uploads.`);
    });
  } finally { page.off('response', collect); }
  // Leave the existing oversized and successful-import controls' upload accounting intact.
  uploads.length = 0;
}

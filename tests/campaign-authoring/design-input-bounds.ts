import { expect, type Page, type TestInfo } from '@playwright/test';

type Options = {
  page: Page;
  info: TestInfo;
  origin: string;
  token: string;
  candidate: Buffer;
  read: () => Promise<{ revision: unknown; campaign: { state: string } }>;
};

// These files are constructed independently of the importer and its limit constants.
// Each has a valid version, canvas and layer shape; only the named admission bound differs.
const canvas = { width: 1024, height: 1536 };
const leaf = () => ({ kind: 'paragraph', content: 'synthetic-mango-109', box: [0, 0, 100, 20] });
const envelope = (layers: unknown[], extra = {}) => JSON.stringify({ version: '2', canvas, layers, ...extra });
const nested = (levels: number) => '{"version":"2","canvas":' + JSON.stringify(canvas) + ',"layers":['
  + '{"kind":"group","box":[0,0,100,20],"children":['.repeat(levels)
  + JSON.stringify(leaf()) + ']}'.repeat(levels) + ']}';

export async function designInputBounds({ page, info, origin, token, candidate, read }: Options) {
  const dialog = page.getByRole('dialog', { name: 'Import a 12ui design' });
  const layerInput = dialog.getByLabel('LayerDoc', { exact: true });
  const imageInput = dialog.getByLabel('Design image', { exact: true });
  const body = page.getByLabel('Email body', { exact: true });
  const editorValue = () => body.evaluate(element => element instanceof HTMLTextAreaElement ? element.value : element.innerHTML);
  const editorBefore = await editorValue();
  const revisionBefore = (await read()).revision;
  const authority = async () => {
    const response = await page.request.get(origin + '/_authoring/state', { headers: { 'X-Test-Token': token } });
    expect(response.status()).toBe(200);
    return response.json();
  };
  expect(await authority()).toEqual({ jobs: [], recipients: [], approvals: [] });
  const writes: string[] = [], browserErrors: string[] = [];
  const recordWrite = (request: import('@playwright/test').Request) => {
    const url = new URL(request.url());
    if (url.origin === origin && url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      writes.push(`${request.method()} ${url.pathname}`);
    }
  };
  const recordError = (error: Error) => browserErrors.push(error.message);
  page.on('request', recordWrite);
  page.on('pageerror', recordError);
  try {
    const cases = [
      { name: 'file-size', text: envelope([leaf()], { ignored: ' '.repeat(3 * 1024 * 1024) }), error: /LayerDoc.*file.*(?:larger|large|exceed|limit)/i },
      // No single layer array is oversized: the total must include every group's children.
      { name: 'total-layers', text: envelope(Array.from({ length: 8 }, () => ({ kind: 'group', box: [0, 0, 100, 20], children: Array.from({ length: 400 }, leaf) }))), error: /LayerDoc.*(?:more|many|limit|exceed).*layers/i },
      { name: 'nesting', text: nested(96), error: /LayerDoc.*(?:nest|deep|depth)/i },
      // String assembly keeps the fixture builder itself out of recursive serialization.
      { name: 'deep-input', text: nested(12_000), error: /LayerDoc.*(?:nest|deep|depth)/i },
    ];
    for (const item of cases) {
      await layerInput.setInputFiles({ name: `synthetic-mango-109-${item.name}.layerdoc.json`, mimeType: 'application/json', buffer: Buffer.from(item.text) });
      await imageInput.setInputFiles({ name: 'synthetic-mango-109.png', mimeType: 'image/png', buffer: candidate });
      await dialog.getByRole('button', { name: 'Import design', exact: true }).click();
      const alert = dialog.getByRole('alert');
      await expect(alert, item.name).toContainText(item.error);
      await expect(alert).not.toContainText(/stack|RangeError|could not be imported/i);
      expect(browserErrors, item.name).toEqual([]);
      expect(await layerInput.evaluate(async element => {
        const file = (element as HTMLInputElement).files![0];
        return { name: file.name, text: await file.text() };
      })).toEqual({ name: `synthetic-mango-109-${item.name}.layerdoc.json`, text: item.text });
      expect(await imageInput.evaluate(async element => {
        const file = (element as HTMLInputElement).files![0];
        return { name: file.name, bytes: Array.from(new Uint8Array(await file.arrayBuffer())) };
      })).toEqual({ name: 'synthetic-mango-109.png', bytes: Array.from(candidate) });
      expect(await editorValue(), item.name).toBe(editorBefore);
      const detail = await read();
      expect(detail.revision, item.name).toEqual(revisionBefore);
      expect(detail.campaign.state).toBe('draft');
      expect(await authority(), item.name).toEqual({ jobs: [], recipients: [], approvals: [] });
      expect(writes, item.name).toEqual([]);
      // Assertions run at desktop width; these are the same refused state's browser proofs.
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await alert.scrollIntoViewIfNeeded();
        await dialog.screenshot({ path: info.outputPath(`design-input-${item.name}-refused-${width}.png`) });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
      console.log(`PROBE DESIGN-014 acceptance-1 ${item.name}: file inputs -> named refusal; files retained, editor and revision unchanged, no uploads, saves or authority`);
    }
  } finally {
    page.off('request', recordWrite);
    page.off('pageerror', recordError);
  }
}

export async function designInputRecoveryScreens(page: Page, info: TestInfo) {
  const summary = page.getByRole('region', { name: 'Check the imported email before you save' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await summary.screenshot({ path: info.outputPath(`design-input-recovered-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
}

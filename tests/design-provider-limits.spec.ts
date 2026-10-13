import { expect, test } from '@playwright/test';
import { createTwelveUiAdapter, designDownloadLimits } from '../src/core/platform/adapters/twelve-ui';
import { DesignProviderError } from '../src/core/shared/platform';
import { startFakeTwelveUi } from './support/fake-twelve-ui';
import { png } from './support/images';

// 12ui is replaced at the network edge by the local stand-in, which streams an inflated JSON answer in chunks with
// no declared length, so the limit is enforced while the body streams, not from a header.
test('[DESIGN-003] every 12ui JSON answer is read under a size limit and an oversized one fails visibly', async () => {
  const key = 'test-design-key';
  const fake = await startFakeTwelveUi({ key, candidateImage: png(4, 4, 3), layerDoc: '{"version":"2"}' });
  try {
    const adapter = createTwelveUiAdapter({ apiKey: key, origin: new URL(fake.origin) });
    const oversized = designDownloadLimits.jsonBytes + 1;
    const refused = async (attempt: Promise<unknown>) => {
      const error = await attempt.then(() => undefined, failure => failure);
      expect(error).toBeInstanceOf(DesignProviderError);
      expect((error as DesignProviderError).code).toBe('provider_invalid');
    };

    fake.inflateNext('POST /api/v1/create', oversized);
    await refused(adapter.startDraft({ concept: 'A seasonal letter', slots: ['a'] }, 'draft-1'));
    const run = await adapter.startDraft({ concept: 'A seasonal letter', slots: ['a'] }, 'draft-2');
    // A padded answer inside the limit reads as usual.
    fake.inflateNext(`GET /api/v1/create/${run.runId}`, 1024);
    expect(await adapter.readDraft(run.runId)).toEqual(run);
    fake.inflateNext(`GET /api/v1/create/${run.runId}`, oversized);
    await refused(adapter.readDraft(run.runId));
    fake.inflateNext('/candidates/a', oversized);
    await refused(adapter.dispatchCandidate(run.runId, 'a', 'slot-a'));

    fake.inflateNext('POST /api/v1/convert', oversized);
    await refused(adapter.startLayout(new Blob([png(4, 4, 3)], { type: 'image/png' }), 'layout-1'));
    const layout = await adapter.startLayout(new Blob([png(4, 4, 3)], { type: 'image/png' }), 'layout-2');
    fake.inflateNext(`GET /api/v1/convert/${layout.layoutId}`, oversized);
    await refused(adapter.readLayout(layout.layoutId));
    expect((await adapter.readLayout(layout.layoutId)).layoutId).toBe(layout.layoutId);
  } finally { await fake.close(); }
});

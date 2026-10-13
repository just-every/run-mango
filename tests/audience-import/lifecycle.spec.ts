import { test } from '@playwright/test';
import { importLifecycle } from './lifecycle-flow';

test('CONT-010 HTTP import resumes across batches, exports, repeats and undoes without residual effects', async () => {
  test.setTimeout(180000);
  await importLifecycle(21);
});

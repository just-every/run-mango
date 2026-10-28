import {test} from '@playwright/test';
import {walk0 as section0} from "./source-freshness.flow";
import {walk0 as section1} from "./stale-sources.flow";

test("[STORE-003][STORE-004][STORE-005][STORE-006][AUD-003] synchronize a store, retain failed-page diagnostics and require fresh source authority", async ({page, browser}, info) => {
  test.setTimeout(900000);
  if(page.isClosed()) page=await page.context().newPage();
  await section0({page, browser} as any, info);
  if(page.isClosed()) page=await page.context().newPage();
  await section1({page, browser} as any, info);
});

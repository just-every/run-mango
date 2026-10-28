import {test} from '@playwright/test';
import {walk0 as section0} from "./delivery.flow";
import {walk1 as section1} from "./delivery.flow";
import {walk2 as section2} from "./delivery.flow";
import {walk3 as section3} from "./delivery.flow";

test("[CAMP-007][SEND-003][SEND-004][SEND-005][SEND-009][MSG-011] dispatch respects current authority and pacing, then recovers provider failures", async ({page}, info) => {
  test.setTimeout(900000);
  if(page.isClosed()) page=await page.context().newPage();
  await section0({page} as any, info);
  if(page.isClosed()) page=await page.context().newPage();
  await section1({page} as any, info);
  if(page.isClosed()) page=await page.context().newPage();
  await section2({page} as any, info);
  if(page.isClosed()) page=await page.context().newPage();
  await section3({page} as any, info);
});

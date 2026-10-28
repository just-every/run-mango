import {test} from '@playwright/test';
import {walk0 as section0} from "./multistep.flow";
import {walk0 as section1} from "./pause.flow";

test("[AUD-006][CAMP-014] an approved multistep campaign can pause, recheck current inclusion and consent, and resume", async ({page}, info) => {
  test.setTimeout(900000);
  if(page.isClosed()) page=await page.context().newPage();
  await section0({page} as any, info);
  if(page.isClosed()) page=await page.context().newPage();
  await section1({page} as any, info);
});

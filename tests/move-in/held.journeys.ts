import {test} from '@playwright/test';
import {walk0 as section0} from "./held.flow";
import {walk1 as section1} from "./held.flow";
import {walk0 as section2} from "./hostile.flow";

test("[CONT-002][CONT-004][CONT-006][CONT-010] restrictive move-in states win across held imports, retry, undo and rejected archives", async ({page}, info) => {
  test.setTimeout(900000);
  await section0({page} as any, info);
  await section1({page} as any, info);
  await section2({page} as any, info);
});

import {test} from '@playwright/test';
import {walk0 as section0} from "./segments.flow";
import {walk0 as section1} from "./merge.flow";

test("[AUD-001][AUD-002][AUD-005][AUD-007][SEG-001][CONT-011] build and copy a saved segment, freeze recipients and merge identities without widening consent", async ({page}, info) => {
  test.setTimeout(600000);
  await section0({page} as any, info);
  await section1({page} as any, info);
});

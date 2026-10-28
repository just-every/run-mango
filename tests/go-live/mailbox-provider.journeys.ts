import {test} from '@playwright/test';
import {walk0 as section0} from "./mailbox-provider.flow";
import {walk0 as section1} from "./list-growth.flow";

test("[DELIV-005][REPORT-005] signed mailbox facts and membership changes reconcile in operator reports", async ({page}, info) => {
  test.setTimeout(900000);
  await section0({page} as any, info);
  await section1({page} as any, info);
});

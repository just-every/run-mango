import {test} from '@playwright/test';
import {walk0 as section0} from "./presend-checks.flow";
import {walk0 as section1} from "./email-size.flow";

test("[BUILD-008][BUILD-012] preview a saved newsletter, resolve pre-send blockers and refuse unsafe handoff expansion", async ({page}, info) => {
  test.setTimeout(900000);
  await section0({page} as any, info);
  await section1({page} as any, info);
});

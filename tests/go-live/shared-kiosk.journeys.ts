import {test} from '@playwright/test';
import {walk0 as section0} from "./shared-kiosk.flow";
import {walk0 as section1} from "./resubscribe.flow";

test("[FORM-009][CONT-005][CONT-027] shared signup clears each visitor and resubscribes only after their affirmative confirmation", async ({page, browser}, info) => {
  test.setTimeout(900000);
  await section0({page, browser} as any, info);
  await section1({page, browser} as any, info);
});

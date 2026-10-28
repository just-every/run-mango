import {test} from '@playwright/test';
import {walk0 as section0} from "./go-live.flow";
import {walk1 as section1} from "./go-live.flow";
import {walk2 as section2} from "./go-live.flow";

test("[SEND-001][SEND-005][SEND-006][SEND-007][SEND-008][CONT-004][CONT-006][CONT-009][MSG-002][MSG-003][CAMP-008][DATA-001] confirm readers, approve a letter, reconcile delivery, opt out and restore", async ({page}, info) => {
  test.setTimeout(900000);
  await section0({page} as any, info);
  await section1({page} as any, info);
  await section2({page} as any, info);
});

import {test} from '@playwright/test';
import {walk0 as section0} from "./archive.flow";
import {walk1 as section1} from "./archive.flow";

test("[MOVE-009][CONT-001][CONT-002][CONT-003][CONT-010][CONT-012][CONT-013][DATA-001] move an incumbent archive in, reconcile its history, undo and erase without resurrecting recipients", async ({page}, info) => {
  test.setTimeout(900000);
  await section0({page} as any, info);
  await section1({page} as any, info);
});

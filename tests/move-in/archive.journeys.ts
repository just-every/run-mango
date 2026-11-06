import {csvCapacityJourney} from './csv-capacity-journey';
import {csvRulesJourney} from './csv-rules-journey';
import {phoneCsvJourney} from './phone-csv-journey';
import {test} from '@playwright/test';
import {walk0 as section0} from "./archive.flow";
import {walk1 as section1} from "./archive.flow";

test("[MOVE-009][CONT-001][CONT-002][CONT-003][CONT-010][CONT-012][CONT-013][DATA-001] move an incumbent archive in, reconcile its history, undo and erase without resurrecting recipients", async ({page}, info) => {
  test.setTimeout(process.env.MANGO_CSV_SCALE_ROWS?1800000:900000);
  await csvCapacityJourney(page,info);
  await phoneCsvJourney();
  await csvRulesJourney(page,info);
  await section0({page} as any, info);
  await section1({page} as any, info);
});

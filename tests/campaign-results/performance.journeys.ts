import {test} from './runtime-fixture';
import {walk0 as section0} from "./performance.flow";
import {walk1 as section1} from "./performance.flow";

test("[REPORT-002][REPORT-003][RESULT-002][RESULT-003][RESULT-005] trace delivered links through commerce attribution, privacy settings and authorized CSV export", async ({page, request}, info) => {
  test.setTimeout(900000);
  await section0({page, request} as any, info);
  await section1({page, request} as any, info);
});

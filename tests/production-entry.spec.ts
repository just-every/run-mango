import {test} from '@playwright/test';
import {walk0 as section0} from "./production-entry.flow";
import {walk2 as section1} from "./production-entry.flow";
import {walk3 as section2} from "./production-entry.flow";

test("[BASE-OPS-001][OPER-001] production entry keeps local authority private and reports healthy, failed and recovering dependencies", async ({}, info) => {
  test.setTimeout(120000);
  await section0({} as any, info);
  await section1({} as any, info);
  await section2({} as any, info);
});

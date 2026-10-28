import {test} from '@playwright/test';
import {walk0 as section0} from "./portability.flow";
import {walk1 as section1} from "./portability.flow";

test("[DATA-001][CONT-013] upgrade and restore populated records and assets, then enforce the current erasure fence", async ({}, info) => {
  test.setTimeout(600000);
  await section0({} as any, info);
  await section1({} as any, info);
});

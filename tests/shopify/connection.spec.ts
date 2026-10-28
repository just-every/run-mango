import {test} from '@playwright/test';
import {walk0 as section0} from "./connection.flow";

test("[STORE-002][STORE-004] native authenticated Shopify sync retains source identity and purchase time through paged failure and retry", async ({}, info) => {
  test.setTimeout(180000);
  await section0({} as any, info);
});

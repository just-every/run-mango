import {test} from '@playwright/test';
import {walk0 as section0} from "./managed-mail.flow";

test("[SEND-001][SEND-008][OPER-001] managed access mail and owner marketing mail preserve handoff and reconciliation authority", async ({browser}, info) => {
  test.setTimeout(900000);
  await section0({browser} as any, info);
});

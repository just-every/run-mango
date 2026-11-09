import {test} from '@playwright/test';
import {kioskInstallation} from './kiosk-harness';
import {confirmationAllowanceJourney} from './confirmation-allowance-journey';

test('[CONT-042] focused shared destination confirmation allowance replay', async ({browser}, info) => {
  const site = await kioskInstallation();
  try { await confirmationAllowanceJourney(site, browser, info); }
  finally { await site.runtime.close(); }
});

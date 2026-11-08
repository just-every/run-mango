import {audienceSummaryJourney} from './audience-summary-journey';
import {contactProfileJourney} from './contact-profile-flow';
import {test} from '@playwright/test';
import {channelStatusJourney} from './channel-status-journey';
import {walk0 as section0} from "./segments.flow";
import {walk0 as section1} from "./merge.flow";

test("[CONT-008][CONT-017][AUD-001][AUD-002][AUD-005][AUD-007][SEG-001][CONT-011] build and copy a saved segment, inspect its saved audience time and separate channel step counts, freeze recipients and merge identities without widening consent", async ({page,browser,request}, info) => {
  test.setTimeout(600000);
  await section0({page} as any, info);
  await section1({page} as any, info);
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  try {
    const profilePage=await context.newPage();
    await test.step('Contact history — complete acceptance',()=>contactProfileJourney({page:profilePage,request},info));
  }
  finally {await context.close();}
});

test("[AUD-010] campaign list and editor explain the saved nested inclusion and custom exclusion", async ({page}, info) => {
  test.setTimeout(240000);
  await audienceSummaryJourney(page,info);
});

test('[CONT-002] Channel status — complete acceptance',async({page},info)=>{
  test.setTimeout(240000);
  await channelStatusJourney(page,info);
});

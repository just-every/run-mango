import {bulkRouteJourney} from './bulk.flow';
import {bulkBrowserJourney} from './bulk-browser';
import {contactProfileJourney} from './contact-profile-flow';
import {test} from '@playwright/test';
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


test('[CONT-022] find contacts and complete consent-safe durable bulk actions',async({page},info)=>{
  test.setTimeout(600000);
  await bulkRouteJourney();
  await bulkBrowserJourney(page,info);
});

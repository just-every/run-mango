import {test} from '@playwright/test';
import {fullPromotionalEmailJourney} from './full-promotional-email-journey';
import {chosenSizeJourney} from './chosen-size-journey';

test('[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-012][CAMP-018][MSG-009][MSG-012] build and preview a newsletter, save canonical content, approve its exact revision, send and reuse it as a fresh draft',async({page},info)=>{
  test.setTimeout(600000);
  await fullPromotionalEmailJourney(page,info);
  await chosenSizeJourney(page,info);
});

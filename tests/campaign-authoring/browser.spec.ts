import {conditionalContentJourney} from './conditional-content-journey';
import {test} from '@playwright/test';
import {fullPromotionalEmailJourney} from './full-promotional-email-journey';
import {chosenSizeJourney} from './chosen-size-journey';
import {audienceExclusionsJourney} from './audience-exclusions-journey';

test('[CAMP-002][CAMP-003][CAMP-004][CAMP-005][CAMP-006][CAMP-012][CAMP-018][MSG-009][MSG-012] build and preview a newsletter, save canonical content, approve its exact revision, send and reuse it as a fresh draft',async({page},info)=>{
  test.setTimeout(600000);
  await test.step('Live audience authoring counts — complete acceptance',()=>audienceExclusionsJourney(page,info));
  await fullPromotionalEmailJourney(page,info);
  await chosenSizeJourney(page,info);
});

test('[BUILD-005] conditional blocks follow the chosen contact in preview and delivered HTML and plain text',async({page},info)=>{
  test.setTimeout(240000);await conditionalContentJourney(page,info);
});

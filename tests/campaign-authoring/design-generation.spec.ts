import {test} from '@playwright/test';
import {walk0,walk1,walk2} from './design-generation.flow';

test('[DESIGN-001][DESIGN-002][DESIGN-003][DESIGN-007][DESIGN-008][DESIGN-009][DESIGN-010] generate and select a design without saving or spending twice, and expose provider refusal',async({browser,request},info)=>{
  test.setTimeout(600000);
  // The disabled and configured provider phases use separate installations.
  // Their browser contexts must end with them, including background auth reads.
  for(const phase of [walk0,walk1,walk2]){
    const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Los_Angeles'});
    try {await phase({page:await context.newPage(),request},info);}finally{await context.close();}
  }
});

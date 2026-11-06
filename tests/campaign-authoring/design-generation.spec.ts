import {test} from '@playwright/test';
import {walk0,walk1,walk2} from './design-generation.flow';
import {walkConcurrency} from './design-concurrency-journey';

test('[DESIGN-001][DESIGN-002][DESIGN-003][DESIGN-007][DESIGN-008][DESIGN-009][DESIGN-010][DESIGN-011] generate and select a design without saving or spending twice, expose provider refusal and keep retained artifacts private and byte-exact',async({browser,request},info)=>{
  test.setTimeout(600000);
  // The disabled and configured provider phases use separate installations.
  // Their browser contexts must end with them, including background auth reads.
  for(const phase of [walk0,walk1,walk2,walkConcurrency]){
    const context=await browser.newContext({viewport:{width:1440,height:1000},timezoneId:'America/Los_Angeles'});
    try {await phase({page:await context.newPage(),request},info);}finally{await context.close();}
  }
});

import {test} from './runtime-fixture';
import {walk1 as outcomes,walk4 as cancellation} from './results.flow';
import {walk0 as costs} from './costs.flow';
import {walk0 as archive} from './archive.flow';
import {walk0 as followup} from './followup.flow';

test('[CAMP-001][CAMP-009][RESULT-001][RESULT-004][CAMP-016][PUB-001][SEG-003][REPORT-004] inspect outcomes, cancel queued work, publish archives and follow up from recorded engagement',async({browser,request},info)=>{
  test.setTimeout(600000);
  for(const phase of [outcomes,cancellation,costs,archive,followup]){
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    try {await phase({page:await context.newPage(),request,browser},info);}finally{await context.close();}
  }
});

import {test} from '@playwright/test';
import {walk0,walk1,walk2,walk3} from './delivery.flow';

// Each is a complete business flow with its own installation. Keep the longer
// UI/restart flows independently schedulable alongside authority/erasure.
test.describe.configure({mode:'parallel'});
test('[SEND-003][SEND-004] shared provider pacing survives a native restart and the open screen follows durable receipts',async({page})=>{
  await walk2({page});
});
test('[MSG-011][RESULT-006] an owner connects delivery, account restrictions stop sending and signed facts update reputation',async({page},info)=>{
  await walk3({page},info);
});
test('[CONT-013][CAMP-007][SEND-003] current authority fences replacement, suppression and erasure before dispatch',async()=>{
  await walk0();
  await walk1();
});

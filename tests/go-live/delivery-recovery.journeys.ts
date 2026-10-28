import {test} from '@playwright/test';
import {walk0,walk1} from './delivery-recovery.flow';
test('[SEND-004][SEND-005][SEND-009] recover refused handoffs and provider outages without duplicating uncertain sends',async({page},info)=>{
  test.setTimeout(600000);
  await walk0();
  await walk1({page},info);
});

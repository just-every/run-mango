import { test } from '@playwright/test';
import { authorityRuntime } from './authority-runtime.mjs';
import { senderSetupJourney } from './sender-setup.flow';

test('[OPER-001] native sender setup preserves configuration access without provider readiness',async({browser})=>{
  test.setTimeout(600000);
  const runtime=await authorityRuntime();
  try {
    await runtime.setup(false);
    await runtime.variables();
    await runtime.start();
    await senderSetupJourney(browser,runtime);
  } finally {await runtime.close();}
});

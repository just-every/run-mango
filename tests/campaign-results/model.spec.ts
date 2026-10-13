import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { stepResultState } from '../../src/core/features/campaigns/result-model';
contract('CAMP-010','[CAMP-001][SEND-006][SEND-007] deadline equality is missed only before dispatch and unresolved handoffs are never sent',()=>{
  const input={campaignState:'scheduled',startedAt:null,sendByAt:100,now:99,counts:[{disposition:'queued',reason:null,count:5}],pendingBeforeDeadline:5};
  expect(stepResultState(input)).toBe('Scheduled');
  expect(stepResultState({...input,now:100,pendingBeforeDeadline:0})).toBe('Missed');
  expect(stepResultState({...input,startedAt:1,counts:[{disposition:'handoff-unknown',reason:null,count:1}],pendingBeforeDeadline:0})).toBe('Sending');
  expect(stepResultState({...input,startedAt:1,now:100,pendingBeforeDeadline:0,counts:[{disposition:'delivered',reason:null,count:1},{disposition:'skipped',reason:'deadline-passed',count:4}]})).toBe('Sent');
  expect(stepResultState({...input,campaignState:'cancelled',startedAt:1,pendingBeforeDeadline:0,counts:[{disposition:'skipped',reason:'campaign-cancelled',count:4},{disposition:'handoff-unknown',reason:null,count:1}]})).toBe('Cancelled');
  expect(stepResultState({...input,startedAt:1,pendingBeforeDeadline:0,counts:[{disposition:'failed',reason:null,count:1}]})).toBe('Failed');
});
contract('CAMP-001','failed before dispatch retains its failure after deadline without masking other steps',()=>{
  const input={campaignState:'failed',startedAt:null,sendByAt:100,now:101,counts:[{disposition:'failed',reason:null,count:5}],pendingBeforeDeadline:0};
  expect(stepResultState(input)).toBe('Failed');
  expect(stepResultState({...input,startedAt:1,counts:[{disposition:'accepted',reason:null,count:1}]})).toBe('Sent');
  expect(stepResultState({...input,startedAt:1,counts:[{disposition:'handoff-unknown',reason:null,count:1}]})).toBe('Sending');
  expect(stepResultState({...input,startedAt:1,counts:[{disposition:'skipped',reason:'frequency-window',count:1}]})).toBe('Completed');
});
contract('SEND-007','a durable queued handoff fence stays sending even after its deadline and campaign failure',()=>{
  expect(stepResultState({campaignState:'failed',startedAt:1,sendByAt:100,now:101,counts:[{disposition:'queued',reason:null,count:1}],pendingBeforeDeadline:0,inFlightCount:1})).toBe('Sending');
});

import { overallResult } from '../../src/core/features/campaigns/ui/result-copy';
import type { CampaignResults } from '../../src/core/features/campaigns/result-model';
import type { Step } from '../../src/core/app/client/lib/types';
contract('SEND-006','[CAMP-010] overall copy counts expired queued and skipped recipients once and excludes durable handoffs',()=>{
  const step={id:'step',sequence:1,sendByAt:'2031-10-05T03:00:00Z',timezone:'Australia/Sydney'} as Step;
  const results:CampaignResults={asOf:step.sendByAt,cancellable:false,steps:[{stepId:'step',state:'Sent',startedAt:step.sendByAt,completedAt:null,counts:[{disposition:'accepted',reason:null,count:1},{disposition:'queued',reason:null,count:5},{disposition:'skipped',reason:'deadline-passed',count:2}],failures:[],stoppableCount:0,expiredQueuedCount:4,inFlightCount:1,complainedCount:0,suppressedCount:0}]};
  expect(overallResult(results,[step],'Australia/Brisbane')).toContain('1 of 1 steps sent.');
  expect(overallResult(results,[step],'Australia/Brisbane')).toContain('left 6 recipient-steps unsent');
  expect(overallResult(results,[step],'Australia/Brisbane')).toContain('1:00 pm AEST');
  expect(results.steps[0].counts[1].count).toBe(5);
});

import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { compositionFieldErrors } from '../../src/core/features/campaigns/ui/composition-field-errors';
import { approvalFieldErrors } from '../../src/core/features/campaigns/ui/approval-field-errors';
import type { DraftComposition } from '../../src/core/features/campaigns/ui/draft-composition';

contract('CAMP-002','structured server step paths map to registered timing controls without discarding named errors',()=>{
  const draft={name:'Draft',smsBody:'',smsSender:'',steps:[{}],links:[]} as DraftComposition;
  expect(compositionFieldErrors({'steps.0.whyThisTime':'Explain the time.','steps.0.localScheduledAt':'Choose a local time.','private':'hidden'}, {properties:{steps:{items:[{properties:{localSendByAt:{errors:['Choose a later deadline.']}}}]}}},draft)).toEqual({'steps.0.whyThisTime':'Explain the time.','steps.0.scheduledAt':'Choose a local time.','steps.0.sendByAt':'Choose a later deadline.'});
  expect(approvalFieldErrors([{kind:'message.sms-compliance',blocking:true}],draft)).toEqual({smsBody:'Include the sender name and Reply STOP to unsubscribe in the SMS message before approval.',smsSender:'Add the SMS sender before approval.'});
  expect(approvalFieldErrors([{kind:'message.sms-sender',blocking:true}],draft)).toEqual({smsSender:'Use a registered SMS sender for every recipient country before approval.'});
  expect(approvalFieldErrors([{kind:'message.sms-compliance',blocking:false}],draft)).toEqual({});
  expect(approvalFieldErrors([{kind:'schedule',blocking:true,fields:{'steps.0.localScheduledAt':'Use an unambiguous local time.',smsBody:'Message is required.'}}],draft)).toEqual({'steps.0.scheduledAt':'Use an unambiguous local time.',smsBody:'Message is required.'});
});

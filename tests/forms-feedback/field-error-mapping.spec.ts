import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { mapFieldErrors, mapIssueTree } from '../../src/core/app/client/ui/field-errors';
import { approvalFieldErrors } from '../../src/core/features/campaigns/ui/approval-field-errors';
import type { DraftComposition } from '../../src/core/features/campaigns/ui/draft-composition';
contract('CAMP-002', 'named server field errors stay on allow-listed controls without parsing human prose', () => {
  expect(mapFieldErrors({fromEmail:['Enter a valid email.'],physicalAddress:'Add an address.',admin:'private'}, ['fromEmail','physicalAddress'])).toEqual({fromEmail:'Enter a valid email.',physicalAddress:'Add an address.'});
  expect(mapFieldErrors({fromEmail:[false,null,4,'','Bad address.']}, ['fromEmail'])).toEqual({fromEmail:'Bad address.'});
  expect(mapFieldErrors({error:'subject missing',detail:'sender invalid'}, ['emailSubject','fromEmail'])).toEqual({});
  expect(mapFieldErrors(null,['emailSubject'])).toEqual({});
  expect(mapIssueTree({properties:{emailSubject:{errors:['Add a subject.']},steps:{items:[{properties:{sendByAt:{errors:['Choose a later deadline.']}}}]},private:{errors:['ignored']}}},['emailSubject','steps'])).toEqual({emailSubject:'Add a subject.','steps.0.sendByAt':'Choose a later deadline.'});
});
contract('CAMP-002', 'stable approval field codes identify incomplete content and sender recovery', () => {
  const draft={steps:[],links:[],emailSubject:'',preheader:'saved',emailBody:'saved',senderName:'saved',fromEmail:'saved@example.test',replyToEmail:'saved@example.test',physicalAddress:'saved'} as DraftComposition;
  expect(approvalFieldErrors([{kind:'message.email-identity',blocking:true}],draft)).toEqual({emailSubject:'Complete this field before approval.'});
  expect(approvalFieldErrors([{kind:'message.email-sender',blocking:true}],draft)).toHaveProperty('fromEmail');
  expect(approvalFieldErrors([{kind:'campaign.name',blocking:false}],draft)).toEqual({});
});

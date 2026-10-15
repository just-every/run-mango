import {createHash} from 'node:crypto';
import type {AppBindings} from '../../src/core/shared/platform';

export const smsSender='61400000010';
export const smsSecret='test-sms-webhook-secret';
const smsKey='test:only';
export function smsProgramme(now=Date.now()) {
  const windows=[{days:[0,1,2,3,4,5,6],startMinute:0,endMinute:1440}];
  return {brand:'Mango',programme:'News',category:'newsletter',frequency:'Weekly',jurisdiction:'AU' as const,
    support:'help@example.test',providerAlreadyReplies:false,
    policySource:'https://provider-evidence.example.test/accounts/test-account/programme',
    policyVerifiedAt:new Date(now-60000).toISOString(),policyExpiresAt:new Date(now+14*86400000).toISOString(),
    providerWindows:windows,jurisdictionWindows:windows,recipientWindows:windows};
}

/** Synthetic provider contract supplied to this test account. The public API
 * documentation makes NO numerical minimum lookup-retention promise. */
export function smsBindings(retentionEvidence=true,policyAt=Date.now()):Partial<AppBindings> {
  return {SMS_PROVIDER_API_KEY:smsKey,SMS_WEBHOOK_SECRET:smsSecret,SMS_CONFIRMATION_SENDER:smsSender,
    SMS_PROGRAMME_POLICY:JSON.stringify(smsProgramme(policyAt)),MANGO_TEST_SMS_ALLOWLIST:'+61411111111',
    MANGO_SMS_HANDOFFS_PER_MINUTE:'120',MANGO_ALLOWED_LINK_HOSTS:'localhost,shop.example.test',
    MANGO_DELIVERY_POLICY_JSON:JSON.stringify({'mobile-message':{
      credentialDigest:createHash('sha256').update(smsKey).digest('hex'),
      account:'test-account',evidence:'https://provider-evidence.example.test/accounts/test-account/retention-agreement',
      ...(retentionEvidence?{lookupWindowMs:86400000}:{}),providerPerMinute:60,carrierPerMinute:11,carrierScope:'test account contracted policy for all permitted carriers'}})};
}

export function smsDisclosure() {
  const policy=smsProgramme(),text=`I agree to receive ${policy.category} SMS from ${policy.brand}, programme ${policy.programme}, ${policy.frequency}. Reply STOP to unsubscribe. Help: ${policy.support}.`;
  return JSON.stringify({text,version:'sms-signup-v1',sender:smsSender});
}

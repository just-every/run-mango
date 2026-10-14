import {createHash} from 'node:crypto';
import type {AppBindings} from '../../src/core/shared/platform';
export const resendKey='test-resend-api-key';
export const resendWebhookId='go-live-resend-webhook';
// Encode explicit synthetic bytes in the provider's required webhook-key format.
export const resendWebhookSecret='whsec_'+Buffer.from('test-resend-webhook-secret').toString('base64');
export function resendBindings(coverage=true):Partial<AppBindings> {
  return {MAIL_PROVIDER:'resend',MAIL_PROVIDER_API_KEY:resendKey,MAIL_WEBHOOK_SECRET:resendWebhookSecret,MAIL_WEBHOOK_ID:resendWebhookId,
    MANGO_DELIVERY_POLICY_JSON:JSON.stringify({resend:{account:'go-live-resend-account',
      credentialDigest:createHash('sha256').update(resendKey).digest('hex'),
      evidence:'https://provider-evidence.example.test/resend/go-live-resend-account/standard-retention',
      lookupWindowMs:30*86400000,scopes:coverage?['full_access']:['sending_access'],
      webhookId:resendWebhookId,lookupHistorySince:'2020-01-01T00:00:00.000Z',providerPerMinute:50}})};
}

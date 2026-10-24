import {SendingWebhookError} from './webhook-error';
import {monitorSendingConnection,notifySendingAlerts} from './monitor';
import {createResendAdapter} from '@/core/platform/adapters/resend';
import {createSendgridAdapter} from '@/core/platform/adapters/sendgrid';
import {pacedAdapter} from '@/core/features/lifecycle/transport-pacing';
import {parseSendgridFacts} from '@/core/features/lifecycle/sendgrid-facts';
import {ownerConnectorId} from '@/core/features/sender-verification/types';
import {ProviderTransportError,type Platform,type SenderAdapter} from '@/core/shared/platform';
import {openSendingSecret} from './secrets';

/** Called at the installation's existing request/queue/cron composition seams.
 * An explicit disconnected/failed connection never resumes the developer key. */
export async function loadSendingConnection(platform:Platform) {
  const db=platform.database.$client;
  const row=await db.prepare('SELECT generation,state,secret_cipher,account_id,webhook_id,connected_at,delivery_proved_at FROM sending_connection WHERE id=1')
    .first<{generation:string;state:string;secret_cipher:string;account_id:string;webhook_id:string|null;connected_at:number;delivery_proved_at:number|null}>();
  if(!row)return; // The declared developer connection retains its existing authority.
  await monitorSendingConnection(platform,row);
  await notifySendingAlerts(platform,row.generation);
  const secret=await openSendingSecret(row.secret_cipher,platform.config.sessionSigningKey);
  const provider=row.account_id==='resend'?'resend':'sendgrid';
  Object.assign(platform.config,{mailProvider:provider,mailProviderApiKey:secret.apiKey,mailWebhookSecret:secret.publicKey??'',mailWebhookId:row.webhook_id??''});
  const adapter=provider==='resend'?createResendAdapter({apiKey:secret.apiKey,webhookSecret:secret.publicKey??'',webhookId:row.webhook_id??'',verification:platform.senderVerification}):createSendgridAdapter({apiKey:secret.apiKey,webhookPublicKey:secret.publicKey??'',verification:platform.senderVerification});
  const current=()=>db.prepare("SELECT delivery_proved_at,last_error FROM sending_connection WHERE id=1 AND generation=? AND state='connected'").bind(row.generation).first<{delivery_proved_at:number|null;last_error:string|null}>();
  const refuse=(detail:string)=>new ProviderTransportError({outcome:'known-not-accepted',permanent:true,code:'sending-connection-missing',detail});
  const connected:SenderAdapter={
    ...adapter,
    async capabilities() {
      const state=await current(),capabilities=await adapter.capabilities();
      return {...capabilities,configured:Boolean(state),canSendMarketing:Boolean(state?.delivery_proved_at&&!state?.last_error),deliveryEventsVerified:Boolean(state?.delivery_proved_at&&!state?.last_error),
        detail:!state?'sending-connection-missing: connect your provider in Settings.':state.last_error?state.last_error:!state.delivery_proved_at?'delivery-events-missing: send the owner sender check and verify its signed delivered event.':capabilities.detail};
    },
    async send(request) {
      const state=await current();if(state?.last_error)throw new ProviderTransportError({outcome:'known-not-accepted',permanent:true,code:state.last_error,detail:state.last_error});if(!state)throw refuse('The sending connection changed or is disconnected.');
      if(!state.delivery_proved_at&&request.purpose!=='consent-confirmation') {
        const challenge=await db.prepare(`SELECT id FROM sender_verification_challenges WHERE json_extract(request_json,'$.idempotencyKey')=?
          AND json_extract(request_json,'$.recipientStepId')=? AND recipient=? AND created_at>=? AND sent_at IS NOT NULL AND expires_at>?`)
          .bind(request.idempotencyKey,request.recipientStepId,request.to,row.connected_at,Date.now()).first();
        if(!challenge)throw new ProviderTransportError({outcome:'known-not-accepted',permanent:true,code:'delivery-events-missing',detail:'Verify the owner sender check’s signed delivered event before marketing.'});
      }
      return adapter.send(request);
    },
    async verifyWebhook(request) {
      if(!await current())throw new Error('No active signed sending connection.');
      let verified;try{verified=await adapter.verifyWebhook(request);}catch{throw new SendingWebhookError('The sending webhook signature was refused.');}
      const resend=provider==='resend'?JSON.parse(verified.rawBody):null;
      const facts=resend?(resend.type==='email.delivered'?[{kind:'delivered',providerMessageId:resend.data?.email_id,detail:{destination:resend.data?.to?.[0]}}]:[]):await parseSendgridFacts(verified);
      const delivered=facts.filter(fact=>fact.kind==='delivered'&&fact.providerMessageId);
      if(delivered.length)await db.batch(delivered.map(fact=>db.prepare(`UPDATE sending_connection SET delivery_proved_at=? WHERE id=1 AND generation=? AND state='connected'
        AND EXISTS(SELECT 1 FROM sender_verification_challenges c JOIN sender_verification_state s ON s.id=c.state_id AND s.generation=c.generation
          WHERE c.provider_message_id=? AND c.recipient=? AND c.connector_id=? AND c.created_at>=? AND c.sent_at IS NOT NULL AND c.expires_at>?)`)
        .bind(verified.receivedAt.getTime(),row.generation,fact.providerMessageId,fact.detail.destination,ownerConnectorId,row.connected_at,verified.receivedAt.getTime())));
      return verified;
    },
  };
  platform.mailer=pacedAdapter(connected,platform.database,platform.config);
}

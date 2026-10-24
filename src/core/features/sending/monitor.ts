import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
import type {Platform} from '@/core/shared/platform';
import {effectiveRole} from '../auth/product-roles';
import {createBaseMailSender} from '@/core/platform/adapters/base-mail';
import {openSendingSecret} from './secrets';
import {resendAccount,ResendConnectionError} from './resend-account';
import {sendgridAccount,SendingConnectionError} from './sendgrid-account';
/** A durable cadence and notice fence; uncertain notice handoffs are never replayed. */
export async function monitorSendingConnection(platform:Platform,row:{generation:string;state:string;account_id:string;webhook_id:string|null;secret_cipher:string}){
  if(row.state!=='connected')return;
  const db=platform.database.$client,now=Date.now();
  const claim=await db.prepare(`INSERT INTO provider_health(adapter,channel,next_probe_at) VALUES('sending.connection.v1','email',?) ON CONFLICT(adapter,channel) DO UPDATE SET next_probe_at=excluded.next_probe_at WHERE provider_health.next_probe_at<=? RETURNING adapter`).bind(now+300000,now).first();
  if(!claim)return;
  const secret=await openSendingSecret(row.secret_cipher,platform.config.sessionSigningKey);
  let code:string|undefined;
  try{
    if(!row.webhook_id)code='delivery-webhook-missing';
    else if(row.account_id==='resend'){
      const hook=await resendAccount(secret.apiKey).request('/webhooks/'+encodeURIComponent(row.webhook_id));
      if(hook.id!==row.webhook_id||hook.endpoint!==new URL('/webhooks/mail/resend',platform.config.publicBaseUrl).href||hook.status!=='enabled')code='delivery-webhook-missing';
    }else{
      const hook=await sendgridAccount(secret.apiKey).request('/user/webhooks/event/settings/'+encodeURIComponent(row.webhook_id));
      if(hook.id!==row.webhook_id||hook.enabled!==true||hook.url!==new URL('/webhooks/mail/sendgrid',platform.config.publicBaseUrl).href)code='delivery-webhook-missing';
    }
  }catch(error){
    if(error instanceof ResendConnectionError)code=error.status===401||error.status===403?'sending-key-revoked':error.status===404?'delivery-webhook-missing':undefined;
    else if(error instanceof SendingConnectionError)code=error.status===401||error.status===403?'sending-key-revoked':error.status===404?'delivery-webhook-missing':undefined;
    // A transient or indeterminate read blocks approval; it never certifies health.
    if(!code)code='sending-health-unknown';
  }
  await db.prepare('UPDATE sending_connection SET last_error=?,delivery_proved_at=CASE WHEN ? IS NULL THEN delivery_proved_at ELSE NULL END WHERE id=1 AND generation=? AND state=\'connected\'').bind(code??null,code??null,row.generation).run();
  if(!code||code==='sending-health-unknown')return;
  const targets=(await db.prepare(`SELECT n.id,n.email FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.status='active' AND ${effectiveRole} IN ('owner','admin')`).all<{id:string;email:string}>()).results;
  for(const operator of targets){
    const id=`sending-alert:${row.generation}:${code}:${operator.id}`;
    await db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,actor_type,actor_id,action,entity_type,entity_id,detail_json,occurred_at,created_at) SELECT ?,?,'system','sending-monitor','sending-alert-notice','integration',?,json_object('reason',?,'operatorId',?,'state','pending','generation',?),?,? WHERE EXISTS(SELECT 1 FROM sending_connection WHERE id=1 AND generation=? AND last_error=?) ON CONFLICT(id) DO NOTHING`).bind(id,id,row.account_id,code,operator.id,row.generation,now,now,row.generation,code).run();
  }
}
export async function notifySendingAlerts(platform:Platform,generation:string){
  const db=platform.database.$client,now=Date.now();
  const config={...platform.config,...(platform.config.authMail?{mailProvider:platform.config.authMail.provider,mailProviderApiKey:platform.config.authMail.apiKey,mailRelayUrl:platform.config.authMail.relayUrl}:{})};
  const pending=(await db.prepare(`SELECT a.id,a.detail_json,n.email FROM lifecycle_audit_entries a JOIN oa_operators n ON n.id=json_extract(a.detail_json,'$.operatorId') JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE a.action='sending-alert-notice' AND json_extract(a.detail_json,'$.state')='pending' AND json_extract(a.detail_json,'$.generation')=? AND COALESCE(json_extract(a.detail_json,'$.retryAt'),0)<=? AND n.status='active' AND ${effectiveRole} IN ('owner','admin') ORDER BY a.id LIMIT 20`).bind(generation,now).all<{id:string;detail_json:string;email:string}>()).results;
  for(const notice of pending){
    const reason=String(JSON.parse(notice.detail_json).reason);
    const claimed=await db.prepare(`UPDATE lifecycle_audit_entries SET detail_json=json_set(detail_json,'$.state','handoff-unknown') WHERE id=? AND json_extract(detail_json,'$.state')='pending' AND EXISTS(SELECT 1 FROM sending_connection WHERE id=1 AND generation=? AND last_error=?) AND EXISTS(SELECT 1 FROM oa_operators n JOIN operators p ON p.id=n.id LEFT JOIN operator_product_roles r ON r.operator_id=n.id WHERE n.id=json_extract(lifecycle_audit_entries.detail_json,'$.operatorId') AND n.status='active' AND ${effectiveRole} IN ('owner','admin')) RETURNING id`).bind(notice.id,generation,reason).first();
    if(!claimed)continue;
    try{
      const receipt=await createBaseMailSender(config,platform.database).send({deliveryId:notice.id,from:config.mailAuthFrom,to:[notice.email],subject:'Mango sending connection needs attention',html:'<p>'+reason+'</p>',headers:{},text:`${reason}. Sending approval is blocked. Open ${new URL('/app/settings#sending',config.publicBaseUrl).href} to review the connection.`});
      await db.prepare("UPDATE lifecycle_audit_entries SET detail_json=json_set(detail_json,'$.state',?) WHERE id=?").bind(receipt.status,notice.id).run();
    }catch(error){
      if(error instanceof ProviderDeferredError)await db.prepare("UPDATE lifecycle_audit_entries SET detail_json=json_set(detail_json,'$.state','pending','$.retryAt',?) WHERE id=?").bind(error.retryAt.getTime(),notice.id).run();
      // Uncertain transport keeps the unknown fence and is never blindly replayed.
    }
  }
}

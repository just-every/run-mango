import {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
import {ProviderTransportError} from '@/core/shared/platform';
import {createSuppressionWriter} from '@/core/features/audience/suppression-writer';
import {canonicalEmail,canonicalPhone} from '@/core/features/audience/identity';
import {ulid,sha256} from '@/core/shared/ids';
import {smsSegments} from '@/core/features/sms/segments';
import {prepareSmsTransportGuard} from '@/core/features/sms/transport-guard';
import {activeProviderHolds,recordProviderHold,senderDomain} from './provider-holds';
import type { AppConfig, DeliveryRequest, SenderAdapter } from '@/core/shared/platform';
import type { Database } from '@/core/platform/db/client';
import { boundPolicy } from './transport-policy';

export {ProviderDeferredError} from '@/core/shared/provider-deferred-error';
/** Every purpose shares both even spacing and an atomic rolling-minute segment
 * budget. Variable-size SMS cannot borrow the next minute's carrier allowance. */
export async function reserveTransport(database:Pick<Database,'$client'>, scope:string, perMinute:number, units=1, now=Date.now()) {
  if(!Number.isFinite(perMinute)||perMinute<=0||!Number.isSafeInteger(units)||units<1) throw new Error('Provider pacing policy unavailable.');
  if(units>perMinute)throw new ProviderDeferredError(new Date(now+60000),'message-exceeds-provider-budget');
  const id=ulid(now),client=database.$client;
  const results=await client.batch([
    client.prepare('DELETE FROM provider_pacing_reservations WHERE scope=? AND reserved_at<=?').bind(scope,now-60000),
    client.prepare(`INSERT INTO provider_pacing_reservations(id,scope,reserved_at,units)
      SELECT ?,?,?,? WHERE COALESCE((SELECT next_at FROM provider_pacing WHERE scope=?),0)<=?
      AND COALESCE((SELECT SUM(units) FROM provider_pacing_reservations WHERE scope=? AND reserved_at>?),0)+?<=?`)
      .bind(id,scope,now,units,scope,now,scope,now-60000,units,perMinute),
    client.prepare(`INSERT INTO provider_pacing(scope,next_at,updated_at)
      SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM provider_pacing_reservations WHERE id=?)
      ON CONFLICT(scope) DO UPDATE SET next_at=excluded.next_at,updated_at=excluded.updated_at`)
      .bind(scope,now+60000*units/perMinute,now,id),
  ]);
  if(results[1].meta.changes===1)return;
  const current=await client.prepare(`SELECT p.next_at,
    (SELECT MIN(reserved_at)+60000 FROM provider_pacing_reservations WHERE scope=? AND reserved_at>?) AS window_at
    FROM provider_pacing p WHERE p.scope=?`).bind(scope,now-60000,scope).first<{next_at:number;window_at:number|null}>();
  const spacing=current?.next_at??now;
  throw new ProviderDeferredError(new Date(Math.ceil(Math.max(now+1,spacing,spacing>now?0:current?.window_at??now+60000))));
}
export function pacedAdapter(adapter:SenderAdapter, database:Database, config:AppConfig):SenderAdapter {
  const provider=adapter.channel==='email'?config.mailProvider??'resend':'mobile-message';
  const credential=adapter.channel==='email'?config.mailProviderApiKey:config.modules.sms.enabled?config.modules.sms.config.providerApiKey:'';
  const policy=()=>boundPolicy(config.deliveryPolicies?.[provider],credential);
  return {...adapter,
    ...(adapter.inspectSender?{async inspectSender(sender:string) {
      const inspection=await adapter.inspectSender!(sender);
      if(provider==='resend'&&inspection.provider.state==='passed'&&inspection.provider.observedAt) {
        await recordProviderHold(database,{provider,scope:`domain:${senderDomain(sender)}`,reason:'domain-not-verified',held:false,
          effectiveAt:inspection.provider.observedAt,evidenceId:`domain-read:${inspection.provider.observedAt}`,detail:'A fresh authenticated domain read reports the same sending domain verified.'});
      }
      return inspection;
    }}:{}),
    async capabilities() {
      const capabilities=await adapter.capabilities();
      if(config.deliveryPolicies?.[provider]&&!await policy())return {...capabilities,canSendMarketing:false,detail:'Provider policy evidence does not match the configured credential.'};
      if(adapter.channel==='sms') {
        const p=await policy();
        if(!p?.carrierPerMinute||!p.providerPerMinute) return {...capabilities,canSendMarketing:false,detail:'An account-bound provider policy covering permitted carriers and segment limits is required.'};
      }
      return capabilities;
    },
    async send(request:DeliveryRequest) {
      const p=await policy();
      if(config.deliveryPolicies?.[provider]&&!p)throw new ProviderDeferredError(new Date(Date.now()+60000),'provider-policy-unavailable');
      if(adapter.channel==='sms') {
        let check;try {check=await adapter.validateSender(request.sender,'AU');}
        catch {throw new ProviderDeferredError(new Date(Date.now()+60000),'sender-verification-unavailable');}
        await recordProviderHold(database,{provider,scope:`sender:${request.sender}`,reason:'sender-unavailable',held:!check.ready,
          effectiveAt:Date.now(),evidenceId:`active-senders:${Date.now()}`,detail:check.detail});
      }
      const holds=await activeProviderHolds(database,provider,adapter.channel,request.content.from?.email??request.sender);
      if(holds.length)throw new ProviderDeferredError(new Date(Date.now()+60000),'provider-hold');
      const outage=await database.$client.prepare("SELECT 1 FROM provider_outages WHERE channel=? AND state='paused'").bind(adapter.channel).first();
      if(outage)throw new ProviderDeferredError(new Date(Date.now()+60000),'provider-outage');
      const local=adapter.channel==='email'?config.emailHandoffsPerMinute:config.modules.sms.enabled?config.modules.sms.config.handoffsPerMinute:0;
      if(adapter.channel==='sms'&&(!p?.carrierPerMinute||!p.providerPerMinute)) throw new ProviderDeferredError(new Date(Date.now()+60000),'provider-policy-unavailable');
      const limit=Math.min(local,p?.providerPerMinute??local,p?.carrierPerMinute??local);
      // One encoding calculation is shared by review and transport; Unicode is enabled when required.
      const units=adapter.channel==='sms'?smsSegments(request.content.text).segments:1;
      const finalSmsGuard=adapter.channel==='sms'?await prepareSmsTransportGuard(database,config,request):undefined;
      try {
        await reserveTransport(database,`${provider}:${p?.account??'installation'}`,limit,units);
        finalSmsGuard?.();
        const handoff=await adapter.send(request);
        if(handoff.disposition==='accepted')await finalSmsGuard?.accepted();
        if(handoff.complianceHold)await recordProviderHold(database,{provider,...handoff.complianceHold,held:true,effectiveAt:Date.now(),evidenceId:`receipt:${handoff.providerMessageId}`,detail:'Provider substituted the requested sender; provider acceptance is retained.'});
        return handoff;
      }catch(error) {
        await finalSmsGuard?.failed(error);
        if(error instanceof ProviderTransportError) {
          if(error.failure.hold)await recordProviderHold(database,{provider,...error.failure.hold,held:true,effectiveAt:Date.now(),evidenceId:`refusal:${request.idempotencyKey}`,detail:error.failure.detail});
          if(error.failure.restriction) {
            const destination=(adapter.channel==='email'?canonicalEmail(request.to):canonicalPhone(request.to))!;
            const occurredAt=new Date();
            await createSuppressionWriter(database)({id:ulid(),destination,destinationHash:await sha256(`${config.contactHashSalt}:${destination}`),channel:adapter.channel,cause:error.failure.restriction,occurredAt});
          }
        }
        throw error;
      }
    },
  };
}

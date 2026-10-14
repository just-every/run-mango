import type { AppConfig, DeliveryPolicy } from '@/core/shared/platform';
import { sha256 } from '@/core/shared/ids';

export function readDeliveryPolicies(value?:string): AppConfig['deliveryPolicies'] {
  if(!value) return undefined;
  const parsed: unknown=JSON.parse(value);
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)) throw new Error('Delivery policy must be an object.');
  for(const [provider,raw] of Object.entries(parsed)) {
    if(!['resend','sendgrid','mobile-message'].includes(provider)||!raw||typeof raw!=='object'||Array.isArray(raw)) throw new Error('Invalid provider delivery policy.');
    const p=raw as DeliveryPolicy;
    if(!/^[a-f0-9]{64}$/.test(p.credentialDigest)||!p.account||!p.evidence||!/^https:\/\//.test(p.evidence)) throw new Error('Provider policy requires credential-bound account and provider evidence URL.');
    for(const k of ['lookupWindowMs','providerPerMinute','carrierPerMinute'] as const) if(p[k]!==undefined&&(!Number.isSafeInteger(p[k])||p[k]!<=0)) throw new Error('Invalid provider policy limit.');
    if(p.scopes!==undefined&&(!Array.isArray(p.scopes)||p.scopes.some(scope=>typeof scope!=='string'||!scope)))throw new Error('Provider policy scopes must be explicit permission names.');
    if(p.lookupHistorySince!==undefined&&(typeof p.lookupHistorySince!=='string'||!Number.isFinite(Date.parse(p.lookupHistorySince))))throw new Error('Provider lookup history must have a valid timestamp.');
    if(p.webhookId!==undefined&&(typeof p.webhookId!=='string'||!p.webhookId.trim()))throw new Error('Provider event history requires its webhook identity.');
    if(p.carrierPerMinute&&!p.carrierScope) throw new Error('Carrier policy must name its provider-declared scope.');
  }
  return parsed as AppConfig['deliveryPolicies'];
}
export async function boundPolicy(policy:DeliveryPolicy|undefined, credential:string) {
  return policy&&policy.credentialDigest===await sha256(credential)?policy:undefined;
}

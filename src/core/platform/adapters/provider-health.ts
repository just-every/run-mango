import type { ProviderHealth } from '@/core/shared/platform';
import { boundedJson } from './bounded-read';
import { asRecord } from './http';

export async function probeProvider(provider: 'sendgrid'|'resend'|'mobile-message', credential: string, signal?: AbortSignal): Promise<ProviderHealth> {
  try {
    const url = provider==='sendgrid'?'https://api.sendgrid.com/v3/scopes':provider==='resend'?'https://api.resend.com/usage':'https://api.mobilemessage.com.au/v1/account';
    const authorization = provider==='mobile-message'?`Basic ${btoa(credential)}`:`Bearer ${credential}`;
    const data = asRecord(await boundedJson(url,{Authorization:authorization},{signal}), 'provider-health-schema');
    let valid=false;
    if(provider==='sendgrid') valid=Array.isArray(data.scopes)&&data.scopes.every(v=>typeof v==='string')&&data.scopes.includes('mail.send');
    if(provider==='mobile-message') valid=data.status==='complete'&&typeof data.credit_balance==='number'&&Number.isFinite(data.credit_balance);
    if(provider==='resend') {
      const emails=asRecord(data.emails,'provider-health-schema');
      valid=data.object==='usage'&&['daily','monthly'].every(key=>{
        const quota=asRecord(emails[key],'provider-health-schema');
        return ['used','sent','received'].every(k=>Number.isFinite(quota[k])&&Number(quota[k])>=0)
          && (quota.limit===null||Number.isFinite(quota.limit))&&typeof quota.resets_at==='string'&&Number.isFinite(Date.parse(quota.resets_at));
      });
    }
    return {reachable:valid, code:valid?'authenticated-read-succeeded':'provider-health-schema', observedAt:new Date(), evidence:'API reachability and read authorization only'};
  } catch(error) {
    const message=error instanceof Error?error.message:'';
    return {reachable:false,code:/^provider-read-http-\d{3}$/.test(message)?message:'provider-health-unavailable',observedAt:new Date(),evidence:'No successful authenticated read'};
  }
}

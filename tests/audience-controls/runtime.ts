import {expect} from '@playwright/test';
import {createApp} from '../../src/core/app/app';
import {native} from '../approval-binding/native';
import type {composeFixture} from '../sender-verification/test-runtime';
import type {ChannelStatus} from '../../src/core/features/audience/service';
export const rule=(field='email',value='@example.test',comparator='contains')=>JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field,comparator,value}]});
export const segment=(name='Newsletter readers')=>({name,inclusionRuleJson:rule(),exclusionRulesJson:'[]'});
export async function requests(f:ReturnType<typeof composeFixture>) {
  const token='synthetic-audience-controls-bootstrap-token-over-thirty-two-bytes';
  const bindings={...f.bindings,AUTH_SETUP_TOKEN:token};
  f.platform.config.authSetupToken=token;
  const app=createApp(bindings,f.platform);let cookie='';
  async function call(path:string,body?:unknown,method=body===undefined?'GET':'POST',authenticated=true) {
    return app.fetch(new Request(`https://mango.example.test${path}`,{method,headers:{Host:'mango.example.test',Origin:'https://mango.example.test','CF-Connecting-IP':'192.0.2.20','Content-Type':'application/json',...(authenticated?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),bindings);
  }
  const response=await call('/auth/bootstrap',{token,displayName:'Controls operator'});expect(response.status).toBe(303);cookie=response.headers.get('set-cookie')!.split(';')[0];
  async function json(path:string,body?:unknown,method?:string) {const response=await call(path,body,method);const value=await response.json() as any;expect(response.status,JSON.stringify(value)).toBeLessThan(300);return value;}
  return {call,json};
}
export async function runtime() {const h=await native();return {...h,...await requests(h.f)};}
/** Existing recorded permissions, independent of any sending provider. */
export async function recordedMergeContact(h:Awaited<ReturnType<typeof runtime>>,index:number,emailStatus:ChannelStatus,smsStatus:ChannelStatus) {
  const id=`synthetic-mango-merge-${index}`,email=[id,'example.test'].join('@'),phone=`+1555555${String(index).padStart(4,'0')}`;
  const at=Date.now()-60000;
  await h.f.db.batch([
    h.f.db.prepare(`INSERT INTO contacts(id,email,display_name,email_status,sms_status,email_status_at,sms_status_at,last_activity_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id,email,id,emailStatus,smsStatus,at,at,at,at,at),
    h.f.db.prepare(`INSERT INTO contact_email_addresses(id,contact_id,email,channel_status,channel_status_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?)`).bind(`${id}-email`,id,email,emailStatus,at,at,at),
    h.f.db.prepare(`INSERT INTO contact_phones(id,contact_id,phone_e164,channel_status,channel_status_at,identity_status,created_at,updated_at)
      VALUES (?,?,?,?,?,'active',?,?)`).bind(`${id}-sms`,id,phone,smsStatus,at,at,at),
    ...(['email','sms'] as const).map(channel=>h.f.db.prepare(`INSERT INTO consent_evidence
      (id,contact_id,channel,destination,brand_or_legal_sender,message_category,frequency_disclosure,destination_jurisdiction,capture_method,capture_source,consent_text,consent_version,occurred_at,confirmation_required,confirmed_at,created_at,updated_at)
      VALUES (?,?,?,?,?,'offers','Weekly','US','recorded','synthetic-mango','Weekly offers','v1',?,1,?,?,?)`)
      .bind(`${id}-${channel}-consent`,id,channel,channel==='email'?email:phone,'Mango',at,at,at,at)),
  ]);
  return {id,email,phone,emailStatus,smsStatus};
}
export async function importContacts(h:Awaited<ReturnType<typeof requests>>,states:string[],prefix='control') {
  const now=new Date(Date.now()-60000).toISOString(),confirmed=new Date(Date.now()-30000).toISOString();
  const csv='Email Address,Email Marketing Status,First Name,OPTIN_TIME,CONFIRM_TIME\n'+states.map((state,index)=>`${prefix}-${index}@example.test,${state},${prefix} ${index},${now},${confirmed}`).join('\n');
  const preview=await h.json('/api/audience/import-preview',{files:[{name:`${prefix}.csv`,preset:'csv-subscribed',csv}],consent:{brandOrLegalSender:'Mango',messageCategory:'offers',frequencyDisclosure:'Weekly',destinationJurisdiction:'AU',consentText:'I agree to receive weekly offers.',consentVersion:'v1'}});
  let result=await h.json('/api/audience/imports',{fingerprint:preview.fingerprint});
  while(result.job.state==='applying'||result.job.state==='queued')result=await h.json(`/api/audience/imports/${result.job.id}/resume`,{});
  return (await h.json('/api/audience')).contacts.filter((contact:any)=>contact.email.startsWith(prefix+'-')) as {id:string;email:string;emailStatus:string}[];
}
export async function createCampaign(h:Awaited<ReturnType<typeof requests>>,inclusionRuleJson:string,name='Audience controls') {
  return h.json('/api/campaigns',{composition:{senderName:'Mango',fromEmail:'offers@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Test Street',name,inclusionRuleJson,exclusionRulesJson:'[]',messageCategory:'offers',emailSubject:'Newsletter',preheader:'Newsletter preview',emailBody:'<p>Newsletter</p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Unsubscribe</a>',emailText:'Newsletter {{physical_address}} Unsubscribe {{unsubscribe_url}}',steps:[{channel:'email',timezone:'UTC',scheduledAt:new Date(Date.now()-1000).toISOString(),sendByAt:new Date(Date.now()+3600000).toISOString(),whyThisTime:'Operator selected time'}]}});
}

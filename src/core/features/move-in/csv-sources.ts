import type {ImportInput} from '../audience/import-types';
import {sha256} from '@/core/shared/ids';
import {planAttestations,type PlannedAttestation} from './incumbent-attestation';
import type {AttestationScope} from './incumbent-policy';
export const sourcePresets:Record<string,string>={beehiiv:'beehiiv',omnisend:'Omnisend',customerio:'Customer.io',activecampaign:'ActiveCampaign',klaviyo:'Klaviyo'};
const key=(s:string)=>s.toLowerCase().replace(/[\s_-]/g,'');
export function sourceIdentity(preset:string,name:string){return {sourceKey:preset+':'+name,sourceName:sourcePresets[preset]+' — '+name};}
export async function csvAttestations(input:ImportInput,db:D1Database):Promise<PlannedAttestation[]> {
  const files=input.files.filter(f=>Object.hasOwn(sourcePresets,f.preset));
  if(!files.length)return [];
  const digest=await sha256(JSON.stringify(files.map(f=>({name:f.name,preset:f.preset,csv:f.csv}))));
  return planAttestations(files.map(f=>({name:f.name,...sourceIdentity(f.preset,f.name),provider:f.preset})),digest,input.consent as AttestationScope,input.attestations??[],db);
}
const statuses:Record<string,string>={active:'subscribed',subscribed:'subscribed',unsubscribed:'unsubscribed',bounced:'suppressed','hard-bounced':'suppressed',cleaned:'suppressed',suppressed:'suppressed',complained:'suppressed',inactive:'non-subscribed',pending:'non-subscribed','non-subscribed':'non-subscribed',nonsubscribed:'non-subscribed',never_subscribed:'non-subscribed',never:'non-subscribed',unconfirmed:'non-subscribed'};
const rank:Record<string,number>={subscribed:0,'non-subscribed':1,unsubscribed:2,suppressed:3};
const list=(value:string|undefined)=>{if(!value)return [];const parsed=value.trim().startsWith('[')?JSON.parse(value):value.split(/[;,]/);if(!Array.isArray(parsed)||parsed.some(v=>typeof v!=='string'))throw new Error('Source tags and lists must be names.');return [...new Set(parsed.map(v=>v.trim()).filter(Boolean))];};
/** Explicit source facts only. Missing and unfamiliar states never imply permission. */
export function csvSourceRow(preset:string,raw:Record<string,string>,mapped:Record<string,string>) {
  const fields=Object.fromEntries(Object.entries(raw).map(([name,value])=>[key(name),value]));
  const get=(...names:string[])=>names.map(n=>fields[key(n)]).find(v=>v?.trim())??'';
  const sourceStates=Object.entries(fields).filter(([name])=>['status','emailstatus','emailmarketingstatus','subscriptionstatus','subscriptionstate','emailconsent','emailconsentstatus'].includes(name)).map(([,v])=>v.trim().toLowerCase().replace(/\s+/g,'-')).filter(Boolean);
  let status=sourceStates.length?'subscribed':'non-subscribed',unknown=false;
  for(const value of sourceStates){const state=preset==='activecampaign'?({'1':'subscribed','2':'unsubscribed','3':'suppressed','0':'non-subscribed'}[value]??statuses[value]):statuses[value];if(!state){unknown=true;status=rank[status]>1?status:'non-subscribed';}else if(rank[state]>rank[status])status=state;}
  const asserted=(value:string)=>Boolean(value&&!['false','0','no','null'].includes(value.trim().toLowerCase()));
  for(const [name,state] of [['unsubscribed','unsubscribed'],['unsubscribedat','unsubscribed'],['emailunsubscribed','unsubscribed'],['bounced','suppressed'],['hardbounced','suppressed'],['suppressed','suppressed'],['issuppressed','suppressed']] as const)if(asserted(fields[name]??'')&&rank[state]>rank[status])status=state;
  const attributes=get('attributes','properties');let properties:Record<string,unknown>={...raw};
  if(attributes){const parsed=JSON.parse(attributes);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Source attributes must be an object.');properties={...properties,...parsed};}
  return {status,unknown,values:{...mapped,email:mapped.email||get('email','email_address'),country:mapped.country||get('country','country_code'),display_name:mapped.display_name||get('name','full_name'),
    occurred_at:mapped.occurred_at||get('optin_time','consent_timestamp','email_consent_timestamp','subscribed_at'),confirmed_at:mapped.confirmed_at||get('confirm_time'),last_changed:mapped.last_changed||get('last_changed','updated_at'),
    source_properties_json:JSON.stringify(properties),source_tags_json:JSON.stringify(list(get('tags','tag'))),source_topics_json:JSON.stringify(list(get('lists','list_name','segments'))),source_status:sourceStates.join('; ')||'source-status-missing'}};
}

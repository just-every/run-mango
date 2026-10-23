import type {AudienceSnapshot} from './import-types';
import {canonicalEmail,canonicalPhone} from './identity';
const columns:Record<string,string>= {
 incumbent_consent_links:'id,contact_id,attestation_id,evidence_at,time_quality,source_facts_json',
 audience_import_observations:'id,contact_id,source_file,source_row,source_status,source_display_name,capture_method,capture_source,optin_time,confirm_time,capture_ip,confirmation_ip,created_at,updated_at',
 consent_confirmations:'id,consent_evidence_id,contact_id,channel,token_digest,sent_at,expires_at,confirmed_at,created_at,updated_at',
 contacts:'id,email,display_name,email_status,sms_status,email_status_at,sms_status_at,source_customer_record_id,merge_lock,last_activity_at,created_at,updated_at',
 contact_email_addresses:'id,contact_id,email,channel_status,channel_status_at,created_at,updated_at',
 contact_phones:'id,contact_id,phone_e164,channel_status,channel_status_at,identity_status,time_zone,location_source,location_recorded_at,created_at,updated_at',
 consent_evidence:'id,contact_id,channel,destination,brand_or_legal_sender,sms_program,message_category,frequency_disclosure,destination_jurisdiction,capture_method,capture_source,consent_text,consent_version,occurred_at,confirmation_required,confirmed_at,created_at,updated_at',
 contact_history:'id,contact_id,kind,detail,occurred_at,created_at,updated_at',
 contact_suppressions:'id,contact_id,channel,destination_hash,cause,occurred_at,provider_event_id,created_at,updated_at',
 surviving_opt_outs:'id,destination_hash,channel,reason,occurred_at,created_at,updated_at',
 mango_audience_hashes:'id,contact_id,channel,destination_hash,owned_opt_out_id,owned_suppression_ids',
 consent_capture_metadata:'id,contact_id,capture_ip,confirmation_ip,created_at,updated_at',
};
const statuses=new Set(['subscribed','pending','non-subscribed','unsubscribed','suppressed']);
export function validateLedger(snapshot:AudienceSnapshot){
 const contact=snapshot.tables.contacts[0];
 for(const [table,rows] of Object.entries(snapshot.tables)){
  const expected=columns[table]?.split(',').sort().join(',');if(!expected)throw new Error('Unknown audience ledger table.');
  const ids=new Set();
  for(const row of rows){
   // An observation whose file had no name carries no name column (see import-read).
   const keys=table==='audience_import_observations'&&!Object.hasOwn(row,'source_display_name')?[...Object.keys(row),'source_display_name']:Object.keys(row);
   if(keys.sort().join(',')!==expected)throw new Error(`Invalid ${table} columns.`);
   if(typeof row.id!=='string'||!row.id||ids.has(row.id))throw new Error('Invalid or duplicate ledger identity.');ids.add(row.id);
   if('contact_id' in row && row.contact_id!==contact.id && !(table==='contact_suppressions'&&row.contact_id===null))throw new Error('Cross-contact ledger ownership is invalid.');
   for(const [key,value] of Object.entries(row)){
    if(key.endsWith('_at')&&value!==null&&(!Number.isSafeInteger(value)||Number(value)<0))throw new Error('Invalid ledger timestamp.');
    if(['email_status','sms_status','channel_status'].includes(key)&&!statuses.has(String(value)))throw new Error('Unknown channel status.');
   }
  }
 }
 const destinations=[...snapshot.tables.contact_email_addresses.map(row=>({channel:'email',destination:String(row.email)})),...snapshot.tables.contact_phones.map(row=>({channel:'sms',destination:String(row.phone_e164)}))];
 for(const item of destinations)if((item.channel==='email'?canonicalEmail(item.destination):canonicalPhone(item.destination))!==item.destination)throw new Error('Export destination is not canonical.');
 if(destinations.length!==snapshot.identities.length||new Set(snapshot.identities.map(item=>item.hash)).size!==snapshot.identities.length)throw new Error('Portable identity map does not match destinations.');
 for(const identity of snapshot.identities)if(!/^[a-f0-9]{64}$/.test(identity.hash)||!destinations.some(item=>item.channel===identity.channel&&item.destination===identity.destination))throw new Error('Invalid portable destination identity.');
 for(const table of ['contact_suppressions','surviving_opt_outs','mango_audience_hashes'])for(const row of snapshot.tables[table])if(!snapshot.identities.some(identity=>identity.hash===row.destination_hash&&identity.channel===row.channel))throw new Error('Suppression is outside the exported contact.');
 for(const item of snapshot.tables.mango_audience_hashes){
  if(item.owned_opt_out_id && !snapshot.tables.surviving_opt_outs.some(row=>row.id===item.owned_opt_out_id&&row.destination_hash===item.destination_hash))throw new Error('Invalid owned opt-out.');
  const ids=JSON.parse(String(item.owned_suppression_ids));if(!Array.isArray(ids)||ids.some(id=>!snapshot.tables.contact_suppressions.some(row=>row.id===id&&row.destination_hash===item.destination_hash)))throw new Error('Invalid owned suppression.');
 }
 for(const evidence of snapshot.tables.consent_evidence){
  if(!destinations.some(item=>item.channel===evidence.channel&&item.destination===evidence.destination))throw new Error('Consent destination is outside the exported contact.');
  if(evidence.confirmed_at!==null && Number(evidence.confirmed_at)<Number(evidence.occurred_at))throw new Error('Confirmation precedes opt-in.');
 }
 for(const metadata of snapshot.tables.consent_capture_metadata)if(!snapshot.tables.consent_evidence.some(evidence=>evidence.id===metadata.id))throw new Error('Capture metadata has no consent evidence.');
 for(const table of ['contact_email_addresses','contact_phones'])for(const address of snapshot.tables[table])if(address.channel_status==='subscribed'){
  const destination=table==='contact_email_addresses'?address.email:address.phone_e164;const channel=table==='contact_email_addresses'?'email':'sms';
  if(!snapshot.tables.consent_evidence.some(evidence=>evidence.channel===channel&&evidence.destination===destination&&(evidence.confirmed_at||(channel==='email'&&evidence.capture_method==='incumbent-held'&&snapshot.tables.incumbent_consent_links.some(link=>link.id===evidence.id&&link.evidence_at===evidence.occurred_at)))&&[...(channel==='sms'?['sms_program']:[]),'brand_or_legal_sender','message_category','frequency_disclosure','destination_jurisdiction','capture_method','capture_source','consent_text','consent_version','occurred_at'].every(key=>Boolean(evidence[key]))))throw new Error('Subscribed destination requires complete confirmed consent.');
 }
 if(contact.merge_lock)throw new Error('A contact being merged cannot be imported.');
}

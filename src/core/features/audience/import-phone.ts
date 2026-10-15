import type { ImportState } from './import-state';
import type { AudienceSnapshot } from './import-types';
import { timestamp, type NormalizedImportRow } from './import-normalize';
import { sha256, ulid } from '@/core/shared/ids';
import { applyImportedChannel } from './import-channel';

/** SMS evidence is deliberately read only from independently mapped SMS columns. */
export async function addImportedPhone(state: ImportState, snapshot: AudienceSnapshot, before: AudienceSnapshot | undefined, row: NormalizedImportRow, salt: string, now: number, identity: string, id: string) {
 const phone=row.phone, hash=await sha256(`${salt}:${phone}`), values=row.values;
 let address=snapshot.tables.contact_phones.find(item=>item.phone_e164===phone);
 if(!address){
  if(snapshot.tables.contact_phones.length)throw new Error('This email belongs to a contact with a different phone. Resolve the identity explicitly.');
  address={id:ulid(now),contact_id:id,phone_e164:phone,channel_status:'non-subscribed',channel_status_at:now,identity_status:'active',time_zone:values.sms_time_zone||null,location_source:values.sms_location_source||null,location_recorded_at:timestamp(values.sms_location_recorded_at),created_at:now,updated_at:now};
  snapshot.tables.contact_phones.push(address);
  snapshot.identities.push({channel:'sms',destination:phone,hash});snapshot.hashes.push(hash);
 }
 if(!row.ledger && row.smsStatus==='subscribed'){
  const occurred=timestamp(values.sms_occurred_at)!, confirmed=timestamp(values.sms_confirmed_at)!,evidenceId=ulid(now);
  snapshot.tables.consent_evidence.push({id:evidenceId,contact_id:id,channel:'sms',destination:phone,brand_or_legal_sender:values.sms_brand,sms_program:values.sms_program,message_category:values.sms_category,frequency_disclosure:values.sms_frequency,destination_jurisdiction:values.sms_jurisdiction,capture_method:values.sms_capture_method,capture_source:values.sms_capture_source,consent_text:values.sms_consent_text,consent_version:values.sms_consent_version,occurred_at:occurred,confirmation_required:1,confirmed_at:confirmed,created_at:now,updated_at:now});
  snapshot.tables.consent_capture_metadata.push({id:evidenceId,contact_id:id,capture_ip:values.sms_capture_ip||null,confirmation_ip:values.sms_confirmation_ip||null,created_at:now,updated_at:now});
 }
 const result=applyImportedChannel(state,snapshot,before,'sms',phone,hash,row.smsStatus,Boolean(row.ledger),now,identity,id);
 row.smsStatus=result.status;if(result.kept)row.warnings.push(`SMS: ${result.kept}`);
 if(!snapshot.tables.mango_audience_hashes.some(item=>item.id===`${address.id}_hash`))snapshot.tables.mango_audience_hashes.push({id:`${address.id}_hash`,contact_id:id,channel:'sms',destination_hash:hash,owned_opt_out_id:null,owned_suppression_ids:'[]'});
}

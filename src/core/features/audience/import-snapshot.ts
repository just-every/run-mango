import type {ImportState} from './import-state';
import { sha256, ulid } from '@/core/shared/ids';
import { ownedTables, validateSnapshot } from './import-target';
import { restrictiveRank, timestamp, type NormalizedImportRow } from './import-normalize';
import type { AudienceSnapshot, ImportInput } from './import-types';
import { applyImportedChannel } from './import-channel';
import { addImportedPhone } from './import-phone';

/** keepName: an archive move-in leaves the name of a contact that existed before it; the
 * exported name is kept only in the import observation. A row with no name never renames. */
export async function importSnapshot(state: ImportState, row: NormalizedImportRow, input: ImportInput, salt: string, now: number, identity: string, keepName = false) {
  const phone=row.phone || row.ledger?.tables.contact_phones[0]?.phone_e164;
  const owners = new Set([row.email, phone].filter(Boolean).map(value=>state.byIdentity.get(String(value))).filter(Boolean));
  if(owners.size>1)throw new Error('Email and phone belong to different contacts. Resolve the identities explicitly before importing.');
  const ownerId=[...owners][0];
  const owner=ownerId?{id:ownerId}:undefined;
  const before = owner ? state.snapshots.get(owner.id) : undefined;
  const hash = await sha256(`${salt}:${row.email}`);
  const optOuts = state.optOuts.filter(item=>item.destination_hash===hash&&item.channel==='email'), existingOptOut = optOuts[0];
  const externalBlocks = state.suppressions.filter(item=>item.destination_hash===hash&&item.channel==='email');
  const id = owner?.id ?? row.ledger?.tables.contacts[0]?.id as string | undefined ?? ulid(now);
  if(state.existingIds.has(id) && id!==owner?.id)throw new Error('Export contact ID is owned by a different canonical identity.');
  let snapshot: AudienceSnapshot;
  if (row.ledger) {
    validateSnapshot(row.ledger);
    if(row.phone && !row.ledger.tables.contact_phones.some(item=>item.phone_e164===row.phone))throw new Error('Export phone identity does not match its ledger.');
    snapshot = structuredClone(row.ledger);
    const exported = snapshot.tables.contacts[0];
    if ((exported.email ?? '') !== row.email || (owner && exported.id !== owner.id)) throw new Error('Export identity does not match this destination contact.');
    if (before) throw new Error('Lossless Mango restoration requires an empty destination for each imported identity.');
    for (const [table, entries] of Object.entries(snapshot.tables)) {
      if (table !== 'contacts' && table !== 'surviving_opt_outs' && entries.some(item => item.contact_id !== id && !(table === 'contact_suppressions' && item.contact_id === null))) throw new Error('Cross-contact ledger entries are not allowed.');
    }
    if (row.email && !snapshot.tables.contact_email_addresses.some(address => address.email === row.email)) throw new Error('Export is missing its primary email identity.');
    const identityMap=await Promise.all(snapshot.identities.map(async identity=>({...identity,newHash:await sha256(`${salt}:${identity.destination}`)})));
    for(const identity of identityMap) for(const table of ['contact_suppressions','surviving_opt_outs','mango_audience_hashes']) for(const item of snapshot.tables[table]) if(item.destination_hash===identity.hash) item.destination_hash=identity.newHash;
    snapshot.identities=identityMap.map(({newHash,...identity})=>({...identity,hash:newHash}));
    snapshot.hashes=snapshot.identities.map(identity=>identity.hash);
  } else {
    snapshot = before ? structuredClone(before) : {tables:Object.fromEntries(ownedTables.map(table=>[table,[]])),hashes:row.email?[hash]:[],identities:row.email?[{channel:'email',destination:row.email,hash}]:[]};
    if (!before) {
      snapshot.tables.contacts = [{id,email:row.email||null,display_name:row.displayName||row.email||row.phone,email_status:'non-subscribed',sms_status:'non-subscribed',email_status_at:now,sms_status_at:now,source_customer_record_id:null,merge_lock:null,last_activity_at:null,created_at:now,updated_at:now}];
      snapshot.tables.contact_email_addresses = row.email ? [{id:ulid(now),contact_id:id,email:row.email,channel_status:'non-subscribed',channel_status_at:now,created_at:now,updated_at:now}] : [];
    }
    const priorName=snapshot.tables.contacts[0].display_name;
    if(row.displayName&&!(keepName&&before)){
      if(priorName!==row.displayName&&!snapshot.tables.contact_history.some(item=>item.kind==='contact-name'&&item.detail===priorName))snapshot.tables.contact_history.push({id:ulid(now),contact_id:id,kind:'contact-name',detail:priorName,occurred_at:now,created_at:now,updated_at:now});
      snapshot.tables.contacts[0].display_name = row.displayName;
    }
    snapshot.tables.contacts[0].updated_at = now;
    if(row.email && !snapshot.tables.contact_email_addresses.some(item=>item.email===row.email))throw new Error('This phone belongs to a contact with a different email. Resolve the identity explicitly.');
    const address = snapshot.tables.contact_email_addresses.find(item=>item.email === row.email)!;
    if(address) snapshot.tables.mango_audience_hashes = [...snapshot.tables.mango_audience_hashes.filter(item=>item.id !== `${address.id}_hash`),{id:`${address.id}_hash`,contact_id:id,channel:'email',destination_hash:hash,owned_opt_out_id:null,owned_suppression_ids:'[]'}];
    const occurred = row.status==='subscribed' ? timestamp(row.values.occurred_at) : null;
    const confirmed = row.status==='subscribed' ? timestamp(row.values.confirmed_at) : null;
    if (row.email && occurred && input.consent && row.status === 'subscribed') {
      const scope = input.consent; const evidenceId=ulid(now);
      snapshot.tables.contacts[0].last_activity_at=Math.max(Number(snapshot.tables.contacts[0].last_activity_at ?? 0),occurred);
      snapshot.tables.consent_evidence.push({id:evidenceId,contact_id:id,channel:'email',destination:row.email,brand_or_legal_sender:scope.brandOrLegalSender,sms_program:null,message_category:scope.messageCategory,frequency_disclosure:scope.frequencyDisclosure,destination_jurisdiction:scope.destinationJurisdiction,capture_method:row.values.capture_method || 'csv-import',capture_source:row.values.capture_source || `CSV import: ${row.file}`,consent_text:scope.consentText,consent_version:scope.consentVersion,occurred_at:occurred,confirmation_required:1,confirmed_at:confirmed,created_at:now,updated_at:now});
      snapshot.tables.consent_capture_metadata.push({id:evidenceId,contact_id:id,capture_ip:row.values.capture_ip || null,confirmation_ip:row.values.confirmation_ip || null,created_at:now,updated_at:now});
    }
    const sourceName=row.sourceDisplayName??row.displayName;
    snapshot.tables.audience_import_observations.push({id:ulid(now),contact_id:id,source_file:row.file,source_row:row.row,source_status:row.values.source_status,...(sourceName?{source_display_name:sourceName}:{}),capture_method:'csv-import',capture_source:`CSV import: ${row.file}`,optin_time:row.values.occurred_at || null,confirm_time:row.values.confirmed_at || null,capture_ip:row.values.capture_ip || null,confirmation_ip:row.values.confirmation_ip || null,created_at:now,updated_at:now});
    snapshot.tables.contact_history.push({id:ulid(now),contact_id:id,kind:'audience-import',detail:`${row.file} row ${row.row}: ${row.status}`,occurred_at:now,created_at:now,updated_at:now});
  }
  const emailResult = row.email ? applyImportedChannel(state,snapshot,before,'email',row.email,hash,row.status,Boolean(row.ledger),now,identity,id) : {status:'non-subscribed'};
  if(row.phone) await addImportedPhone(state,snapshot,before,row,salt,now,identity,id);
  const {status,kept}=emailResult;
  if(!before)for(const identity of snapshot.identities){
    const previousOptOut=state.optOuts.find(item=>item.destination_hash===identity.hash&&item.channel===identity.channel);
    const previousSuppressions=state.suppressions.filter(item=>item.destination_hash===identity.hash&&item.channel===identity.channel).map(item=>item.id);
    const address=identity.channel==='email'?snapshot.tables.contact_email_addresses.find(item=>item.email===identity.destination):snapshot.tables.contact_phones.find(item=>item.phone_e164===identity.destination);
    const entry={id:`${address!.id}_hash`,contact_id:id,channel:identity.channel,destination_hash:identity.hash,owned_opt_out_id:previousOptOut?null:snapshot.tables.surviving_opt_outs.find(item=>item.destination_hash===identity.hash)?.id ?? null,owned_suppression_ids:JSON.stringify(snapshot.tables.contact_suppressions.filter(item=>item.destination_hash===identity.hash&&!previousSuppressions.includes(String(item.id))).map(item=>item.id))};
    snapshot.tables.mango_audience_hashes=snapshot.tables.mango_audience_hashes.filter(item=>item.id!==entry.id);snapshot.tables.mango_audience_hashes.push(entry);
  }
  for (const rows of Object.values(snapshot.tables)) rows.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  return {id,snapshot,status,kept};
}

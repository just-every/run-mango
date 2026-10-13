import type {ImportState} from './import-state';
import { sha256, ulid } from '@/core/shared/ids';
import { ownedTables, validateSnapshot } from './import-target';
import { restrictiveRank, timestamp, type NormalizedImportRow } from './import-normalize';
import type { AudienceSnapshot, ImportInput } from './import-types';
import { keptForConsent, newerConfirmedConsent } from './import-consent';

/** keepName: an archive move-in leaves the name of a contact that existed before it; the
 * exported name is kept only in the import observation. A row with no name never renames. */
export async function importSnapshot(state: ImportState, row: NormalizedImportRow, input: ImportInput, salt: string, now: number, identity: string, keepName = false) {
  const phone=row.ledger?.tables.contact_phones[0]?.phone_e164;
  const ownerId=state.byIdentity.get(row.email || String(phone));
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
    snapshot = before ? structuredClone(before) : {tables:Object.fromEntries(ownedTables.map(table=>[table,[]])),hashes:[hash],identities:[{channel:'email',destination:row.email,hash}]};
    if (!before) {
      snapshot.tables.contacts = [{id,email:row.email,display_name:row.displayName||row.email,email_status:'non-subscribed',sms_status:'non-subscribed',email_status_at:now,sms_status_at:now,source_customer_record_id:null,merge_lock:null,last_activity_at:null,created_at:now,updated_at:now}];
      snapshot.tables.contact_email_addresses = [{id:ulid(now),contact_id:id,email:row.email,channel_status:'non-subscribed',channel_status_at:now,created_at:now,updated_at:now}];
    }
    const priorName=snapshot.tables.contacts[0].display_name;
    if(row.displayName&&!(keepName&&before)){
      if(priorName!==row.displayName&&!snapshot.tables.contact_history.some(item=>item.kind==='contact-name'&&item.detail===priorName))snapshot.tables.contact_history.push({id:ulid(now),contact_id:id,kind:'contact-name',detail:priorName,occurred_at:now,created_at:now,updated_at:now});
      snapshot.tables.contacts[0].display_name = row.displayName;
    }
    snapshot.tables.contacts[0].updated_at = now;
    const address = snapshot.tables.contact_email_addresses.find(item=>item.email === row.email)!;
    snapshot.tables.mango_audience_hashes = [...snapshot.tables.mango_audience_hashes.filter(item=>item.id !== `${address.id}_hash`),{id:`${address.id}_hash`,contact_id:id,channel:'email',destination_hash:hash,owned_opt_out_id:null,owned_suppression_ids:'[]'}];
    const occurred = row.status==='subscribed' ? timestamp(row.values.occurred_at) : null;
    const confirmed = row.status==='subscribed' ? timestamp(row.values.confirmed_at) : null;
    if (occurred && input.consent && row.status === 'subscribed') {
      const scope = input.consent; const evidenceId=ulid(now);
      snapshot.tables.contacts[0].last_activity_at=Math.max(Number(snapshot.tables.contacts[0].last_activity_at ?? 0),occurred);
      snapshot.tables.consent_evidence.push({id:evidenceId,contact_id:id,channel:'email',destination:row.email,brand_or_legal_sender:scope.brandOrLegalSender,sms_program:null,message_category:scope.messageCategory,frequency_disclosure:scope.frequencyDisclosure,destination_jurisdiction:scope.destinationJurisdiction,capture_method:row.values.capture_method || 'csv-export',capture_source:row.values.capture_source || `CSV import: ${row.file}`,consent_text:scope.consentText,consent_version:scope.consentVersion,occurred_at:occurred,confirmation_required:1,confirmed_at:confirmed,created_at:now,updated_at:now});
      snapshot.tables.consent_capture_metadata.push({id:evidenceId,contact_id:id,capture_ip:row.values.capture_ip || null,confirmation_ip:row.values.confirmation_ip || null,created_at:now,updated_at:now});
    }
    snapshot.tables.audience_import_observations.push({id:ulid(now),contact_id:id,source_file:row.file,source_row:row.row,source_status:row.values.source_status,...(row.displayName?{source_display_name:row.displayName}:{}),capture_method:'csv-export',capture_source:`CSV import: ${row.file}`,optin_time:row.values.occurred_at || null,confirm_time:row.values.confirmed_at || null,capture_ip:row.values.capture_ip || null,confirmation_ip:row.values.confirmation_ip || null,created_at:now,updated_at:now});
    snapshot.tables.contact_history.push({id:ulid(now),contact_id:id,kind:'audience-import',detail:`${row.file} row ${row.row}: ${row.status}`,occurred_at:now,created_at:now,updated_at:now});
  }
  let status = row.status;
  if (!Object.hasOwn(restrictiveRank,status)) throw new Error('Unknown email status.');
  const contact = snapshot.tables.contacts[0];
  const importedStatus=String(contact.email_status);
  const addressStatus=String(snapshot.tables.contact_email_addresses.find(item=>item.email===row.email)?.channel_status ?? 'non-subscribed');
  for(const restriction of [importedStatus,addressStatus])if(['unsubscribed','suppressed'].includes(restriction)&&restrictiveRank[restriction]>restrictiveRank[status])status=restriction;
  if(snapshot.tables.contact_suppressions.some(item=>item.destination_hash===hash&&item.channel==='email'))status='suppressed';
  const currentStatus = before?.tables.contacts[0].email_status as string | undefined;
  if (currentStatus && ['unsubscribed','suppressed'].includes(currentStatus) && restrictiveRank[currentStatus] > restrictiveRank[status]) status=currentStatus;
  // An earlier opt-out stays applied unless the person confirmed newer consent in Mango; a row
  // that itself unsubscribes or suppresses is a newer opt-out and always applies.
  const consent = row.ledger || restrictiveRank[status] >= restrictiveRank.unsubscribed ? undefined : newerConfirmedConsent(before, row.email, optOuts);
  // Confirmed consent keeps the contact's status: a row that does not opt the person out never lowers it.
  const keptStatus = Boolean(consent && !externalBlocks.length && currentStatus && restrictiveRank[currentStatus] < restrictiveRank[status]);
  if (externalBlocks.length) status='suppressed';
  else if (consent) { if (keptStatus) status=currentStatus!; }
  else if (existingOptOut && status !== 'suppressed') status='unsubscribed';
  const evidence = snapshot.tables.consent_evidence.filter(item=>item.channel==='email' && item.destination===row.email && item.confirmed_at);
  if (status==='subscribed' && !evidence.some(item=>['brand_or_legal_sender','message_category','frequency_disclosure','destination_jurisdiction','capture_method','capture_source','consent_text','consent_version','occurred_at'].every(key=>Boolean(item[key])))) status='non-subscribed';
  contact.email_status=status;
  for (const address of snapshot.tables.contact_email_addresses.filter(item=>item.email===row.email)) address.channel_status=status;
  if (!row.ledger) {
    contact.email_status_at=now;
    for (const address of snapshot.tables.contact_email_addresses.filter(item=>item.email===row.email)) {address.channel_status_at=now;address.updated_at=now;}
  }
  if (['unsubscribed','suppressed'].includes(status)) {
    // A file row that unsubscribes or suppresses, and a row this import makes unsubscribed or
    // suppressed, record an opt-out of their own that no before image carries, so no undo or
    // abandon can lift it (import-restrictions): not when the address already held an older
    // opt-out that a newer consent outranked, nor when only a suppression that can be lifted
    // restricted it before.
    const own = !row.ledger && (restrictiveRank[row.status] >= restrictiveRank.unsubscribed
      || (before !== undefined && Math.max(restrictiveRank[String(before.tables.contacts[0].email_status)] ?? 0, restrictiveRank[addressStatus] ?? 0) < restrictiveRank.unsubscribed));
    if (own || !snapshot.tables.surviving_opt_outs.some(item=>item.destination_hash===hash)) {
      const optOutId=ulid(now), reason=optOuts.some(item=>item.reason===`import-${status}`)?`import-${status}:${optOutId}`:`import-${status}`;
      snapshot.tables.surviving_opt_outs.push(!own && existingOptOut ? existingOptOut : {id:optOutId,destination_hash:hash,channel:'email',reason,occurred_at:now,created_at:now,updated_at:now});
    }
    if (status==='suppressed' && !snapshot.tables.contact_suppressions.some(item=>item.destination_hash===hash)) snapshot.tables.contact_suppressions.push(...(externalBlocks.length ? externalBlocks : [{id:ulid(now),contact_id:id,channel:'email',destination_hash:hash,cause:'import-cleaned-or-bounced',occurred_at:now,provider_event_id:`import:${identity}`,created_at:now,updated_at:now}]));
  }
  if(!before)for(const identity of snapshot.identities){
    const previousOptOut=state.optOuts.find(item=>item.destination_hash===identity.hash&&item.channel===identity.channel);
    const previousSuppressions=state.suppressions.filter(item=>item.destination_hash===identity.hash&&item.channel===identity.channel).map(item=>item.id);
    const address=identity.channel==='email'?snapshot.tables.contact_email_addresses.find(item=>item.email===identity.destination):snapshot.tables.contact_phones.find(item=>item.phone_e164===identity.destination);
    const entry={id:`${address!.id}_hash`,contact_id:id,channel:identity.channel,destination_hash:identity.hash,owned_opt_out_id:previousOptOut?null:snapshot.tables.surviving_opt_outs.find(item=>item.destination_hash===identity.hash)?.id ?? null,owned_suppression_ids:JSON.stringify(snapshot.tables.contact_suppressions.filter(item=>item.destination_hash===identity.hash&&!previousSuppressions.includes(String(item.id))).map(item=>item.id))};
    snapshot.tables.mango_audience_hashes=snapshot.tables.mango_audience_hashes.filter(item=>item.id!==entry.id);snapshot.tables.mango_audience_hashes.push(entry);
  }
  for (const rows of Object.values(snapshot.tables)) rows.sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  return {id,snapshot,status,...(consent && !externalBlocks.length && (optOuts.length || keptStatus) ? {kept:keptForConsent(consent,optOuts.length>0)} : {})};
}

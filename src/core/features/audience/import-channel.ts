import type { ImportState } from './import-state';
import type { AudienceSnapshot } from './import-types';
import { restrictiveRank } from './import-normalize';
import { ulid } from '@/core/shared/ids';
import { newerConfirmedConsent, keptForConsent } from './import-consent';
export function applyImportedChannel(state: ImportState, snapshot: AudienceSnapshot, before: AudienceSnapshot | undefined, channel: 'email'|'sms', destination: string, hash: string, sourceStatus: string, ledger: boolean, now: number, identity: string, id: string) {
 const optOuts = state.optOuts.filter(item=>item.destination_hash===hash&&item.channel===channel), existingOptOut=optOuts[0];
 const externalBlocks = state.suppressions.filter(item=>item.destination_hash===hash&&item.channel===channel);
 const addresses=snapshot.tables[channel==='email'?'contact_email_addresses':'contact_phones'];
 const addressKey=channel==='email'?'email':'phone_e164';
  let status = sourceStatus;
  if (!Object.hasOwn(restrictiveRank,status)) throw new Error('Unknown channel status.');
  const contact = snapshot.tables.contacts[0];
  const importedStatus=String(contact[`${channel}_status`]);
  const addressStatus=String(addresses.find(item=>item[addressKey]===destination)?.channel_status ?? 'non-subscribed');
  for(const restriction of [importedStatus,addressStatus])if(['unsubscribed','suppressed'].includes(restriction)&&restrictiveRank[restriction]>restrictiveRank[status])status=restriction;
  if(snapshot.tables.contact_suppressions.some(item=>item.destination_hash===hash&&item.channel===channel))status='suppressed';
  const currentStatus = before?.tables.contacts[0][`${channel}_status`] as string | undefined;
  if (currentStatus && ['unsubscribed','suppressed'].includes(currentStatus) && restrictiveRank[currentStatus] > restrictiveRank[status]) status=currentStatus;
  // An earlier opt-out stays applied unless the person confirmed newer consent in Mango; a row
  // that itself unsubscribes or suppresses is a newer opt-out and always applies.
  const consent = ledger || restrictiveRank[status] >= restrictiveRank.unsubscribed ? undefined : newerConfirmedConsent(before, destination, optOuts, channel);
  // Confirmed consent keeps the contact's status: a row that does not opt the person out never lowers it.
  const keptStatus = Boolean(consent && !externalBlocks.length && currentStatus && restrictiveRank[currentStatus] < restrictiveRank[status]);
  if (externalBlocks.length) status='suppressed';
  else if (consent) { if (keptStatus) status=currentStatus!; }
  else if (existingOptOut && status !== 'suppressed') status='unsubscribed';
  const evidence = snapshot.tables.consent_evidence.filter(item=>item.channel===channel && item.destination===destination && item.confirmed_at);
  if (status==='subscribed' && !evidence.some(item=>[...(channel === 'sms' ? ['sms_program'] : []),'brand_or_legal_sender','message_category','frequency_disclosure','destination_jurisdiction','capture_method','capture_source','consent_text','consent_version','occurred_at'].every(key=>Boolean(item[key])))) status='non-subscribed';
  contact[`${channel}_status`]=status;
  for (const address of addresses.filter(item=>item[addressKey]===destination)) address.channel_status=status;
  if (!ledger) {
    contact[`${channel}_status_at`]=now;
    for (const address of addresses.filter(item=>item[addressKey]===destination)) {address.channel_status_at=now;address.updated_at=now;}
  }
  if (['unsubscribed','suppressed'].includes(status)) {
    // A file row that unsubscribes or suppresses, and a row this import makes unsubscribed or
    // suppressed, record an opt-out of their own that no before image carries, so no undo or
    // abandon can lift it (import-restrictions): not when the address already held an older
    // opt-out that a newer consent outranked, nor when only a suppression that can be lifted
    // restricted it before.
    const own = !ledger && (restrictiveRank[sourceStatus] >= restrictiveRank.unsubscribed
      || (before !== undefined && Math.max(restrictiveRank[String(before.tables.contacts[0][`${channel}_status`])] ?? 0, restrictiveRank[addressStatus] ?? 0) < restrictiveRank.unsubscribed));
    if (own || !snapshot.tables.surviving_opt_outs.some(item=>item.destination_hash===hash)) {
      const optOutId=ulid(now), reason=optOuts.some(item=>item.reason===`import-${status}`)?`import-${status}:${optOutId}`:`import-${status}`;
      snapshot.tables.surviving_opt_outs.push(!own && existingOptOut ? existingOptOut : {id:optOutId,destination_hash:hash,channel:channel,reason,occurred_at:now,created_at:now,updated_at:now});
    }
    if (status==='suppressed' && !snapshot.tables.contact_suppressions.some(item=>item.destination_hash===hash)) snapshot.tables.contact_suppressions.push(...(externalBlocks.length ? externalBlocks : [{id:ulid(now),contact_id:id,channel:channel,destination_hash:hash,cause:channel==='sms'?'import-sms-suppression':'import-cleaned-or-bounced',occurred_at:now,provider_event_id:`import:${identity}`,created_at:now,updated_at:now}]));
  }

 return {status,...(consent && !externalBlocks.length && (optOuts.length || keptStatus) ? {kept:keptForConsent(consent,optOuts.length>0)} : {})};
}

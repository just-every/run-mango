import type {Platform} from '@/core/shared/platform';
import {createAudienceRepository} from '../repository';
import {selectedChannel} from '../eligibility';
import {sha256} from '@/core/shared/ids';
import {createContactErasure} from '../erasure/service';
import {bulkAuthority} from './authority';
import type {BulkJob,BulkItem} from './types';

export async function actOnContact(platform:Platform,job:BulkJob,item:BulkItem) {
  const db=platform.database.$client,id=item.contact_id;
  const contact=id&&await db.prepare('SELECT id,merge_lock FROM contacts WHERE id=?').bind(id).first<{id:string;merge_lock:string|null}>();
  if(job.action!=='erase'||!item.erasure_reference){
    if(!id||!contact)return 'contact-erased';
    if(contact.merge_lock)return 'contact-merge-in-progress';
  }
  if(job.action==='erase') {
    const service=createContactErasure(db,platform.config.contactHashSalt,{ASSETS_BUCKET:platform.blobs});
    const authority={destination:'mango',authorization:{principalId:job.principal_id,predicate:()=>bulkAuthority(job)}};
    let receipt=item.erasure_reference?await service.read(item.erasure_reference):await service.begin(id!,authority);
    if(!receipt)return 'contact-erased';
    await db.prepare('UPDATE contact_bulk_items SET erasure_reference=? WHERE job_id=? AND ordinal=?').bind(receipt.reference,job.id,item.ordinal).run();
    // A bounded group of native erasure stages retains the same frozen item.
    for(let stage=0;stage<8&&receipt?.state!=='complete';stage++)receipt=await service.advance(receipt!.reference,authority);
    return receipt?.state==='complete'?undefined:'pending-erasure';
  }
  if(job.action==='export')return;
  const repository=createAudienceRepository(platform.database);
  if(job.action==='topic') {
    const eligible=await selectedChannel(repository,id!,job.channel,new Date(),async(channel,destination)=>repository.hasDestinationSuppression(await sha256(`${platform.config.contactHashSalt}:${destination}`),channel));
    const covered=eligible?.consents.find(value=>value.category===job.value);
    const evidence=covered&&(await repository.listConsent(id!)).find(value=>value.channel===job.channel&&value.destination===eligible!.destination&&value.messageCategory===job.value&&((value.confirmedAt&&value.confirmedAt<=new Date())||(value.incumbentAt&&value.incumbentAt<=new Date())));
    if(!evidence)return 'missing-covering-consent';
    await db.prepare(`INSERT INTO contact_topic_memberships(contact_id,channel,topic,evidence_id,added_at)
      SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM contacts WHERE id=? AND merge_lock IS NULL)
      ON CONFLICT(contact_id,channel,topic) DO UPDATE SET evidence_id=excluded.evidence_id,added_at=excluded.added_at`)
      .bind(id,job.channel,job.value,evidence.id,job.created_at,id).run();
    return;
  }
  if(job.action==='suppress') {
    const values=job.channel==='email'?(await repository.listEmails(id!)).map(row=>row.email):(await repository.listPhones(id!)).map(row=>row.phoneE164);
    if(!values.length)return 'missing-channel-address';
    for(const [index,destination]of values.entries())await repository.recordProviderSuppressionAtomic({id:`${job.id}:${item.ordinal}:${index}`,destination,destinationHash:await sha256(`${platform.config.contactHashSalt}:${destination}`),channel:job.channel,cause:'owner-block',occurredAt:new Date(job.created_at),providerEventId:`integration:bulk:${job.id}:${item.ordinal}:${index}`});
    return;
  }
  await db.prepare(`INSERT INTO contact_tag_overrides(contact_id,tag,present) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM contacts WHERE id=? AND merge_lock IS NULL)
    ON CONFLICT(contact_id,tag) DO UPDATE SET present=excluded.present`).bind(id,job.value,job.action==='tag'?1:0,id).run();
}

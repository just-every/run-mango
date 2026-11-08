import type {Platform} from '@/core/shared/platform';
import type {createAudienceService} from '@/core/features/audience/service';
import {canonicalEmail} from '@/core/features/audience/identity';
import {createAudienceRepository} from '@/core/features/audience/repository';
import {sha256} from '@/core/shared/ids';
import {restrictionConnections,type RestrictionConnection} from './restriction-connections';
import {readMailchimpMembers,unsubscribeMailchimpMember} from './mailchimp-transport';

const failed='Mailchimp restriction synchronization failed. Retry before sending or disconnecting.';
async function note(platform:Platform,id:string,error:boolean) {
  await platform.database.$client.prepare(error
    ?'UPDATE incumbent_restriction_connections SET last_error=? WHERE id=?'
    :'UPDATE incumbent_restriction_connections SET last_error=NULL,last_success_at=? WHERE id=?')
    .bind(error?failed:Date.now(),id).run();
}
/** The ledger is the retry source. No recipient address or provider member mapping is retained. */
export async function writeRestriction(platform:Platform,destination:string,channel:'email'|'sms') {
  if(channel!=='email')return;
  for(const connection of await restrictionConnections(platform)) {
    try {await unsubscribeMailchimpMember(connection,destination);}
    catch {await note(platform,connection.id,true);}
  }
}
export function createRestrictionSync(platform:Platform,audience:ReturnType<typeof createAudienceService>) {
  const repository=createAudienceRepository(platform.database);
  async function synchronize(connection:RestrictionConnection) {
    const members=await readMailchimpMembers(connection);
    let incoming=0,outgoing=0;
    for(const member of members) {
      const destination=canonicalEmail(member.email_address);
      if(!destination)throw new Error(failed);
      const hash=await sha256(`${platform.config.contactHashSalt}:${destination}`);
      await repository.claimPortableRestrictions(platform.config.contactHashSalt,[destination]);
      const occurredAt=new Date(member.last_changed??Date.now());
      if(!Number.isFinite(occurredAt.getTime()))throw new Error(failed);
      if(member.status==='unsubscribed') {
        await audience.recordChannelOptOut({destination,channel:'email',reason:'incumbent-unsubscribe',occurredAt,
          stableId:`incumbent:${connection.id}:${hash}:${occurredAt.getTime()}`});incoming++;
      } else if(member.status==='cleaned') {
        await audience.recordProviderSuppression({destination,channel:'email',cause:'import-cleaned-or-bounced',occurredAt,
          providerEventId:`incumbent:${connection.id}:${hash}:${occurredAt.getTime()}`});incoming++;
      }
      const [optOut,suppressed,contact]=await Promise.all([repository.getSurvivingOptOut(hash,'email'),
        repository.hasDestinationSuppression(hash,'email'),repository.findContactByEmail(destination)]);
      // A verified fresh resubscribe may supersede a recipient opt-out locally;
      // this restriction-only connection never sends subscribed state upstream.
      if((optOut||suppressed||['unsubscribed','suppressed'].includes(contact?.emailStatus??''))
        && !['unsubscribed','cleaned'].includes(member.status)) {
        await unsubscribeMailchimpMember(connection,destination);outgoing++;
      }
    }
    await note(platform,connection.id,false);
    return {incoming,outgoing};
  }
  return async () => {
    const outcomes=[];
    for(const connection of await restrictionConnections(platform)) {
      try {outcomes.push({id:connection.id,...await synchronize(connection)});}
      catch {await note(platform,connection.id,true);throw new Error(failed);}
    }
    return outcomes;
  };
}

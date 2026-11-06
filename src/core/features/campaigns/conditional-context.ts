import type {Platform} from '@/core/shared/platform';
import {readContactProfile} from '@/core/features/audience/contact-profile';
import {createAudienceRepository} from '@/core/features/audience/repository';
import {selectedChannel} from '@/core/features/audience/eligibility';
import {sha256} from '@/core/shared/ids';
import {asRecord} from '@/core/features/audience/rule-values';
import type {ContentContext} from './conditional-content';

/** Read current facts; never retain a contact preview or grant subscription authority. */
export async function readContentContext(platform:Platform,contactId:string,revisionId?:string,now=new Date()):Promise<ContentContext|undefined> {
  const repository=createAudienceRepository(platform.database),db=platform.database.$client;
  if(!await repository.getContact(contactId))return undefined;
  const [profile,email]=await Promise.all([readContactProfile(platform,contactId),selectedChannel(repository,contactId,'email',now,
    async(channel,destination)=>repository.hasDestinationSuppression(await sha256(`${platform.config.contactHashSalt}:${destination}`),channel))]);
  // A campaign proposal records its actual triggering source IDs. Ordinary
  // newsletters have no trigger; no unrelated recent event is substituted.
  const event=revisionId?await db.prepare(`SELECT s.payload FROM source_records s JOIN proposals p ON EXISTS (SELECT 1 FROM json_each(p.trigger_events_json) e WHERE e.value=s.id)
    JOIN campaigns c ON c.proposal_id=p.id JOIN campaign_revisions r ON r.campaign_id=c.id
    WHERE r.id=? AND s.contact_id=? AND s.occurred_at<=? ORDER BY s.occurred_at DESC,s.id LIMIT 1`).bind(revisionId,contactId,now.getTime()).first<{payload:string}>():undefined;
  return {properties:profile.properties,segments:profile.segments.filter(s=>s.state==='member').map(s=>s.id),unavailableSegments:profile.segments.filter(s=>s.state==='unavailable').map(s=>s.id),topics:email?.consents.map(c=>c.category)??[],...(event?{event:asRecord(event.payload)}:{})};
}

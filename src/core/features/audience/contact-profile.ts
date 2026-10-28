import {readTypedProperty} from './properties/read';
import type { Platform } from '@/core/shared/platform';
import { sha256 } from '@/core/shared/ids';
import { createAudienceRepository } from './repository';
import { createStoreRepository } from '@/core/features/store/repository';
import {persistLinkHostSources} from '@/core/features/settings/link-hosts';
import { createStoreService } from '@/core/features/store/service';
import { createRuleMatcher } from './rule-matcher';
import { selectedChannel } from './eligibility';
import { segmentAvailability } from './segment-availability';
import { parseStructuredRules } from '@/core/features/lifecycle/rules';

export type ContactProfile = {
  properties: Record<string, unknown>; tags: string[]; definitions: import('./properties/types').PropertyDefinition[]; propertyErrors:Record<string,string>;
  mergedIdentities: Array<{id:string;occurredAt:number}>;
  segments: Array<{id:string;name:string;state:'member'|'unavailable'}>;
};

/** Uses the audience editor's matcher. Membership never grants sending authority. */
export async function readContactProfile(platform:Platform, contactId:string):Promise<ContactProfile> {
  const db=platform.database.$client, repository=createAudienceRepository(platform.database);
  const store=createStoreService(createStoreRepository(platform.database),()=>persistLinkHostSources(platform)), now=new Date();
  const [contact, profile, merged, saved]=await Promise.all([
    repository.getContact(contactId), repository.segmentProfile(contactId),
    db.prepare(`WITH RECURSIVE identities(id) AS (SELECT ? UNION SELECT m.merged_contact_id FROM contact_merges m JOIN identities i ON m.survivor_contact_id=i.id)
      SELECT merged_contact_id id,occurred_at occurredAt FROM contact_merges WHERE survivor_contact_id IN (SELECT id FROM identities) ORDER BY occurred_at DESC,id`).bind(contactId).all<{id:string;occurredAt:number}>(),
    db.prepare('SELECT id,name,inclusion_rule_json inclusion,exclusion_rules_json exclusions FROM audience_segments ORDER BY name,id').all<{id:string;name:string;inclusion:string;exclusions:string}>(),
  ]);
  const matcher=createRuleMatcher(repository,store,now,(id,channel)=>selectedChannel(repository,id,channel,now,
    async(c,destination)=>repository.hasDestinationSuppression(await sha256(`${platform.config.contactHashSalt}:${destination}`),c)));
  const segments:ContactProfile['segments']=[];
  if(contact)for(const segment of saved.results) {
    const rules=parseStructuredRules(segment.inclusion,segment.exclusions);
    if(!rules.ok || (await segmentAvailability(repository,rules.inclusion,rules.exclusions)).length ||
      (await store.freshness(rules.sourceTypes.filter(type=>type!=='contact'&&type!=='campaign').map(type=>type==='browsing'?'browsing-event':type) as Parameters<typeof store.freshness>[0],now)).length) {
      segments.push({id:segment.id,name:segment.name,state:'unavailable'});continue;
    }
    if(await matcher.groupMatches(contactId,rules.inclusion,contact) &&
      !(await Promise.all(rules.exclusions.map(rule=>matcher.predicateMatches(contactId,rule.predicate,contact)))).some(Boolean))
      segments.push({id:segment.id,name:segment.name,state:'member'});
  }
  const propertyErrors=Object.fromEntries(profile.definitions.flatMap(d=>{const read=readTypedProperty(d,profile.fields);return read.error?[[d.key,read.error]]:[];}));
  return {definitions:profile.definitions,propertyErrors,properties:profile.fields,tags:profile.tags,mergedIdentities:merged.results,segments};
}

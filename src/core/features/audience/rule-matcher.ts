import {matchesProperty} from './properties/comparison';
import {rfmRuleValue} from '@/core/features/insights/retention';
import type {AudiencePredicate, InclusionGroup} from '@/core/features/lifecycle/rules';
import type {createAudienceRepository} from './repository';
import type {createStoreService} from '@/core/features/store/service';
import {asRecord,fieldValue,eventFieldValue,matchesComparator} from './rule-values';
import {distanceBetweenZipsMiles} from './geo';

type Repository=ReturnType<typeof createAudienceRepository>;
type Store=Pick<ReturnType<typeof createStoreService>,'sourceRecords'|'sourceActivities'>;
const dayMs=86_400_000;
type ChannelEvidence={consents:Array<{category:string}>}|undefined;

/** Caches only within one review/handoff; no membership survives a fact change. */
export function createRuleMatcher(repository:Repository,store:Store,now:Date,channelEvidence:(id:string,channel:'email'|'sms')=>Promise<ChannelEvidence>) {
  const sourceCache=new Map<string,ReturnType<Store['sourceRecords']>>();
  const activityCache=new Map<string,ReturnType<Store['sourceActivities']>>();
  let rfm:ReturnType<Repository['segmentRfm']>|undefined;
  function records(id:string) {if(!sourceCache.has(id))sourceCache.set(id,store.sourceRecords(id));return sourceCache.get(id)!;}
  function activities(id:string) {if(!activityCache.has(id))activityCache.set(id,store.sourceActivities(id));return activityCache.get(id)!;}
  async function contactValue(id:string,p:AudiencePredicate,contact:Record<string,unknown>) {
    if(p.field==='property'||p.field==='tags') {
      const profile=await repository.segmentProfile(id);
      if(p.field==='property')return profile.fields[p.property!];
      return profile.tags;
    }
    if(p.field==='consent'||p.field==='topic') {
      const evidence=await channelEvidence(id,p.channel!);
      return Boolean(evidence&&(p.field==='consent'||evidence.consents.some(item=>item.category===p.topicId)));
    }
    if(p.field==='clicked')return repository.segmentClicked(id,p.channel!,new Date(now.getTime()-p.lookbackDays!*dayMs),now);
    // Payment never creates consent: the paid topic needs the contact's own channel evidence.
    if(p.field==='paidMember')return Boolean(await repository.segmentPaid(id)&&await channelEvidence(id,p.channel!));
    if(p.field.startsWith('rfm')) {
      rfm??=repository.segmentRfm(now);
      return rfmRuleValue((await rfm).get(id),p.field,p.currency??'USD');
    }
    if(['usState','zip','distanceMiles'].includes(p.field)) {
      const customer=(await records(id)).filter(r=>r.sourceType==='customer'&&r.occurredAt<=now).sort((a,b)=>b.updatedAt.getTime()-a.updatedAt.getTime())[0];
      if(!customer)return undefined;
      const payload=asRecord(customer.payload),location=fieldValue(payload,'location')??fieldValue(payload,'customer.location');
      if(!location||typeof location!=='object'||Array.isArray(location))return undefined;
      const address=location as Record<string,unknown>;
      if(address.countryCodeV2!=='US')return undefined;
      if(p.field==='usState')return address.provinceCode;
      const zip=typeof address.zip==='string'?address.zip.match(/^\d{5}(?:-\d{4})?$/)?.[0].slice(0,5):undefined;
      return p.field==='zip'?zip:zip?distanceBetweenZipsMiles(p.originZip!,zip):undefined;
    }
    return contact[p.field];
  }
  async function boughtValues(payload:Record<string,unknown>,p:AudiencePredicate) {
    if(!Array.isArray(payload.lines))return [];
    const values:unknown[]=[];
    for(const raw of payload.lines) {
      if(!raw||typeof raw!=='object')continue;
      const line=raw as Record<string,unknown>;
      if(typeof line.quantity==='number'&&line.quantity<=0)continue;
      if(p.field==='boughtProductId'){values.push(line.productId);continue;}
      const key=p.field==='boughtCollectionId'?'collectionIds':'category';
      const product=typeof line.productId==='string'?await repository.segmentCatalogProduct(line.productId):undefined;
      const actual=line[key]??product?.[key];
      values.push(...(Array.isArray(actual)?actual:[actual]));
    }
    return values;
  }
  function memberMatch(values:unknown[],p:AudiencePredicate) {
    if(p.comparator==='neq')return !values.some(value=>matchesComparator(value,'eq',p.value));
    return values.some(value=>matchesComparator(value,p.comparator==='contains'?'eq':p.comparator,p.value));
  }
  async function predicateMatches(id:string,p:AudiencePredicate,contact:Record<string,unknown>):Promise<boolean> {
    if(p.sourceType==='campaign')return repository.followupMember(String(p.value),id);
    if(p.sourceType==='contact') {
      if(p.field==='property'){const profile=await repository.segmentProfile(id),definition=profile.definitions.find(d=>d.key===p.property);if(definition)return matchesProperty(definition,profile.fields,p,now);}
      const value=await contactValue(id,p,contact);
      return p.field==='tags'?memberMatch(value as unknown[],p):matchesComparator(value,p.comparator,p.value);
    }
    const sourceType=p.sourceType==='browsing'?'browsing-event':p.sourceType;
    const earliest=p.lookbackDays===undefined?undefined:now.getTime()-p.lookbackDays*dayMs;
    const matching=(await records(id)).filter(source=>{
      if(source.sourceType!==sourceType)return false;
      const payload=asRecord(source.payload);
      const occurred=source.sourceType==='order'&&typeof payload.processedAt==='string'?Date.parse(payload.processedAt):source.occurredAt.getTime();
      if(!Number.isFinite(occurred)||occurred>now.getTime()||(earliest!==undefined&&occurred<earliest))return false;
      if(p.sourceType==='order'&&(p.field==='count'||p.field.startsWith('bought'))&&payload.test===true)return false;
      return (p.filters??[]).every(filter=>matchesComparator(eventFieldValue(payload,filter.field),filter.comparator,filter.value));
    });
    if(p.sourceType==='order'&&p.field==='count')return matchesComparator(new Set(matching.map(source=>`${source.provider}:${source.providerSourceId}`)).size,p.comparator,p.value);
    if(p.sourceType==='order'&&p.field.startsWith('bought')) {
      const values=(await Promise.all(matching.map(source=>boughtValues(asRecord(source.payload),p)))).flat();
      return memberMatch(values,p);
    }
    const allActivities=await activities(id);
    return matching.some(source=>{
      const related=allActivities.filter(activity=>activity.sourceRecordId===source.id);
      return (related.length?related:[undefined]).some(activity=>{
        const value=p.field==='sourceType'?source.sourceType:p.field==='providerSourceId'?source.providerSourceId:p.field==='occurredAt'?source.occurredAt.toISOString():p.field.startsWith('activity.')?activity?.[p.field.slice(9) as keyof NonNullable<typeof activity>]:fieldValue(asRecord(source.payload),p.field);
        return matchesComparator(value,p.comparator,p.value);
      });
    });
  }
  async function groupMatches(id:string,group:InclusionGroup,contact:Record<string,unknown>):Promise<boolean> {
    const results=await Promise.all([...group.predicates.map(p=>predicateMatches(id,p,contact)),...(group.groups??[]).map(child=>groupMatches(id,child,contact))]);
    return group.operator==='all'?results.every(Boolean):results.some(Boolean);
  }
  return {predicateMatches,groupMatches};
}

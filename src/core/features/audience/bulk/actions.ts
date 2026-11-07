import type {Platform} from '@/core/shared/platform';
import {sha256,ulid} from '@/core/shared/ids';
import {createAudienceRepository} from '../repository';
import {selectedChannel} from '../eligibility';
import {createSuppressionWriter} from '../suppression-writer';
import {z} from 'zod';

export const bulkActions=['tag','untag','export','suppress','erase','add-to-topic'] as const;
export type BulkAction=typeof bulkActions[number];
const label=z.string().trim().min(1).max(160).refine(value=>!/[\u0000-\u001f]/.test(value),'No control characters.');
export const actionParams={
  tag:z.object({tag:label}).strict(),untag:z.object({tag:label}).strict(),export:z.object({}).strict(),suppress:z.object({}).strict(),erase:z.object({}).strict(),
  'add-to-topic':z.object({topic:label,channel:z.enum(['email','sms']).default('email')}).strict(),
} as const;
/** Contacts handled per slice, sized so one queue message or request stays within the platform's query allowance. */
export const sliceSize:Record<BulkAction,number>={tag:500,untag:500,export:500,suppress:60,erase:1,'add-to-topic':80};
/** Cheap set-based actions finish inside the request when the selection is small; the rest are always durable jobs. */
export const inlineLimit=1000;
export const inlineActions:readonly BulkAction[]=['tag','untag','export'];

export type Item={position:number;contactId:string};
export type Outcome={position:number;outcome:'done'|'refused';reason?:string};
type Context={platform:Platform;jobId:string;params:Record<string,string>};
const ids=(items:Item[])=>JSON.stringify(items.map(item=>item.contactId));

async function liveContacts(platform:Platform,items:Item[]) {
  const rows=(await platform.database.$client.prepare('SELECT id,merge_lock AS mergeLock FROM contacts WHERE id IN (SELECT value FROM json_each(?))').bind(ids(items)).all<{id:string;mergeLock:string|null}>()).results;
  return new Map(rows.map(row=>[row.id,row]));
}
/** Split a slice into contacts that can be changed and refusals, each with its reason. */
async function admit(platform:Platform,items:Item[]) {
  const live=await liveContacts(platform,items),usable:Item[]=[],outcomes:Outcome[]=[];
  for(const item of items){
    const row=live.get(item.contactId);
    if(!row)outcomes.push({position:item.position,outcome:'refused',reason:'contact_missing'});
    else if(row.mergeLock)outcomes.push({position:item.position,outcome:'refused',reason:'merge_in_progress'});
    else usable.push(item);
  }
  return {usable,outcomes};
}
const done=(items:Item[]):Outcome[]=>items.map(item=>({position:item.position,outcome:'done'}));

export async function tagSlice({platform,params}:Context,items:Item[]) {
  const {usable,outcomes}=await admit(platform,items);
  if(usable.length)await platform.database.$client.prepare(`INSERT INTO integration_contact_profiles(contact_id,fields_json,tags_json)
    SELECT j.value,'{}',json_array(?) FROM json_each(?) j WHERE true
    ON CONFLICT(contact_id) DO UPDATE SET tags_json=CASE WHEN EXISTS(SELECT 1 FROM json_each(integration_contact_profiles.tags_json) t WHERE lower(t.value)=lower(?))
      THEN integration_contact_profiles.tags_json ELSE json_insert(integration_contact_profiles.tags_json,'$[#]',?) END`)
    .bind(params.tag,ids(usable),params.tag,params.tag).run();
  return [...outcomes,...done(usable)];
}

export async function untagSlice({platform,params}:Context,items:Item[]) {
  const {usable,outcomes}=await admit(platform,items),db=platform.database.$client;
  if(!usable.length)return outcomes;
  await db.prepare(`UPDATE integration_contact_profiles SET tags_json=COALESCE((SELECT json_group_array(t.value) FROM json_each(integration_contact_profiles.tags_json) t WHERE lower(t.value)<>lower(?)),'[]')
    WHERE contact_id IN (SELECT value FROM json_each(?))`).bind(params.tag,ids(usable)).run();
  // A tag that arrived with an imported profile is part of the immutable import record: say so rather than claim removal.
  const imported=new Set((await db.prepare(`SELECT DISTINCT h.contact_id AS id FROM contact_history h WHERE h.contact_id IN (SELECT value FROM json_each(?)) AND h.kind='incumbent-profile'
    AND EXISTS(SELECT 1 FROM json_each(json_extract(h.detail,'$.tags')) t WHERE lower(t.value)=lower(?))`).bind(ids(usable),params.tag).all<{id:string}>()).results.map(row=>row.id));
  return [...outcomes,...usable.map((item):Outcome=>imported.has(item.contactId)?{position:item.position,outcome:'refused',reason:'imported_tag_kept'}:{position:item.position,outcome:'done'})];
}

export async function exportSlice({platform}:Context,items:Item[]) {
  const live=await liveContacts(platform,items);
  return items.map((item):Outcome=>live.has(item.contactId)?{position:item.position,outcome:'done'}:{position:item.position,outcome:'refused',reason:'contact_missing'});
}

export async function suppressSlice({platform}:Context,items:Item[]) {
  const {usable,outcomes}=await admit(platform,items);
  const repository=createAudienceRepository(platform.database),write=createSuppressionWriter(platform.database),salt=platform.config.contactHashSalt;
  for(const item of usable){
    const [emails,phones]=await Promise.all([repository.listEmails(item.contactId),repository.listPhones(item.contactId)]);
    const targets=[...emails.map(row=>({channel:'email' as const,destination:row.email,status:row.channelStatus})),...phones.map(row=>({channel:'sms' as const,destination:row.phoneE164,status:row.channelStatus}))];
    if(!targets.length){outcomes.push({position:item.position,outcome:'refused',reason:'no_destination'});continue;}
    // A retried slice never stacks a second suppression on an address already suppressed.
    for(const target of targets.filter(row=>row.status!=='suppressed'))
      await write({id:ulid(),destination:target.destination,destinationHash:await sha256(`${salt}:${target.destination}`),channel:target.channel,cause:'suppressed',occurredAt:new Date()});
    outcomes.push({position:item.position,outcome:'done'});
  }
  return outcomes;
}

/** Topic permission needs the contact's own confirmed consent for that topic on a subscribed, unsuppressed channel;
 * a selection can never create it (CONT-015). Every contact without it is refused by name. */
export async function topicSlice({platform,jobId,params}:Context,items:Item[]) {
  const {usable,outcomes}=await admit(platform,items);
  const repository=createAudienceRepository(platform.database),db=platform.database.$client,salt=platform.config.contactHashSalt,now=new Date();
  const channel=params.channel as 'email'|'sms';
  const suppressed=async(kind:'email'|'sms',destination:string)=>repository.hasDestinationSuppression(await sha256(`${salt}:${destination}`),kind);
  for(const item of usable){
    const selected=await selectedChannel(repository,item.contactId,channel,now,suppressed);
    if(!selected||!selected.consents.some(consent=>consent.category===params.topic)){outcomes.push({position:item.position,outcome:'refused',reason:'no_covering_consent'});continue;}
    const evidence=(await repository.listConsent(item.contactId)).find(entry=>entry.channel===channel&&entry.destination===selected.destination&&entry.messageCategory===params.topic
      &&((entry.confirmedAt&&entry.confirmedAt<=now)||(entry.incumbentAt&&entry.incumbentAt<=now)));
    if(!evidence){outcomes.push({position:item.position,outcome:'refused',reason:'no_covering_consent'});continue;}
    await db.prepare('INSERT INTO contact_topic_memberships(contact_id,topic,channel,evidence_id,job_id,added_at) VALUES(?,?,?,?,?,?) ON CONFLICT(contact_id,topic) DO NOTHING')
      .bind(item.contactId,params.topic,channel,evidence.id,jobId,now.getTime()).run();
    outcomes.push({position:item.position,outcome:'done'});
  }
  return outcomes;
}

export const sliceRunners:Record<Exclude<BulkAction,'erase'>,(context:Context,items:Item[])=>Promise<Outcome[]>>={
  tag:tagSlice,untag:untagSlice,export:exportSlice,suppress:suppressSlice,'add-to-topic':topicSlice,
};

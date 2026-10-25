import type {Platform} from '@/core/shared/platform';
import {sha256,ulid} from '@/core/shared/ids';
import {createAudienceRepository} from './repository';
import {loadPreferenceSettings} from '../settings/preference-settings';
import {readPreferenceFacts} from './preference-facts';
import type {createAudienceService} from './service';

export function createPreferenceService(platform:Platform,audience:ReturnType<typeof createAudienceService>) {
  const db=platform.database.$client,repository=createAudienceRepository(platform.database);
  async function resolve(token:string,count=true) {
    let claims;try{claims=await platform.publicTokens.verify(token,'unsubscribe');}catch{return {kind:'invalid' as const};}
    const digest=await sha256(token),now=new Date();
    if(count&&await repository.takePublicTokenAllowance(digest,now)>10)return {kind:'rate-limited' as const};
    const action=await repository.getPublicActionToken(digest,'unsubscribe');
    if(!action||action.id!==claims.id||action.channel!=='email'||action.expiresAt<=now)return {kind:'invalid' as const};
    const contact=await repository.getContact(action.contactId);
    if(!contact?.email||contact.mergeLock)return {kind:'invalid' as const};
    const evidence=(await repository.listConsent(contact.id)).filter(row=>row.channel==='email'&&((row.confirmedAt&&row.confirmedAt<=now)||(row.incumbentAt&&row.incumbentAt<=now)));
    const topics=[...new Set(evidence.map(row=>row.messageCategory))].sort();
    return {kind:'ready' as const,contact,action,digest,now,topics,evidence,settings:await loadPreferenceSettings(db),facts:await readPreferenceFacts(db,contact.id,now)};
  }
  async function save(token:string,input:Record<string,unknown>) {
    const unsubscribe=input.unsubscribeAll===true||input.unsubscribeAll==='true';
    const state=await resolve(token,!unsubscribe);if(state.kind!=='ready')return state;
    const {contact,action,digest,now}=state,at=now.getTime();
    const allowed=new Set(['confirm','unsubscribeAll','pauseDays','displayName',...state.topics.map(topic=>'topic:'+topic)]);
    if(Object.keys(input).some(key=>!allowed.has(key)))return {kind:'invalid-input' as const};
    if(Object.hasOwn(input,'displayName')&&!state.settings.editableFields.includes('displayName'))return {kind:'invalid-input' as const};
    if(unsubscribe) {
      const result=await audience.unsubscribeWithToken(token,now,'link');if(result.kind!=='unsubscribed')return result;
      const id=ulid(at);
      await db.prepare("INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at) SELECT ?,?,'preference-unsubscribe-all',?,?,?,? WHERE EXISTS(SELECT 1 FROM contacts WHERE id=?)")
        .bind(id,contact.id,JSON.stringify({source:'preference center',choice:'unsubscribe-all'}),at,at,at,contact.id).run();
      return {kind:'saved' as const,unsubscribed:true};
    }
    const days=Number(input.pauseDays??0),until=days?at+days*86400000:0;
    if(until&&until<state.facts.pauseUntil)return {kind:'invalid-input' as const};
    const events:Array<{id:string;kind:string;detail:Record<string,unknown>;profile?:string}>=[];
    for(const topic of state.topics)if(input['topic:'+topic]==='withdraw'&&!state.facts.withdrawnTopics.includes(topic))events.push({id:ulid(at),kind:'preference-topic-withdrawal',detail:{source:'preference center',topicId:topic,choice:'unsubscribed',consentEvidenceIds:state.evidence.filter(row=>row.messageCategory===topic).map(row=>row.id)}});
    if(until>state.facts.pauseUntil)events.push({id:ulid(at),kind:'preference-pause',detail:{source:'preference center',pauseUntil:until,days}});
    if(typeof input.displayName==='string'&&input.displayName.trim()!==contact.displayName)events.push({id:ulid(at),kind:'preference-profile',profile:input.displayName.trim(),detail:{source:'preference center',field:'displayName',before:contact.displayName,after:input.displayName.trim()}});
    const guard=`EXISTS(SELECT 1 FROM public_action_tokens t JOIN contacts c ON c.id=t.contact_id WHERE t.token_digest=? AND t.contact_id=? AND t.id=? AND t.purpose='unsubscribe' AND t.channel='email' AND t.expires_at>? AND c.merge_lock IS NULL AND c.email IS NOT NULL)`;
    const params=[digest,contact.id,action.id,at],statements:D1PreparedStatement[]=[];
    for(const event of events) {
      const profileGuard=event.profile===undefined?'':" AND EXISTS(SELECT 1 FROM recipient_preference_settings s,json_each(s.fields_json) f WHERE s.id=1 AND f.value='displayName') AND display_name=?";
      statements.push(db.prepare(`INSERT INTO contact_history(id,contact_id,kind,detail,occurred_at,created_at,updated_at)
        SELECT ?,id,?,?,?,?,? FROM contacts WHERE id=? AND ${guard}${profileGuard}`)
        .bind(event.id,event.kind,JSON.stringify(event.detail),at,at,at,contact.id,...params,...(event.profile===undefined?[]:[contact.displayName])));
      if(event.profile!==undefined)statements.push(db.prepare('UPDATE contacts SET display_name=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM contact_history WHERE id=?)').bind(event.profile,at,contact.id,event.id));
      statements.push(db.prepare(`INSERT INTO lifecycle_audit_entries(id,operation_key,entity_type,entity_id,action,actor_type,actor_id,detail_json,occurred_at,created_at)
        SELECT ?,?,'contact',?,?,'system','recipient',?,?,? WHERE EXISTS(SELECT 1 FROM contact_history WHERE id=?)`)
        .bind(event.id,event.id,contact.id,event.profile===undefined?'contact.preferences-changed':'contact.profile-updated',JSON.stringify(event.detail),at,at,event.id));
    }
    if(events.length)statements.push(db.prepare('UPDATE audience_source_authority SET generation=generation+1 WHERE id=1 AND EXISTS(SELECT 1 FROM contact_history WHERE id IN (SELECT value FROM json_each(?)))').bind(JSON.stringify(events.map(event=>event.id))));
    statements.push(db.prepare(`SELECT 1 authorized WHERE ${guard}`).bind(...params));
    const results=await db.batch(statements);
    if(!results.at(-1)!.results.length)return {kind:'invalid' as const};
    return {kind:'saved' as const,unsubscribed:false};
  }
  return {resolve,save};
}

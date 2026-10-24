import {boundedJson} from '@/core/platform/adapters/bounded-read';
import {encodeCsv} from '../audience/csv';
export type SourceExtras={flows?:Array<{name:string;trigger:string;unsupported:string[]}>;notes:string[];templates:Array<{name:string;html:string}>;segments:Array<{name:string;conditions:string}>;history:Array<{email:string;kind:'order'|'click'|'open'|'event';occurredAt:string;data:Record<string,unknown>}>};
export type SourceExport={files:Array<{name:string;preset:string;csv:string}>;sourceExtras:SourceExtras};
const record=(value:unknown):Record<string,any>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid source record.');return value as Record<string,any>;};
const array=(value:unknown):Record<string,any>[]=>{if(!Array.isArray(value))throw new Error('Incomplete source collection.');return value.map(record);};
/** The credential exists only in this invocation and its HTTPS headers. */
export async function readSourceExport(provider:'activecampaign'|'klaviyo',endpoint:string,key:string):Promise<SourceExport>{
  const base=new URL(endpoint);
  if(base.protocol!=='https:'||base.port||base.username||base.password||base.search||base.hash)throw new Error('Invalid source endpoint.');
  if(provider==='activecampaign'?!/^[a-z0-9-]+\.(?:api-us1|api-us2|api-eu1|activehosted)\.com$/.test(base.hostname):base.origin!=='https://a.klaviyo.com')throw new Error('Source host is not permitted.');
  if(!['','/','/api','/api/','/api/3','/api/3/'].includes(base.pathname))throw new Error('Use the account API origin.');
  let totalBytes=0,requests=0;
  const origin=base.origin,prefix=provider==='activecampaign'?'/api/3/':'/api/';
  const get=async(path:string)=>{
    if(++requests>100)throw new Error('Source export exceeds the request budget.');
    const url=new URL(path,origin);
    if(url.origin!==origin||!url.pathname.startsWith(prefix)||url.username||url.password||url.hash||decodeURIComponent(url.href).includes(key))throw new Error('Source pagination left the declared API.');
    const result=record(await boundedJson(url.toString(),provider==='activecampaign'?{'Api-Token':key}:{Authorization:'Klaviyo-API-Key '+key,revision:'2025-01-15',accept:'application/json'},{maxBytes:2_000_000,deadlineMs:10000}));
    totalBytes+=new TextEncoder().encode(JSON.stringify(result)).byteLength;if(totalBytes>8_000_000)throw new Error('Source export exceeds the read budget.');return result;
  };
  const deliver=(value:SourceExport)=>{if(JSON.stringify(value).includes(key))throw new Error('Source reflected the credential.');return value;};
  const extras:SourceExtras={flows:[],notes:[],templates:[],segments:[],history:[]};
  if(provider==='activecampaign'){
    const collection=async(name:string)=>{const all:Record<string,any>[]=[];for(let page=0;page<50;page++){
      const result=await get(prefix+name+'?limit=100&offset='+page*100),rows=array(result[name]),total=Number(result.meta?.total);
      if(!Number.isSafeInteger(total)||total<0||total>5000)throw new Error('Source collection exceeds the read limit.');
      all.push(...rows);if(all.length>=total){if(all.length!==total)throw new Error('Source count changed during the read.');return all;}
      if(!rows.length)throw new Error('Incomplete source pagination.');
    }throw new Error('Source collection exceeds the page limit.');};
    const contacts=await collection('contacts'),lists=await collection('lists'),memberships=await collection('contactLists'),tags=await collection('tags'),contactTags=await collection('contactTags'),fields=await collection('fields'),values=await collection('fieldValues'),automations=await collection('automations');
    for(const list of lists)extras.segments.push({name:String(list.name),conditions:'Imported list membership snapshot; not a new consent grant.'});
    for(const flow of automations){extras.flows!.push({name:String(flow.name).slice(0,100),trigger:'Unavailable: source trigger definition',unsupported:['Unavailable: source action definitions']});extras.notes.push(`Automation ${String(flow.name)}: source status ${String(flow.status)}. Trigger and action definitions are unavailable in this API export; activation and conversion to executable flows are unsupported.`);}
    const rows=contacts.map(contact=>{
      const links=memberships.filter(m=>String(m.contact)===String(contact.id)),states=links.map(m=>String(m.status));
      let status=states.includes('3')?'suppressed':states.includes('2')?'unsubscribed':['1','subscribed'].includes(String(contact.status))?'subscribed':'non-subscribed';
      if(['2','unsubscribed'].includes(String(contact.status)))status='unsubscribed';if(['3','bounced','suppressed'].includes(String(contact.status)))status='suppressed';
      const properties=Object.fromEntries(values.filter(v=>String(v.contact)===String(contact.id)).map(v=>[String(fields.find(f=>String(f.id)===String(v.field))?.title??('Source field '+v.field)),v.value]));
      return [contact.email,status,contact.firstName??'',contact.lastName??'',contact.udate??'',JSON.stringify(properties),JSON.stringify(contactTags.filter(t=>String(t.contact)===String(contact.id)).map(t=>String(tags.find(tag=>String(tag.id)===String(t.tag))?.tag??t.tag))),JSON.stringify(links.map(m=>String(lists.find(l=>String(l.id)===String(m.list))?.name??m.list)))];
    });
    return deliver({files:[{name:'activecampaign-export.csv',preset:provider,csv:encodeCsv([['email','status','first name','last name','updated_at','properties','tags','lists'],...rows])}],sourceExtras:extras});
  }
  const collection=async(path:string)=>{const all:Record<string,any>[]=[];let next:string|undefined=prefix+path;const seen=new Set<string>();for(let page=0;page<50&&next;page++){
    if(seen.has(next))throw new Error('Source pagination loop.');seen.add(next);
    const result=await get(next);all.push(...array(result.data));if(all.length>5000)throw new Error('Source collection exceeds the read limit.');
    if(!result.links||!Object.hasOwn(result.links,'next'))throw new Error('Source pagination is incomplete.');
    next=result.links.next===null?undefined:String(result.links.next);
  }if(next)throw new Error('Source collection exceeds the page limit.');return all;};
  const profiles=await collection('profiles?additional-fields[profile]=subscriptions'),lists=await collection('lists'),segments=await collection('segments'),templates=await collection('templates'),metrics=await collection('metrics'),events=await collection('events'),flows=await collection('flows');
  const memberships=new Map<string,string[]>();
  for(const [kind,groups] of [['lists',lists],['segments',segments]] as const)for(const group of groups){
    const name=String(group.attributes?.name??group.id),conditions=kind==='segments'?`Unsupported source conditions: ${JSON.stringify(group.attributes?.definition??'definition not exposed')}. Membership is an import-time snapshot.`:'Imported list membership snapshot; not a new consent grant.';
    extras.segments.push({name,conditions});
    for(const member of await collection(`${kind}/${encodeURIComponent(String(group.id))}/profiles`)){const id=String(member.id);memberships.set(id,[...(memberships.get(id)??[]),name]);}
  }
  if(templates.length>100)throw new Error('Too many templates for one reviewed export.');
  for(const template of templates){const full=record((await get(prefix+'templates/'+encodeURIComponent(String(template.id)))).data),attributes=record(full.attributes);if(typeof attributes.html!=='string')throw new Error('Template HTML is unavailable.');extras.templates.push({name:String(attributes.name??template.id),html:attributes.html});}
  for(const flow of flows){const actions=await collection('flows/'+encodeURIComponent(String(flow.id))+'/flow-actions');extras.flows!.push({name:String(flow.attributes?.name??flow.id).slice(0,100),trigger:String(flow.attributes?.trigger_type??'Unavailable: source trigger definition').slice(0,300),unsupported:actions.map(a=>'Unavailable source step: '+String(a.attributes?.action_type??a.type)).concat('Unavailable: source conditions and execution')});extras.notes.push(`Flow ${String(flow.attributes?.name??flow.id)}: trigger ${String(flow.attributes?.trigger_type??'not exposed')}; source status ${String(flow.attributes?.status??'not exposed')}. Unsupported executable steps: ${actions.map(a=>String(a.attributes?.action_type??a.type)).join(', ')||'step definitions not exposed'}. Kept as an outline; nothing enrolled or activated.`);}
  for(const event of events){const attributes=record(event.attributes),profileId=String(event.relationships?.profile?.data?.id??''),email=profiles.find(p=>String(p.id)===profileId)?.attributes?.email,metricId=String(event.relationships?.metric?.data?.id??''),name=String(metrics.find(m=>String(m.id)===metricId)?.attributes?.name??'Unknown source event'),occurredAt=String(attributes.datetime??'');
    if(!Number.isFinite(Date.parse(occurredAt)))throw new Error('Source event time is unavailable.');
    if(!email){extras.notes.push(`Unmatched source event ${String(event.id)} (${name}) was not attached to a contact.`);continue;}
    extras.history.push({email:String(email),kind:/placed order|ordered product/i.test(name)?'order':/clicked email/i.test(name)?'click':/opened email/i.test(name)?'open':'event',occurredAt,data:{name,...record(attributes.event_properties??{})}});
  }
  const rows=profiles.map(profile=>{const a=record(profile.attributes),marketing=a.subscriptions?.email?.marketing,sms=a.subscriptions?.sms?.marketing,restricted=Array.isArray(marketing?.suppression)&&marketing.suppression.length>0;
    const status=restricted?'suppressed':marketing?.consent==='SUBSCRIBED'?'subscribed':marketing?.consent==='UNSUBSCRIBED'?'unsubscribed':'non-subscribed';
    if(sms?.consent==='SUBSCRIBED')extras.notes.push(`SMS for source profile ${String(profile.id)} is held non-subscribed unless independently complete original SMS evidence is supplied. Source time: ${String(sms.consent_timestamp??'missing')}; collection point: ${String(sms.method??'missing')}.`);
    return [a.email,status,a.first_name??'',a.last_name??'',marketing?.consent_timestamp??'',marketing?.method??'',a.updated??'',a.phone_number??'','non-subscribed',JSON.stringify({...record(a.properties??{}),sourceEmailMethod:marketing?.method??null,sourceSmsEvidence:sms??null}),JSON.stringify(memberships.get(String(profile.id))??[])];
  });
  return deliver({files:[{name:'klaviyo-export.csv',preset:provider,csv:encodeCsv([['email','status','first name','last name','consent_timestamp','capture_method','updated_at','phone','sms_status','properties','lists'],...rows])}],sourceExtras:extras});
}

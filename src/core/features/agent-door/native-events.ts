import type {NativeToolSpec} from './catalogue';
import {nativeToolSpecs} from './catalogue';

export function nativeEffect(spec:NativeToolSpec,args:Record<string,unknown>,value:unknown){
 const data=value&&typeof value==='object'?value as Record<string,unknown>:{};
 let entity=spec.entity;
 let target=String((data.job as {id?:string}|undefined)?.id??(data.segment as {id?:string}|undefined)?.id??(data.revision as {campaignId?:string}|undefined)?.campaignId??data.campaignId??data.id??args.survivorContactId??args.id??data.revisionId??entity);
 if(spec.name==='mango.delivery.dispatch')target=String((data.recipient as {campaign_id:string}).campaign_id);
 if(spec.name==='mango.reports.dispatch')target=String((data.delivery as {schedule_id:string}).schedule_id);
 if(data.campaignId&&['templates','proposals'].includes(entity))entity='campaigns';
 if(entity==='publications')entity='campaigns';
 const uri=['sender','connections'].includes(entity)?'mango://sender/readiness':entity==='store'?`mango://store/syncs/${encodeURIComponent(target)}`:`mango://${entity}/${encodeURIComponent(target)}`;
 const visible=['campaigns','contacts','segments','designs','flows','templates','blocks','assets','reports','access','sender','connections','store'].includes(entity);
 return {entity,target,uri,visible:visible&&spec.method!=='DELETE'};
}

/** Match the existing person API, without adding an agent credential to it. */
export function nativePersonEffect(method:string,path:string){
 for(const spec of nativeToolSpecs){
  if(spec.readOnly||spec.method!==method)continue;
  const route=spec.path==='native:draft-update'?'/api/campaigns/{id}':spec.path;
  if(!route.startsWith('/'))continue;
  const keys:string[]=[];
  const pattern=route.split('?')[0].split(/(\{\w+\})/).map(part=>{
   if(/^\{\w+\}$/.test(part)){keys.push(part.slice(1,-1));return '([^/]+)';}
   return part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }).join('');
  const match=new RegExp('^'+pattern+'$').exec(path);
  if(match)return {spec,args:Object.fromEntries(keys.map((key,index)=>[key,decodeURIComponent(match[index+1])]))};
 }
 return null;
}

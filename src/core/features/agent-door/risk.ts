import {ToolRefusal,type ClassAndFacts,type ToolContext,type ApprovalSummary} from '@/vendor/base/agent-door/index.ts';
import type {NativeToolSpec} from './catalogue';
import {hasPermission,type ProductRole, type Capability} from '../auth/permissions';
import {productAuthority} from '../auth/product-roles';
import {protectedRecords} from './records';
import type {NativeRequest} from './native';

export function nativePath(spec:NativeToolSpec,args:Record<string,unknown>){
 const body={...args};let path=spec.path.replace(/\{(\w+)\}/g,(_match,key)=>{
  if(typeof args[key]!=='string'||!args[key])throw new ToolRefusal('invalid_arguments');
  delete body[key];return encodeURIComponent(args[key] as string);
 });
 return {path,body};
}
export async function authority(spec:NativeToolSpec,args:Record<string,unknown>,ctx:ToolContext){
 if(spec.effect==='access'){
  const current=await productAuthority(ctx.db,String(args.id));
  if(!current)throw new ToolRefusal('not_found');
  const capabilities:Capability[]=['campaign.approve','campaign.send','draft.write','flow.activate','contact.unmasked','operators.manage','provider.connect','installation.erase'];
  const role=args.role as ProductRole;
  const widens=capabilities.some(cap=>hasPermission(role,cap)&&!hasPermission(current.role,cap))||(args.unmaskedContacts===true||hasPermission(role,'contact.unmasked'))&&!(current.unmaskedContacts||hasPermission(current.role,'contact.unmasked'));
  return {subject:String(args.id),widens};
 }
 if(spec.effect==='consent'){
  const contact=args.contact as {email?:string;phone?:string};
  return {subject:contact?.email??contact?.phone??'marketing:consent',widens:true};
 }
 if(spec.effect==='connection')return {subject:'mango:marketing-connection',widens:!spec.name.endsWith('.disconnect')};
 if(spec.effect==='signup'){
  const current=await ctx.db.prepare("SELECT challenge_enabled,embed_origins FROM signup_settings WHERE id='newsletter'").first<{challenge_enabled:number;embed_origins:string}>();
  const origins=JSON.parse(current?.embed_origins??'[]') as string[];
  return {subject:'mango:signup',widens:current?.challenge_enabled===1&&args.challengeEnabled===false||
   Array.isArray(args.embedOrigins)&&args.embedOrigins.some(origin=>!origins.includes(String(origin)))};
 }
 return null;
}
export async function classifyNative(spec:NativeToolSpec,args:Record<string,unknown>,ctx:ToolContext,native:NativeRequest):Promise<ClassAndFacts[]>{
 const facts:ClassAndFacts[]=[];
 const add=(classId:ClassAndFacts['class'],extra:Record<string,unknown>={},measure=1)=>facts.push({class:classId,facts:{measure,...extra}});
 if(spec.classes.includes('standard'))add('standard');
 if(spec.classes.includes('sensitive')){
  let count=0;
  if(spec.effect==='consent')count=1;
  else if(spec.readOnly&&!spec.path.startsWith('native:')){const {path,body}=nativePath(spec,args);count=protectedRecords(await native(path,'GET',body,ctx));}
  if(count)add('sensitive',{kind:'contact-permission-evidence'},count);
 }
 if(spec.classes.includes('external')){
  let recipients=1,counterparty:'internal'|'known'|'new'|'public'='known';
  if(spec.name.startsWith('mango.publications.'))counterparty='public';
  if(spec.name==='mango.campaigns.test_send'){const values=Array.isArray(args.to)?args.to:[args.to];recipients=new Set(values.map(String)).size;}
  if(spec.effect==='authorize'){
   const row=await ctx.db.prepare('SELECT candidate_count FROM campaign_audiences WHERE revision_id=? ORDER BY rowid DESC LIMIT 1').bind(String(args.revisionId)).first<{candidate_count:number}>();
   recipients=row?.candidate_count??0;
  }
  if(spec.name==='mango.reports.schedule'){
   const ids=Array.isArray(args.recipients)?args.recipients:[];
   const rows=(await ctx.db.prepare("SELECT id FROM oa_operators WHERE status='active' AND id IN(SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).all()).results;
   recipients=rows.length;counterparty='internal';
  }
  add('external',{counterparty},recipients);
 }
 if(spec.classes.includes('access')){const effect=await authority(spec,args,ctx);add('access',{direction:effect?.widens?'widens':'narrows'});}
 if(spec.classes.includes('security'))add('security',{setting:spec.effect==='signup'?'signup-protection':'marketing-sender'});
 if(spec.classes.includes('destructive'))add('destructive');
 if(spec.classes.includes('live')){
  let live=true;
  if(spec.effect==='running'){
   const row=await ctx.db.prepare('SELECT state FROM campaigns WHERE id=?').bind(String(args.id)).first<{state:string}>();
   if(!row)throw new ToolRefusal('not_found');live=['scheduled','dispatching','paused'].includes(row.state);
  }
  if(live)add('live',{service:spec.entity==='campaigns'?'newsletter-delivery':spec.entity==='flows'?'woocommerce-tag-and-exit':'newsletter-signup'});
 }
 return facts;
}
export async function nativeSummary(spec:NativeToolSpec,args:Record<string,unknown>,ctx:ToolContext):Promise<ApprovalSummary>{
 const id=String(args.id??args.revisionId??args.proposalId??args.reportId??spec.entity);
 const revision=await ctx.db.prepare('SELECT name,email_subject FROM campaign_revisions WHERE id=? OR campaign_id=? ORDER BY version DESC LIMIT 1').bind(id,id).first<{name:string;email_subject:string}>();
 let recipients:string[]=[];
 if(spec.name==='mango.campaigns.test_send')recipients=(Array.isArray(args.to)?args.to:[args.to]).map(String);
 if(spec.name==='mango.reports.schedule'){
  recipients=(await ctx.db.prepare("SELECT email FROM oa_operators WHERE id IN(SELECT value FROM json_each(?)) AND status='active' ORDER BY id").bind(JSON.stringify(args.recipients)).all<{email:string}>()).results.map(row=>row.email);
 }
 return {target:{id,name:revision?.name??spec.title},...(recipients.length?{recipients}:{}),
  ...(typeof args.role==='string'?{role:args.role}:{}),items:[revision?.email_subject??spec.title,JSON.stringify(args)]};
}

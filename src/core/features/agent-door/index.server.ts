import {advanceDesignJob,designCommand} from '../design-generation/advance';
import {advanceWooFlow} from '../store/woocommerce/flows';
import {createReportScheduler} from '../insights/report-scheduler';
import {nativeToolSpecs} from './catalogue';
import {toolPermission} from './authorization';
import {hasPermission} from '../auth/permissions';
import {productAuthority} from '../auth/product-roles';
import {createAgentDoor,ToolRefusal,type Trust,type AgentDoor,type ResourceDefinition} from '@/vendor/base/agent-door/index.ts';
import {createBusinessSettings} from '@/vendor/base/business-settings/index.ts';
import type {AppBindings,Platform} from '@/core/shared/platform';
import type {createAuthService} from '../auth/service';
import {mangoPeople} from './people';
import {mangoTools} from './tools';
import {notTools} from './catalogue';
import {resourceTemplates,readResource,protectedRecords} from './records';
import type {NativeRequest} from './native';

function installationTrust(environment:AppBindings,origin:string):Trust|null{
 const issuer=environment.RER_OWNER_CLAIM_ISSUER,installationId=environment.RER_INSTALLATION_ID;
 const keys=environment.RER_OWNER_CLAIM_PUBLIC_KEYS;
 if(!issuer&&!installationId&&!keys)return null;
 if(!issuer||!installationId||!keys||issuer!==environment.RER_MANAGEMENT_ORIGIN)throw new Error('Incomplete native installation trust.');
 return {issuer,installationId,appOrigin:origin,publicKeys:JSON.parse(keys)};
}
export function createMangoDoor(environment:AppBindings,platform:Platform,auth:ReturnType<typeof createAuthService>,native:NativeRequest,
 dispatch:(id:string)=>Promise<void>,prepare:(id:string,revisionId:string)=>Promise<unknown>,update:(id:string,args:Record<string,unknown>,actor:string)=>Promise<unknown>,sync:(id:string)=>Promise<unknown>){
 const origin=platform.config.publicBaseUrl.origin,db=environment.DB,people=mangoPeople(db,auth),trust=installationTrust(environment,origin);
 const resources:ResourceDefinition[]=resourceTemplates.map(uriTemplate=>({
  ...(uriTemplate.startsWith('mango://operations/')?{}:{scope:uriTemplate.startsWith('mango://assets/')?'mango:assets:attach':`mango:${uriTemplate.split('://')[1].split('/')[0]}:read`}),
  uriTemplate,name:uriTemplate,mimeType:'application/json',classes:['standard','sensitive'],
  async classify(record){const count=protectedRecords(record.json);return [{class:'standard',facts:{measure:1}},...(count?[{class:'sensitive' as const,facts:{measure:count,kind:'contact-permission-evidence'}}]:[])];},
  async read(uri,ctx){
   const current=await people.person(ctx.person.id);if(!current?.active)return null;
   try{return {json:await readResource(uri,{...ctx,person:current},native),untrusted:true};}
   catch(error){if(error instanceof ToolRefusal)return null;throw error;}
  },
 }));
 const door=createAgentDoor({seed:'mango',name:'Mango',specialist:'marketer',db,origin,trust,people,
  tools:mangoTools(native,dispatch,prepare,update,async(kind,args,ctx)=>{
    if(kind==='design-advance'){
      await advanceDesignJob(platform,designCommand(args.phase==='draft'?'design.draft':'design.layout',String(args.id)));
      return readResource(`mango://designs/${encodeURIComponent(String(args.id))}`,ctx,native);
    }
    if(kind==='source-advance')return sync(String(args.id));
    if(kind==='flow-enroll')return advanceWooFlow(platform,String(args.id),String(args.eventId));
    if(kind==='report-dispatch')return createReportScheduler(platform).dispatch(String(args.id));
    throw new ToolRefusal('not_found');
  }),resources,notTools,
  async currentScopes(principal){
    if(trust&&!await people.businessMember!(principal.person))return [];
    const current=await productAuthority(db,principal.person.id);if(!current)return [];
    const scopes=new Set(nativeToolSpecs.filter(spec=>hasPermission(current.role,toolPermission(spec))).map(spec=>spec.scope));
    scopes.add('events:read');
    return principal.scopes.filter(scope=>scopes.has(scope));
  },
  prompts:[{name:'newsletter',title:'Prepare and deliver a newsletter',description:'Read current store, sender and audience evidence, create an exact newsletter revision, follow company policy, inspect native delivery results.',
   clauses:['CAMP-003','CAMP-004','SEND-005','SEND-006'],messages:()=>[{role:'user',content:{type:'text',text:'Read store, sender and audience evidence. Prepare a canonical newsletter draft and structured audience. Refresh native checks, authorize its exact revision under company policy and inspect recipient outcomes. Opt-outs, sender lapse and changed content block sending. Keep provider uncertainty and imported engagement separate from delivery. Designs remain draft artifacts until explicitly saved. Generic flow graphs cannot send; only the WooCommerce tag-and-exit starter can run. Spend caps are not enforced.'}}]}],
 });
 const settings={handle(request:Request){
  // Shared settings validates its route, signed audience and body before the
  // native team adapter is needed. Local auth keeps this request's loopback
  // origin even when a draft's public links use the canonical HTTPS origin.
  let team:ReturnType<typeof auth.businessTeam>|undefined;
  const nativeTeam=()=>team??=auth.businessTeam(request);
  return createBusinessSettings({db,trust:environment.RER_BUSINESS_TRUST??null,
   business:{settings:1,values:['display_name'],team:{roles:{admin:'admin',member:'member'}}},
   team:{ownerEmail:async()=>await nativeTeam().ownerEmail?.()??null,prepare:input=>nativeTeam().prepare(input)},
  }).handle(request);
 }};
 return {door,settings};
}

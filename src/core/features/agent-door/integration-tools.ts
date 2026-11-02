import {ToolRefusal,type ToolDefinition,type ToolContext} from '@/vendor/base/agent-door/index.ts';
import type {Platform} from '@/core/shared/platform';
import type {createIntegrationService} from '../integrations/service';
import {readProfileMemberships} from '../integrations/profile-memberships';
import {IntegrationError} from '../integrations/schema';
import {hasPermission} from '../auth/permissions';
import {contactPrivacyRole,projectPrivateResponse} from '../auth/response-privacy';
import {nativeOperator} from './native';

/** Compatibility reads retain their native credential, pagination and scope. */
export function integrationTools(platform:Platform,service:ReturnType<typeof createIntegrationService>):ToolDefinition[]{
  const text={type:'string',maxLength:160};
  const definitions=[
    {verb:'contacts',scope:'contacts:read',properties:{cursor:text,email:{type:'string',format:'email',maxLength:320},segmentId:text,limit:{type:'integer',minimum:1,maximum:100}},required:[]},
    {verb:'segments',scope:'contacts:read',properties:{},required:[]},
    {verb:'memberships',scope:'contacts:read',properties:{id:text},required:['id']},
    {verb:'events',scope:'events:read',properties:{cursor:{type:'string',pattern:'^[0-9]+$'},limit:{type:'integer',minimum:1,maximum:100}},required:[]},
  ] as const;
  return definitions.map(definition=>({
    name:'mango.integrations.'+definition.verb,title:'Read scoped integration '+definition.verb,
    description:'Use an existing native API credential with its original creating sponsor and scope. Does not grant ingestion or send authority.',
    scope:'mango.integrations.'+definition.verb,readOnly:true,classes:['standard'],clauses:['INT-007','CONT-004'],
    inputSchema:{type:'object',properties:definition.properties,required:[...definition.required],additionalProperties:false},outputSchema:{type:'object'},untrusted:true,
    classify:()=>[{class:'standard',facts:{measure:1}}],
    async run(args,ctx:ToolContext){
      if(!ctx.clientId||ctx.agent.id!=='integration:'+ctx.clientId)throw new ToolRefusal('native_client_required');
      const credential=(await service.credentials.list()).find(item=>item.id===ctx.clientId);
      if(!credential||credential.revokedAt!==null||credential.createdBy!==ctx.person.id||!credential.scopes.includes(definition.scope))throw new ToolRefusal('insufficient_scope');
      const operator=await nativeOperator(platform,ctx.person.id);
      if(!hasPermission(operator.role,'contact.read'))throw new ToolRefusal('role_forbidden');
      try{
        if(definition.verb==='contacts')return {result:projectPrivateResponse(contactPrivacyRole(operator),'/api/audience',await service.contacts.list(credential.id,{...args,limit:Number(args.limit??50)}))};
        if(definition.verb==='segments')return {result:await service.contacts.segments(credential.id)};
        if(definition.verb==='memberships')return {result:await readProfileMemberships(platform,String(args.id))};
        const result=await service.events(String(args.cursor??'0'),Number(args.limit??50));
        return {result:hasPermission(contactPrivacyRole(operator),'contact.unmasked')?result:{...result,events:result.events.map((event)=>({...event,email:null}))}};
      }catch(error){if(error instanceof IntegrationError)throw new ToolRefusal(error.code,'Native integration refused',{status:error.status});throw error;}
    },
  }));
}

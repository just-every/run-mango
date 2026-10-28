import type {createIntegrationService} from '../integrations/service';
import type {Principal} from '@/vendor/base/agent-door/index.ts';
type Integrations=ReturnType<typeof createIntegrationService>;
export function credentialScopes(scopes: string[]){
  return [...(scopes.includes('contacts:read')?['mango.audience.read','mango.segments.read']:[]),
    ...(scopes.includes('campaigns:send')?['mango.campaigns.enqueue','mango.delivery.dispatch']:[])];
}
export function mangoCredentials(service:Integrations){
  return {
    async localCredentials(request:Request){
      const credential=await service.credentials.identify(request);
      if(!credential||credential.revokedAt!==null)return null;
      await service.credentials.takeAllowance(credential.id);
      return {sponsor:{id:credential.createdBy},agent:{id:'integration:'+credential.id,name:credential.name,specialist:'marketer'},
        scopes:credentialScopes(credential.scopes),clientId:credential.id};
    },
    async currentScopes(principal:Principal){
      if(principal.agent.id!=='integration:'+principal.clientId)return principal.scopes;
      const credential=(await service.credentials.list()).find(value=>value.id===principal.clientId);
      return credential&&credential.revokedAt===null&&credential.createdBy===principal.person.id?credentialScopes(credential.scopes):[];
    },
  };
}

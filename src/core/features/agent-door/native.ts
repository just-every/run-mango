import { ToolRefusal, type ToolContext, type ResourceContext } from '@/vendor/base/agent-door/index.ts';
import type { AuthenticatedOperator, createAuthService } from '../auth/service';
import { hasPermission, requiredPermission } from '../auth/permissions';
import { projectPrivateResponse, contactPrivacyRole } from '../auth/response-privacy';
import { runNativeAgent } from './native-context';

export type NativeRequest = (path:string,method:string,args:Record<string,unknown>,ctx:ToolContext|ResourceContext)=>Promise<unknown>;
/** Requests enter the same native route tree with an explicit, server-only principal.
 * They never create or borrow a person's session. */
export function nativeRequests(auth:ReturnType<typeof createAuthService>,origin:string,
  fetchNative:(request:Request,operator:AuthenticatedOperator)=>Promise<Response>):NativeRequest {
  return async(path,method,args,ctx)=>{
    const operator=await auth.operatorById(ctx.person.id);
    if(!operator)throw new ToolRefusal('unauthenticated');
    const asset=path==='native:asset';
    if(asset)path='/api/campaign-assets';
    const permission=requiredPermission(method,path);
    if(!hasPermission(operator.role,permission))throw new ToolRefusal('not_found');
    const url=new URL(path,origin),headers=new Headers({Origin:origin,'Content-Type':'application/json'});
    if(method==='GET')for(const [key,value]of Object.entries(args))if(value!==undefined)url.searchParams.set(key,String(value));
    let body:BodyInit|undefined=method==='GET'?undefined:JSON.stringify(args);
    if(asset){
      if(typeof args.data!=='string'||!/^[A-Za-z0-9+/]*={0,2}$/.test(args.data))throw new ToolRefusal('invalid_arguments');
      let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(args.data),c=>c.charCodeAt(0));}catch{throw new ToolRefusal('invalid_arguments');}
      const form=new FormData();form.set('file',new Blob([bytes as Uint8Array<ArrayBuffer>]),'image');body=form;headers.delete('Content-Type');
      if(args.source)url.searchParams.set('source',String(args.source));
    }
    const request=new Request(url,{method,headers,body});
    const run=async()=>{
      const response=await fetchNative(request,operator);
      if(response.status===204)return {status:'done'};
      const body=await response.json().catch(()=>null) as Record<string,unknown>|null;
      if(!response.ok)throw new ToolRefusal(response.status===403||response.status===404?'not_found':String(body?.error??body?.code??'native_refused'),'Native action refused',
        body?{native:body}:{});
      return projectPrivateResponse(contactPrivacyRole(operator),url.href,body);
    };
    return 'actor' in ctx?runNativeAgent(ctx,run):run();
  };
}

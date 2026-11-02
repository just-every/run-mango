import type {NativeTarget,ToolContext} from '@/vendor/base/agent-door/types.ts';
import type {Platform} from '@/core/shared/platform';
import {mangoResources} from './resources';
import {resourceLink} from './resource-links';

/** Resolve attribution through the same current native visibility as resources. */
export async function nativeTarget(platform:Platform,kind:string,args:Record<string,unknown>,ctx:ToolContext):Promise<NativeTarget|null>{
  let uri=await resourceLink(platform,kind,args,null);
  // Deletion's result links to retained activity; admission targets the still
  // present native segment before the deletion runs.
  if(kind==='segments.delete')uri='mango://segments/'+encodeURIComponent(String(args.id));
  if(kind==='designs.read'){
    const job=await platform.database.$client.prepare('SELECT id FROM design_jobs WHERE campaign_id=? ORDER BY created_at DESC LIMIT 1').bind(args.id).first<{id:string}>();
    uri=job?'mango://designs/'+encodeURIComponent(job.id):null;
  }
  if(!uri)return null;
  for(const resource of mangoResources(platform)){
    const value=await resource.read(uri,{db:ctx.db,person:ctx.person,agent:ctx.agent,scopes:[...ctx.scopes],clientId:ctx.clientId,consent:ctx.consent});
    if(value){
      const url=new URL(uri);
      return {kind:url.hostname,id:decodeURIComponent(url.pathname.split('/').at(-1)!)};
    }
  }
  return null;
}

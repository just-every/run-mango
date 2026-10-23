import {useResource} from '@/core/app/client/lib/use-resource';
import {Can} from '@/core/features/auth/ui/permissions';
function SourcePanel(){
 const {data,error,reload}=useResource<{hosts:string[];sources:Array<{host:string;source:string}>}>('/api/settings/link-hosts');
 return <section className="panel" aria-labelledby="link-host-sources-title"><h2 id="link-host-sources-title">Link host sources</h2><p>The list includes active sources and operator entries. Add storefront and image hosts explicitly when your connection has not supplied them.</p>
 {error?<p role="alert">The host sources could not be loaded.</p>:!data?<p>Loading host sources…</p>:<ul>{data.sources.map((row,index)=><li key={row.host+row.source+index} style={{overflowWrap:'anywhere'}}><strong>{row.host}</strong> — {row.source}</li>)}</ul>}
 <button type="button" className="secondary-action" onClick={()=>void reload()}>Refresh host sources</button></section>;
}
export function LinkHostSourcePanel(){return <Can permission="campaign.approve"><SourcePanel/></Can>;}

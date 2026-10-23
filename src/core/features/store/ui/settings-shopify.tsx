import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
type Installation={shop:string;connectedBy:string;connectedAt:number;expiresAt:number|null;pixelId:string|null;checkedAt:number|null;lastError:string|null;grantedScopes:string[];subscriptions:{id:string;topic:string;recreated:boolean}[]};
export function SettingsShopify(){
  const resource=useResource<{configured:boolean;scopes:string[];connection:Installation|null}>('/api/settings/shopify');
  const [shop,setShop]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function connect(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{const result=await requestJson<{url?:string}>('/api/settings/shopify/connect',{method:'POST',body:JSON.stringify({shop:shop.trim()})});if(result.status!==200||!result.data.url){setError('Shopify connection refused. Use the canonical myshopify.com domain and an Owner or Admin session.');return;}window.location.assign(result.data.url);}catch{setError('Shopify connection could not start.');}finally{setBusy(false);}}
  async function action(method:'POST'|'DELETE'){setBusy(true);setError('');try{const result=await requestJson(method==='POST'?'/api/settings/shopify/check':'/api/settings/shopify',{method});if(result.status!==200)setError('The Shopify installation check failed. Review the connection and permissions below.');await resource.reload();}catch{setError('Shopify status is unavailable.');}finally{setBusy(false);}}
  const connection=resource.data?.connection;
  return <section id="shopify" className="panel" aria-labelledby="shopify-title"><p className="eyebrow">Store connection</p><h2 id="shopify-title">Shopify</h2>
    <p>An Owner or Admin authorizes this installation on Shopify. Connecting imports no marketing consent. <a href="/docs/going-live#shopify">Shopify setup guide</a>.</p>
    {resource.loading?<p role="status">Loading Shopify…</p>:null}
    {resource.error?<p role="alert">Shopify status is unavailable. <button onClick={()=>void resource.reload()}>Try again</button></p>:null}
    {resource.data?<>
      {connection?<div role="status"><p>Authorized shop <strong>{connection.shop}</strong></p><p>Connected by {connection.connectedBy} on {new Date(connection.connectedAt).toLocaleString()}.</p>{connection.expiresAt?<p>Authorization expires {new Date(connection.expiresAt).toLocaleString()}; reconnect when it expires.</p>:null}{connection.lastError?<p className="inline-error">{connection.lastError}</p>:null}</div>:<p>No Shopify installation connected.</p>}
      <p>The shared connector and theme setup are not available yet. Incoming shared-app webhooks remain refused until the connector is connected. Store synchronization still uses the developer connection.</p>
      {resource.data.configured?<form className="integration-create" onSubmit={event=>void connect(event)}><label htmlFor="shopify-shop">Shopify shop domain<input id="shopify-shop" required pattern="[a-z0-9][a-z0-9\-]*\.myshopify\.com" placeholder="your-shop.myshopify.com" value={shop} onChange={event=>setShop(event.currentTarget.value)} disabled={busy}/></label><p>Shopify shows the permissions before you approve. Your choice is recorded with your operator identity and shop.</p><button className="primary-action" disabled={busy}>{busy?'Connecting…':'Connect Shopify'}</button></form>:<p>The Shopify app is not configured on this installation.</p>}
      <h3>Permissions</h3><ul aria-label="Shopify permissions">{resource.data.scopes.map(scope=><li key={scope}><code>{scope}</code> · {connection?.grantedScopes.includes(scope)?'granted':'missing'}</li>)}</ul>
      {connection?<>{connection.pixelId?<p>Storefront pixel activated.</p>:<p>Storefront pixel is not activated.</p>}<h3>Webhook subscriptions</h3><ul aria-label="Shopify webhook subscriptions">{connection.subscriptions.map(subscription=><li key={subscription.topic}><code>{subscription.topic}</code> · {subscription.recreated?'re-created by installation check':'connected'}</li>)}</ul><button type="button" className="secondary-action" disabled={busy} onClick={()=>void action('POST')}>Check Shopify installation</button><button type="button" className="secondary-action" disabled={busy} onClick={()=>void action('DELETE')}>Disconnect Shopify</button></>:null}
    </>:null}{error?<p role="alert" className="inline-error">{error}</p>:null}
  </section>;
}

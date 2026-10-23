import {Hono} from 'hono';
import {z} from 'zod';
import type {AppBindings,Platform} from '@/core/shared/platform';
import type {AuthVariables} from '@/core/features/auth/routes';
import type {createAuthService} from '@/core/features/auth/service';
import {activityStatement} from '@/core/features/auth/activity-record';
import {messagePage} from '@/core/features/audience/message-response';
import {installationScopes,shopDomain,verifyInstallQuery} from './install-security';
import {encryptShopifySecret} from './installation';
import {checkShopifyInstallation} from './health';

export function shopifyInstallRoutes(platform:Platform,environment:AppBindings,auth:ReturnType<typeof createAuthService>) {
  const db=platform.database.$client,settings=new Hono<{Variables:AuthVariables}>(),callbacks=new Hono();
  const appId=environment.SHOPIFY_APP_ID?.trim(),appSecret=environment.SHOPIFY_APP_SECRET?.trim();
  if(Boolean(appId)!==Boolean(appSecret))throw new Error(`${appId?'SHOPIFY_APP_SECRET':'SHOPIFY_APP_ID'} is required for Shopify installation OAuth.`);
  const configured=()=>Boolean(appId&&appSecret);
  settings.get('/settings/shopify',async context=>{
    const connection=await db.prepare('SELECT shop,scopes_json,connected_by AS connectedBy,connected_at AS connectedAt,expires_at AS expiresAt,pixel_id AS pixelId,subscriptions_json,checked_at AS checkedAt,last_error AS lastError FROM shopify_installation WHERE id=1').first<Record<string,any>>();
    return context.json({configured:configured(),scopes:installationScopes,connection:connection?{shop:connection.shop,connectedBy:connection.connectedBy,connectedAt:connection.connectedAt,expiresAt:connection.expiresAt,pixelId:connection.pixelId,checkedAt:connection.checkedAt,lastError:connection.lastError,grantedScopes:JSON.parse(connection.scopes_json),subscriptions:JSON.parse(connection.subscriptions_json)}:null});
  });
  settings.post('/settings/shopify/connect',async context=>{
    const operator=context.get('operator');if(!['owner','admin'].includes(operator.role))return context.json({error:'owner_or_admin_required'},403);
    if(!configured())return context.json({error:'shopify_app_unavailable'},503);
    if(platform.commerce&&platform.commerce.capabilities().provider!=='shopify')return context.json({error:'another_store_connected'},409);
    const body=z.object({shop:z.string().regex(shopDomain)}).strict().safeParse(await context.req.json().catch(()=>null));
    if(!body.success)return context.json({error:'invalid_shop_domain'},400);
    const origin=platform.config.publicBaseUrl.origin,id=origin+'#'+crypto.randomUUID(),expiresAt=new Date(Date.now()+600000);
    const state=await platform.publicTokens.issue({id,purpose:'shopify-installation',expiresAt});
    await db.batch([db.prepare('DELETE FROM shopify_oauth_states WHERE expires_at<=?').bind(Date.now()),
      db.prepare('INSERT INTO shopify_oauth_states(id,shop,operator_id,origin,scopes_json,expires_at) VALUES(?,?,?,?,?,?)').bind(id,body.data.shop,operator.id,origin,JSON.stringify(installationScopes),expiresAt.getTime()),
      activityStatement(db,{key:crypto.randomUUID(),action:'shopify-connect-authorized',entityType:'integration',entityId:body.data.shop,actorId:operator.id,detail:{shop:body.data.shop,requestedScopes:installationScopes},at:Date.now()})]);
    const url=new URL('https://'+body.data.shop+'/admin/oauth/authorize');
    url.search=new URLSearchParams({client_id:environment.SHOPIFY_APP_ID!,scope:installationScopes.join(','),redirect_uri:new URL('/auth/shopify/callback',origin).href,state}).toString();
    return context.json({url:url.href});
  });
  settings.post('/settings/shopify/check',async context=>{
    try {const subscriptions=await checkShopifyInstallation(platform);return subscriptions?context.json({subscriptions}):context.json({error:'shopify_not_connected'},409);}
    catch{return context.json({error:'shopify_installation_check_failed'},422);}
  });
  settings.delete('/settings/shopify',async context=>{
    const operator=context.get('operator');if(!['owner','admin'].includes(operator.role))return context.json({error:'owner_or_admin_required'},403);
    await db.batch([db.prepare('DELETE FROM shopify_installation'),db.prepare('DELETE FROM shopify_oauth_states'),
      activityStatement(db,{key:crypto.randomUUID(),action:'shopify-disconnected',entityType:'integration',entityId:'shopify',actorId:operator.id})]);
    return context.json({disconnected:true});
  });
  callbacks.get('/auth/shopify/callback',async context=>{
    context.header('Cache-Control','no-store');context.header('Referrer-Policy','no-referrer');
    const refuse=(reason:string,status:400|401|403|422=400)=>messagePage(context,status,{title:'Shopify connection refused',heading:'Shopify connection refused',text:reason});
    if(environment.MANGO_RESTORE_MODE==='1')return refuse('Restore maintenance is active. Connect Shopify after restore.');
    if(!configured())return refuse('The Shopify app is not configured on this installation.');
    let query;
    try {query=await verifyInstallQuery(new URL(context.req.url).searchParams,environment.SHOPIFY_APP_SECRET!);}catch(error){return refuse(error instanceof Error?error.message:'Shopify callback refused.');}
    let claims;
    try {claims=await platform.publicTokens.verify(query.state,'shopify-installation');}catch{return refuse('Shopify state is invalid or expired.');}
    const operator=await auth.authenticate(context.req.raw);
    if(!operator||!['owner','admin'].includes(operator.role))return refuse('Return in the Owner or Admin session that chose Connect Shopify.',403);
    const state=await db.prepare('UPDATE shopify_oauth_states SET used_at=? WHERE id=? AND shop=? AND operator_id=? AND origin=? AND used_at IS NULL AND expires_at>? RETURNING scopes_json').bind(Date.now(),claims.id,query.shop,operator.id,platform.config.publicBaseUrl.origin,Date.now()).first<{scopes_json:string}>();
    if(!state)return refuse('Shopify state was used, expired, or belongs to another shop or installation.');
    try {
      const response=await fetch('https://'+query.shop+'/admin/oauth/access_token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:new URLSearchParams({client_id:environment.SHOPIFY_APP_ID!,client_secret:environment.SHOPIFY_APP_SECRET!,code:query.code,expiring:'1'}),signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('Shopify refused the token exchange. Choose Connect Shopify again.');
      const token=await response.json().catch(()=>{throw new Error('Shopify returned invalid authorization JSON.');}) as {access_token?:unknown;refresh_token?:unknown;expires_in?:unknown;scope?:unknown};
      if(typeof token.access_token!=='string'||!token.access_token||typeof token.scope!=='string')throw new Error('Shopify returned incomplete authorization.');
      const granted=token.scope.split(',').map(value=>value.trim());
      for(const scope of JSON.parse(state.scopes_json) as string[])if(!granted.includes(scope))throw new Error(`Shopify is missing ${scope}. Re-approve its permissions.`);
      if(token.expires_in!==undefined&&!(typeof token.expires_in==='number'&&Number.isSafeInteger(token.expires_in)&&token.expires_in>0))throw new Error('Shopify returned invalid token expiry.');
      const expiresAt=typeof token.expires_in==='number'&&Number.isSafeInteger(token.expires_in)&&token.expires_in>0?Date.now()+token.expires_in*1000:null;
      const now=Date.now();
      const prior=await db.prepare('SELECT shop,channel_id FROM shopify_installation WHERE id=1').first<{shop:string;channel_id:string}>();
      const channel=prior?.shop===query.shop?prior.channel_id:'mango-'+crypto.randomUUID();
      await db.batch([db.prepare(`INSERT INTO shopify_installation(id,shop,token_cipher,scopes_json,connected_by,connected_at,expires_at,channel_id,proxy_path) VALUES(1,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET shop=excluded.shop,token_cipher=excluded.token_cipher,scopes_json=excluded.scopes_json,connected_by=excluded.connected_by,connected_at=excluded.connected_at,expires_at=excluded.expires_at,channel_id=excluded.channel_id,proxy_path=excluded.proxy_path,pixel_id=NULL,subscriptions_json='[]',checked_at=NULL,last_error=NULL`).bind(query.shop,await encryptShopifySecret({accessToken:token.access_token,refreshToken:typeof token.refresh_token==='string'?token.refresh_token:null},platform.config.sessionSigningKey),JSON.stringify(granted),operator.email,now,expiresAt,channel,'/apps/mango-signals'),
        activityStatement(db,{key:crypto.randomUUID(),action:'shopify-connected',entityType:'integration',entityId:query.shop,actorId:operator.id,detail:{shop:query.shop,grantedScopes:granted},at:now})]);
      await checkShopifyInstallation(platform);
      return context.redirect('/app/settings#shopify',303);
    }catch(error){return refuse(error instanceof Error?error.message:'Shopify connection failed.',422);}
  });
  return {settings,callbacks};
}

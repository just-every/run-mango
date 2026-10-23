// @ts-nocheck -- Public production Worker doors with only Shopify/mail network edges doubled.
import {expect} from '@playwright/test';
import {createHmac} from 'node:crypto';
import {shopifyRuntime,appSecret} from './runtime.mjs';
import {installationScopes} from '../../src/core/features/store/shopify/install-security';
import {installationTopics} from '../../src/core/features/store/shopify/subscriptions';
import {page,id} from './fixtures';

export async function installJourney(){
  const f=await shopifyRuntime({oauthOnly:true});
  try {
    const cookie=await f.owner(),shop='mango-shop.myshopify.com';
    await f.fixture('OAuthToken',{access_token:'synthetic-mango-73',refresh_token:'synthetic-mango-74',expires_in:86400,scope:installationScopes.join(',')});
    await f.fixture('MangoInstalledAccess',{data:{shop:{myshopifyDomain:shop},currentAppInstallation:{id:id('AppInstallation',1),accessScopes:installationScopes.map(handle=>({handle}))},webPixel:null}});
    await f.fixture('MangoSubscriptions',{data:{webhookSubscriptions:page([])}});
    const exchanges=async()=>Number((await f.db.prepare("SELECT count(*) n FROM test_shopify_http WHERE request_key='OAuthToken'").first()).n);
    const connect=async()=>{
      const response=await f.call('/api/settings/shopify/connect',{method:'POST',cookie,body:{shop}});expect(response.status,await response.clone().text()).toBe(200);
      return new URL((await response.json()).url);
    };
    const callback=(auth,changes={},badHmac=false)=>{
      const query=new URLSearchParams({shop,code:'synthetic-mango-75',state:auth.searchParams.get('state'),timestamp:String(Math.floor(Date.now()/1000)),...changes});
      const message=[...query].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>`${key}=${value}`).join('&');
      query.set('hmac',badHmac?'0'.repeat(64):createHmac('sha256',appSecret).update(message).digest('hex'));
      return f.call('/auth/shopify/callback?'+query,{cookie});
    };
    expect((await f.call('/api/settings/shopify/connect',{method:'POST',body:{shop}})).status).toBe(401);
    expect((await f.call('/api/settings/shopify/connect',{method:'POST',cookie,body:{shop:'shop.example.test'}})).status).toBe(400);
    const pending=await connect();
    expect((await callback(pending,{},true)).status).toBe(400);
    expect((await callback(pending,{shop:'shop.example.test'})).status).toBe(400);
    expect((await callback(pending,{shop:'synthetic-mango-77.myshopify.com'})).status).toBe(400);
    expect(await exchanges()).toBe(0);
    const expired=await connect();await f.call('/test/clock',{method:'POST',body:{advanceMs:600001}});
    expect((await callback(expired)).status).toBe(400);expect(await exchanges()).toBe(0);
    const fresh=await connect();expect((await callback(fresh)).status).toBe(303);
    expect(await exchanges()).toBe(1);expect((await callback(fresh)).status).toBe(400);expect(await exchanges()).toBe(1);
    const stored=await f.db.prepare('SELECT token_cipher FROM shopify_installation WHERE id=1').first();
    expect(stored.token_cipher).not.toContain('synthetic-mango-73');expect(stored.token_cipher).not.toContain('synthetic-mango-74');
    const installedPixel=JSON.parse((await f.db.prepare("SELECT body FROM test_shopify WHERE id='MangoInstalledAccess'").first()).body).data.webPixel;
    expect(installedPixel.id).toBeTruthy();
    const state=await (await f.call('/api/settings/shopify',{cookie})).json();
    expect(state.connection.shop).toBe(shop);expect(state.connection.subscriptions.map(s=>s.topic).sort()).toEqual([...installationTopics].sort());
    expect(JSON.stringify(state)).not.toContain('synthetic-mango-73');
    const subscriptions=await f.db.prepare("SELECT body FROM test_shopify WHERE id='MangoSubscriptions'").first();
    const body=JSON.parse(subscriptions.body);body.data.webhookSubscriptions.nodes=body.data.webhookSubscriptions.nodes.filter(s=>s.topic!=='CARTS_UPDATE');
    await f.fixture('MangoSubscriptions',body);
    expect((await f.call('/api/settings/shopify/check',{method:'POST',cookie})).status).toBe(200);
    const repaired=await (await f.call('/api/settings/shopify',{cookie})).json();
    expect(repaired.connection.subscriptions.find(s=>s.topic==='CARTS_UPDATE').recreated).toBe(true);
    const events=await (await f.call('/api/activity?action=shopify-connected',{cookie})).json();
    expect(JSON.stringify(events)).toContain(shop);
    expect((await f.call('/api/settings/shopify',{method:'DELETE',cookie})).status).toBe(200);
    expect(await f.db.prepare('SELECT count(*) n FROM shopify_installation').first()).toEqual({n:0});
    expect(await f.db.prepare('SELECT count(*) n FROM shopify_oauth_states').first()).toEqual({n:0});
  }finally{await f.close();}
}

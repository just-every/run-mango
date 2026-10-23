import {expect,type Page,type TestInfo} from '@playwright/test';
import {createHmac} from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import {type Installation,json} from './harness';
import type {providerEdge} from './edge';
import {openPage} from '../support/navigation';

export async function shopifyInstallJourney(site:Installation,page:Page,info:TestInfo,owner:string,admin:string,author:string,edge:Awaited<ReturnType<typeof providerEdge>>){
  const shop='mango-test.myshopify.com',stateBefore=edge.shopifyInstall.exchanges;
  expect((await site.call('/api/settings/shopify/connect',{method:'POST',cookie:author,body:{shop}})).status).toBe(403);
  expect((await site.call('/api/settings/shopify/connect',{method:'POST',cookie:admin,body:{shop}})).status).toBe(200);
  expect(edge.shopifyInstall.exchanges).toBe(stateBefore);
  const capture=async(label:string)=>{
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect((await new AxeBuilder({page}).include(label==='failure'?'main':'#shopify').analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
      await (label==='failure'?page.locator('main'):page.locator('#shopify')).screenshot({path:info.outputPath(`shopify-install-${label}-${width}.png`)});
    }
  };
  await openPage(page,site.runtime.url+'/app/settings');
  await expect(page.locator('#shopify')).toContainText('No Shopify installation connected.');await capture('connect');
  await page.route('https://mango-test.myshopify.com/admin/oauth/authorize**',async route=>{
    const authorization=new URL(route.request().url());
    const query=new URLSearchParams({shop,code:'synthetic-mango-75',state:authorization.searchParams.get('state')!,timestamp:String(Math.floor((await site.control('/_golive/clock')).now/1000))});
    const canonical=[...query].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,value])=>`${key}=${value}`).join('&');
    query.set('hmac',createHmac('sha256','synthetic-mango-72').update(canonical).digest('hex'));
    const inputs=[...query].map(([name,value])=>`<input type="hidden" name="${name}" value="${value.replaceAll('&','&amp;').replaceAll('"','&quot;')}">`).join('');
    await route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="en"><title>Shopify test edge</title><h1>Shopify permissions test edge</h1><form method="get" action="${site.runtime.url}/auth/shopify/callback">${inputs}<button>Approve Shopify access</button></form></html>`});
  });
  await page.getByLabel('Shopify shop domain',{exact:true}).fill(shop);await page.getByRole('button',{name:'Connect Shopify',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Shopify permissions test edge',exact:true})).toBeVisible();await page.getByRole('button',{name:'Approve Shopify access',exact:true}).click();
  await expect(page.locator('#shopify')).toContainText('Authorized shop');expect(edge.shopifyInstall.exchanges).toBe(stateBefore+1);
  expect(edge.shopifyInstall.pixel).not.toBeNull();
  await expect(page.locator('#shopify')).toContainText('Storefront pixel activated.');
  edge.shopifyInstall.subscriptions.splice(edge.shopifyInstall.subscriptions.findIndex(s=>s.topic==='CARTS_UPDATE'),1);
  await page.getByRole('button',{name:'Check Shopify installation',exact:true}).click();
  await expect(page.getByRole('list',{name:'Shopify webhook subscriptions',exact:true})).toContainText('CARTS_UPDATE · re-created by installation check');
  await capture('connected');
  const state=await json(await site.call('/api/settings/shopify',{cookie:owner}),200);expect(JSON.stringify(state)).not.toContain('synthetic-mango-73');
  const stored=await site.rows('SELECT token_cipher FROM shopify_installation');expect(JSON.stringify(stored)).not.toContain('synthetic-mango-73');
  expect(await page.locator('body').innerText()).not.toContain('synthetic-mango-73');
  expect(site.runtime.logs()).not.toContain('synthetic-mango-73');
  const failure=site.runtime.url+'/auth/shopify/callback?shop='+shop+'&code=synthetic-mango-75&state=synthetic-mango-76&hmac='+'0'.repeat(64);
  await page.goto(failure);await expect(page.getByRole('heading',{name:'Shopify connection refused',exact:true})).toBeVisible();await capture('failure');
  expect((await site.call('/api/settings/shopify',{method:'DELETE',cookie:owner})).status).toBe(200);
  await page.unroute('https://mango-test.myshopify.com/admin/oauth/authorize**');
}

import {expect,type Page,type FrameLocator} from '@playwright/test';

export async function challengeEdge(page:Page) {
  const external:string[]=[];
  page.on('request',request=>{if(!['127.0.0.1','localhost','[::1]'].includes(new URL(request.url()).hostname))external.push(request.url());});
  await page.route('https://challenges.cloudflare.com/**',async route=>{
    expect(new URL(route.request().url()).pathname).toBe('/turnstile/v0/api.js');
    await route.fulfill({contentType:'application/javascript',body:`window.turnstile={render(element,options){
      if(options.action!=='newsletter-signup'||options.sitekey!=='fixture-public-site')throw Error('Unexpected challenge scope');
      const button=document.createElement('button');button.type='button';button.textContent='Complete verification';
      button.onclick=()=>{options.callback('browser-valid-token');button.disabled=true;};element.append(button);return 'fixture-widget';
    },remove(){}};`});
  });
  return external;
}
export async function untouchedForm(page:Page,surface:Page|FrameLocator,external:string[]) {
  await expect(surface.getByRole('heading',{name:'Get the newsletter'})).toBeVisible();
  await expect(surface.getByLabel('Email address')).toBeEnabled();
  // Even scripted DOM events must not initialize the external provider.
  await surface.getByLabel('Email address').evaluate(node=>{
    node.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    node.dispatchEvent(new KeyboardEvent('keydown',{key:'a',bubbles:true}));
  });
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  expect(external).toEqual([]);
  expect(await page.context().cookies()).toEqual([]);
  await expect(surface.getByRole('button',{name:'Complete verification'})).toHaveCount(0);
}

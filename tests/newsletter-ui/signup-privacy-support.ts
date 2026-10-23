import {expect,type Page,type FrameLocator,type APIRequestContext,type TestInfo} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

export async function challengeEdge(page:Page) {
  const external:string[]=[];
  page.on('request',request=>{if(!['127.0.0.1','localhost','[::1]'].includes(new URL(request.url()).hostname))external.push(request.url());});
  await page.route('https://challenges.cloudflare.com/**',async route=>{
    expect(new URL(route.request().url()).pathname).toBe('/turnstile/v0/api.js');
    await route.fulfill({contentType:'application/javascript',body:`window.turnstile={render(element,options){
      if(options.action!=='newsletter-signup'||options.sitekey!=='fixture-public-site')throw Error('Unexpected challenge scope');
      const button=document.createElement('button');button.type='button';button.textContent='Complete verification';
      button.onclick=()=>{options.callback('browser-valid-token-'+crypto.randomUUID());button.disabled=true;};element.append(button);return 'fixture-widget';
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

export async function storedSignup(request:APIRequestContext,cookie:string,email:string,info:{sender:string;consentText:string;frequencyDisclosure:string},testInfo:TestInfo) {
  const headers={Cookie:cookie};
  const contactsResponse=await request.get('/api/audience',{headers});
  await expect(contactsResponse).toBeOK();
  const contact=(await contactsResponse.json()).contacts.find((entry:{email:string})=>entry.email===email);
  expect(contact).toMatchObject({email,emailStatus:'pending'});
  const detailResponse=await request.get(`/api/contacts/${encodeURIComponent(contact.id)}`,{headers});
  await expect(detailResponse).toBeOK();
  const detail=await detailResponse.json();
  expect(detail.consent).toEqual([expect.objectContaining({
    destination:email,brandOrLegalSender:info.sender,consentText:info.consentText,frequencyDisclosure:info.frequencyDisclosure,
    captureMethod:'hosted-signup-form',captureSource:new URL('/subscribe',testInfo.project.use.baseURL).href,
    confirmationRequired:true,confirmedAt:null,captureIp:expect.any(String),
  })]);
  expect(detail.consent[0].captureIp).toBeTruthy();
  const insightsResponse=await request.get('/api/insights',{headers});
  await expect(insightsResponse).toBeOK();
  const handoff=(await insightsResponse.json()).costs.byCampaign.find((entry:{provider:string;operation:string})=>entry.provider==='resend'&&entry.operation==='confirmation-handoff');
  expect(handoff).toMatchObject({facts:1,uncertainFacts:0,preparedFacts:0});
  const path=testInfo.outputPath('signup-consent-and-handoff.json');
  await writeFile(path,JSON.stringify({contact,consent:detail.consent,handoff},null,2));
  await testInfo.attach('signup-consent-and-handoff',{contentType:'application/json',path});
}

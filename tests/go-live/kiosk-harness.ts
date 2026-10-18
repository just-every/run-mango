import {expect,type Page} from '@playwright/test';
import {authoringRuntime} from '../campaign-authoring/browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';

export async function kioskInstallation(challenge=true) {
  const runtime=await authoringRuntime({suite:'kiosk',fixtureWorker:'tests/go-live/kiosk-worker.ts',startupTimeout:180000,vars:{KIOSK_TEST_CHALLENGE:challenge?'1':'0'}});
  const control=async(path:string,body:unknown={})=>{
    const response=await fetch(runtime.url+path,{method:'POST',headers:{'X-Test-Token':runtime.token,'Content-Type':'application/json'},body:JSON.stringify(body)});
    expect(response.status).toBe(200);return response.json();
  };
  const session=await control('/_kiosk/open');
  const cookie=`${localSessionCookieName(runtime.url)}=${session.token}`;
  const call=(path:string,body?:unknown,headers:Record<string,string>={})=>fetch(runtime.url+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
  const settings=async(value:unknown)=>fetch(runtime.url+'/api/audience/signup',{method:'PUT',headers:{Cookie:cookie,Origin:runtime.url,'Content-Type':'application/json'},body:JSON.stringify(value)});
  return {runtime,cookie,call,settings,control,rows:(sql:string)=>control('/_kiosk/rows',{sql}) as Promise<Array<Record<string,any>>>};
}
export async function kioskChallenge(page:Page) {
  await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={render(element,options){
    if(options.sitekey!=='kiosk-test-site'||options.action!=='newsletter-signup')throw Error('Unexpected kiosk challenge');
    const button=document.createElement('button');button.type='button';button.textContent='Complete verification';
    button.onclick=()=>{options.callback('kiosk-token-'+crypto.randomUUID());button.disabled=true;};element.append(button);return crypto.randomUUID();
  },remove(){}};`}));
}

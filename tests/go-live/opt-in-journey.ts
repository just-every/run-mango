import AxeBuilder from '@axe-core/playwright';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {signupCounterWindow,type kioskInstallation} from './kiosk-harness';
import {localSessionCookieName} from '../support/local-session';
import {openPage} from '../support/navigation';
export async function optInJourney(site:Awaited<ReturnType<typeof kioskInstallation>>,page:Page,info:TestInfo){
 const headers=(cookie=site.cookie)=>({Cookie:cookie,Origin:site.runtime.url,'Content-Type':'application/json'});
 const setMode=(point:string,mode:string,cookie=site.cookie)=>fetch(site.runtime.url+'/api/settings/opt-in/'+point,{method:'PUT',headers:headers(cookie),body:JSON.stringify({mode})});
 const capture=async(email:string)=>{const description=await(await site.call('/subscribe/info')).json();return site.call('/subscribe',{email,displayName:'Synthetic Mango reader',consent:true,disclosure:description.disclosure,'cf-turnstile-response':`kiosk-token-${crypto.randomUUID()}`},{'CF-Connecting-IP':'198.51.100.224'});};
 const messages=()=>site.control('/_kiosk/messages') as Promise<Array<{to:string;text:string}>>;
 const status=async(email:string)=>(await site.rows(`SELECT id,email_status FROM contacts WHERE email='${email}'`))[0];
 await site.control('/_kiosk/window',{kind:'minute'});
 const double='synthetic-mango-mode-double@example.test';
 expect((await capture(double)).status).toBe(202);expect((await status(double)).email_status).toBe('pending');expect((await messages()).filter(m=>m.to===double)).toHaveLength(1);
 let admin='';
 for(const role of ['admin','author','manager','support']){
  const identity=await site.control('/_kiosk/open',{id:`opt-in-${role}`}),cookie=`${localSessionCookieName(site.runtime.url)}=${identity.token}`;
  expect((await fetch(site.runtime.url+`/api/operators/opt-in-${role}/role`,{method:'PUT',headers:headers(),body:JSON.stringify({role})})).status).toBe(200);
  const response=await setMode('hosted','single',cookie);expect(response.status).toBe(role==='admin'?200:403);
  if(role==='admin')admin=cookie;
 }
 expect((await setMode('hosted','single',admin)).status).toBe(200); // no duplicate audit
 const single='synthetic-mango-mode-single@example.test',retained='synthetic-mango-mode-retained@example.test';
 const counter=await signupCounterWindow(site,'signup-challenged-global');
 const before=counter.before;
 for(const email of [single,retained]){expect((await capture(email)).status).toBe(202);expect((await status(email)).email_status).toBe('subscribed');expect((await messages()).filter(m=>m.to===email)).toHaveLength(0);}
 expect((await capture(single)).status).toBe(202);
 expect(await counter.count()).toBe(before+2);
 const evidence=(await site.rows(`SELECT e.*,m.capture_ip FROM consent_evidence e JOIN consent_capture_metadata m ON m.id=e.id WHERE e.destination='${single}'`))[0];
 expect(evidence).toMatchObject({confirmation_required:0,capture_method:'hosted-signup-form',capture_source:site.runtime.url+'/subscribe',capture_ip:'198.51.100.224',message_category:'newsletter',frequency_disclosure:'Monthly newsletter'});
 expect(evidence.consent_text).toContain('I agree');expect(evidence.confirmed_at).toBe(evidence.occurred_at);
 expect(await site.rows(`SELECT l.key FROM oa_limits l JOIN audience_signup_requests r ON l.key='signup-email:'||r.destination_hash WHERE r.id='${evidence.id}'`)).toEqual([]);
 const contact=await status(single);
 expect((await fetch(site.runtime.url+`/api/contacts/${contact.id}/opt-out`,{method:'POST',headers:headers(),body:JSON.stringify({channel:'email'})})).status).toBe(200);
 expect((await capture(single)).status).toBe(202);expect((await status(single)).email_status).toBe('unsubscribed');
 const confirmations=(await messages()).filter(m=>m.to===single);expect(confirmations).toHaveLength(1);
 const link=/https?:\/\/\S+\/consent\/confirm\/\S+/.exec(confirmations[0].text)![0];
 expect((await fetch(link,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
 expect((await status(single)).email_status).toBe('subscribed');
 const key=await fetch(site.runtime.url+'/api/settings/integrations',{method:'POST',headers:headers(),body:JSON.stringify({name:'Synthetic Mango capture key',scopes:['contacts:write']})});expect(key.status).toBe(201);
 for(const width of [1440]){
  await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/settings');
  const panel=page.getByRole('region',{name:'Opt-in',exact:true});
  await expect(panel.getByLabel('Hosted signup form email mode',{exact:true})).toHaveValue('single');
  await expect(panel.getByLabel('Manual entry email mode',{exact:true})).toHaveValue('double');
  await expect(panel).toContainText('API key: Synthetic Mango capture key');await expect(panel).toContainText('Email: double opt-in (fixed)');
  await panel.getByRole('heading',{name:'Opt-in',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath(`opt-in-${width}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 }
 const retainedContact=await status(retained);
 for(const width of [1440]){
  await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/audience/'+retainedContact.id);
  const panel=page.getByRole('region',{name:'Consent evidence',exact:true});
  await expect(panel).toContainText('Single opt-in');await expect(panel).toContainText('Consent effective');
  await panel.screenshot({path:info.outputPath(`single-opt-in-evidence-${width}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 }
 expect((await setMode('kiosk','single')).status).toBe(200);
 expect((await site.settings({frequencyDisclosure:'Monthly newsletter',embedOrigins:[],kioskEnabled:true,kioskDeviceLabel:'Market tablet',challengeEnabled:true})).status).toBe(200);
 const kiosk='synthetic-mango-mode-kiosk@example.test';expect((await capture(kiosk)).status).toBe(202);expect((await status(kiosk)).email_status).toBe('subscribed');expect((await messages()).filter(m=>m.to===kiosk)).toHaveLength(0);
 expect((await setMode('kiosk','double')).status).toBe(200);
 expect((await site.settings({frequencyDisclosure:'Monthly newsletter',embedOrigins:[],kioskEnabled:false,kioskDeviceLabel:'Market tablet',challengeEnabled:true})).status).toBe(200);
 expect(await site.rows("SELECT actor_id FROM lifecycle_audit_entries WHERE action='opt-in.mode.changed' AND entity_id='hosted'")).toEqual([{actor_id:'opt-in-admin'}]);
 expect((await setMode('hosted','double')).status).toBe(200);expect((await status(retained)).email_status).toBe('subscribed');
 const after='synthetic-mango-mode-after-change@example.test';expect((await capture(after)).status).toBe(202);expect((await status(after)).email_status).toBe('pending');expect((await messages()).filter(m=>m.to===after)).toHaveLength(1);
}

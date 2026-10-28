import AxeBuilder from '@axe-core/playwright';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {signupCounterWindow,type kioskInstallation} from './kiosk-harness';
import {localSessionCookieName} from '../support/local-session';
import {openPage} from '../support/navigation';

export async function capacityJourney(site:Awaited<ReturnType<typeof kioskInstallation>>,page:Page,info:TestInfo) {
  const setting={frequencyDisclosure:'Monthly newsletter',embedOrigins:[],kioskEnabled:false,kioskDeviceLabel:'Market tablet'};
  const read=async()=>{const response=await fetch(site.runtime.url+'/api/audience/signup-allowance',{headers:{Cookie:site.cookie}});expect(response.status).toBe(200);return response.json();};
  const update=(cookie:string,name:string,value:number)=>fetch(site.runtime.url+'/api/audience/signup-allowance',{method:'PUT',headers:{Cookie:cookie,Origin:site.runtime.url,'Content-Type':'application/json'},body:JSON.stringify({name,value})});
  const capture=async(email:string,ip:string,extra:Record<string,unknown>={},challenged=true)=>{
    const description=await(await site.call('/subscribe/info')).json();
    return site.call('/subscribe',{email,consent:true,disclosure:description.disclosure,...(challenged?{'cf-turnstile-response':`kiosk-token-${crypto.randomUUID()}`} :{}),...extra},{'CF-Connecting-IP':ip});
  };
  const batch=async(entries:Array<{email:string;ip:string;website?:string;token?:string}>)=>{
    const statuses:number[]=[];
    for(let index=0;index<entries.length;index+=10)statuses.push(...(await site.control('/_kiosk/captures',{entries:entries.slice(index,index+10)})).statuses);
    return statuses;
  };
  let counter=await signupCounterWindow(site,'signup-challenged-global');
  const minute=()=>site.control('/_kiosk/window',{kind:'minute'});
  await minute();
  const before=counter.before;
  // One volume matrix through the public Worker door: 600 on 200 networks,
  // with every complete minute accepting its full 100-request burst.
  for(let minuteIndex=0;minuteIndex<6;minuteIndex++){
    if(minuteIndex)await minute();
    const entries=Array.from({length:100},(_,offset)=>{const index=minuteIndex*100+offset;return {email:`synthetic-mango-volume-${index}@example.test`,ip:`198.51.100.${1+index%200}`,token:`kiosk-token-${crypto.randomUUID()}`};});
    expect(await batch(entries)).toEqual(Array(100).fill(202));
  }
  expect(await counter.count()).toBe(before+600);
  expect((await site.rows("SELECT count(*) AS n FROM contacts WHERE email LIKE 'synthetic-mango-volume-%' AND email_status='pending'"))[0].n).toBe(600);
  const bots=Array.from({length:200},(_,index)=>({email:`synthetic-mango-bot-${index}@example.test`,ip:`203.0.113.${1+index%200}`,token:index%2?`kiosk-token-${crypto.randomUUID()}`:`invalid-${index}`,...(index%2?{website:'robot'}:{})}));
  expect(await batch(bots)).toEqual(bots.map((_,index)=>index%2?202:400));
  expect(await counter.count()).toBe(before+600);
  await minute();
  expect((await capture('synthetic-mango-after-bots@example.test','198.51.100.220')).status).toBe(202);
  counter=await signupCounterWindow(site,'signup-challenged-global');
  const duplicateBefore=counter.before;
  expect((await Promise.all([0,1].map(()=>capture('synthetic-mango-duplicate@example.test','198.51.100.221')))).map(r=>r.status)).toEqual([202,202]);
  expect(await counter.count()).toBe(duplicateBefore+1);
  expect((await site.control('/_kiosk/messages')).filter((m:any)=>m.to==='synthetic-mango-duplicate@example.test')).toHaveLength(1);
  // Unchallenged captures spend their own pool and the same network count.
  expect((await site.settings({...setting,challengeEnabled:false})).status).toBe(200);
  for(let index=0;index<30;index++)expect((await capture(`synthetic-mango-nat-${index}@example.test`,'192.0.2.180',{},false)).status).toBe(202);
  expect((await capture('synthetic-mango-nat-over@example.test','192.0.2.180',{},false)).status).toBe(429);
  for(let index=0;index<60;index++)expect((await capture(`synthetic-mango-refused-${index}@example.test`,'192.0.2.222',{website:'robot'},false)).status).toBe(202);
  expect((await capture('synthetic-mango-refused-over@example.test','192.0.2.222',{},false)).status).toBe(429);
  expect((await site.settings({...setting,challengeEnabled:true})).status).toBe(200);
  expect((await capture('synthetic-mango-verified-after-refusals@example.test','192.0.2.222')).status).toBe(202);
  for(let index=30;index<120;index++)expect((await capture(`synthetic-mango-nat-${index}@example.test`,'192.0.2.180')).status).toBe(202);
  expect((await capture('synthetic-mango-nat-challenged-over@example.test','192.0.2.180')).status).toBe(429);
  expect((await site.settings({...setting,challengeEnabled:false})).status).toBe(200);
  for(let start=30;start<1000;){
    if(start%100===0)await minute();
    const end=Math.min(1000,Math.ceil((start+1)/100)*100);
    expect(await batch(Array.from({length:end-start},(_,offset)=>{const index=start+offset;return {email:`synthetic-mango-unchallenged-${index}@example.test`,ip:`203.0.113.${1+index%200}`};}))).toEqual(Array(end-start).fill(202));
    start=end;
  }
  expect((await capture('synthetic-mango-unchallenged-over@example.test','192.0.2.181',{},false)).status).toBe(429);
  expect((await site.settings({...setting,challengeEnabled:true})).status).toBe(200);
  expect((await capture('synthetic-mango-challenged-after-flood@example.test','192.0.2.181')).status).toBe(202);
  const initial=await read();
  for(const role of ['admin','author','manager']){
    const identity=await site.control('/_kiosk/open',{id:`capacity-${role}`});
    const cookie=`${localSessionCookieName(site.runtime.url)}=${identity.token}`;
    const assigned=await fetch(site.runtime.url+`/api/operators/capacity-${role}/role`,{method:'PUT',headers:{Cookie:site.cookie,Origin:site.runtime.url,'Content-Type':'application/json'},body:JSON.stringify({role})});expect(assigned.status).toBe(200);
    if(role==='admin'){
      const response=await update(cookie,'globalMinute',200);expect(response.status).toBe(403);expect(await response.json()).toMatchObject({error:'signup_allowance_owner_required'});
    }
    const changed=await fetch(site.runtime.url+'/api/audience/signup',{method:'PUT',headers:{Cookie:cookie,Origin:site.runtime.url,'Content-Type':'application/json'},body:JSON.stringify({...setting,challengeEnabled:false})});
    expect(changed.status).toBe(role==='admin'?200:403);
    if(role==='admin')expect((await site.settings({...setting,challengeEnabled:true})).status).toBe(200);
  }
  expect((await site.settings({...setting,kioskEnabled:true,challengeEnabled:false})).status).toBe(400);
  expect((await update(site.cookie,'globalMinute',99)).status).toBe(400);
  expect((await update(site.cookie,'globalMinute',3001)).status).toBe(400);
  expect((await update(site.cookie,'globalHour',1200)).status).toBe(200);
  const scheduled=await read();
  expect(scheduled.levels.globalHour).toBe(initial.levels.globalHour);
  expect(scheduled.allowances.find((l:any)=>l.name==='globalHour').scheduled.value).toBe(1200);
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app/settings');
    const panel=page.locator('#signup-allowances');
    await expect(panel).toContainText('Floor 1,000');await expect(panel).toContainText('Floor 100');await expect(panel).toContainText('Ceiling 3,000');
    await expect(panel).toContainText('Next window: 1,200');
    await expect(panel.getByRole('checkbox',{name:/Require verification/})).toBeChecked();
    await panel.screenshot({path:info.outputPath(`signup-capacity-${width}.png`)});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
  }
  await site.control('/_kiosk/window',{kind:'hour'});expect((await read()).levels.globalHour).toBe(1200);
  const actions=await site.rows("SELECT actor_id,detail_json FROM lifecycle_audit_entries WHERE action='signup.allowance.changed'");
  expect(actions).toHaveLength(1);expect(actions[0].actor_id).toBe('kiosk-owner');
  expect(JSON.parse(actions[0].detail_json)).toMatchObject({name:'globalHour',value:1200});
  const toggles=await site.rows("SELECT actor_id FROM lifecycle_audit_entries WHERE action='signup.challenge.changed' AND actor_id='capacity-admin'");expect(toggles).toHaveLength(1);
}

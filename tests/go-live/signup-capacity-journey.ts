import {expect,type Page,type TestInfo} from '@playwright/test';
import {signupCounterWindow,type kioskInstallation} from './kiosk-harness';
import {localSessionCookieName} from '../support/local-session';
import {openPage} from '../support/navigation';

// Owner control is a public settings flow. Throughput floors and ceilings come
// from the installation; this journey does not pin their numeric defaults.
export async function capacityJourney(site:Awaited<ReturnType<typeof kioskInstallation>>,page:Page,info:TestInfo){
  const endpoint=site.runtime.url+'/api/audience/signup-allowance';
  const headers=(cookie=site.cookie)=>({Cookie:cookie,Origin:site.runtime.url,'Content-Type':'application/json'});
  const read=async(cookie=site.cookie)=>{const response=await fetch(endpoint,{headers:headers(cookie)});expect(response.status).toBe(200);return response.json();};
  const update=(name:string,value:number,cookie=site.cookie)=>fetch(endpoint,{method:'PUT',headers:headers(cookie),body:JSON.stringify({name,value})});
  const snapshot=async()=>{
    const {now,...capacity}=await read();
    return {
      capacity,
      levels:await site.rows('SELECT * FROM signup_allowance_levels ORDER BY name,effective_at'),
      activity:await site.rows("SELECT * FROM lifecycle_audit_entries WHERE action='signup.allowance.changed' ORDER BY id"),
    };
  };
  expect((await fetch(endpoint)).status).toBe(401);
  // Keep the real database hour away from rollover while comparing pending
  // state. The existing counter helper waits at most three minutes if needed.
  await signupCounterWindow(site,'signup-challenged-global');
  const initial=await read(),level=initial.allowances.find((item:any)=>item.name==='globalHour');
  expect(level.value).toBeLessThan(level.ceiling);
  const value=level.value+1;
  expect((await update(level.name,value)).status).toBe(200);
  expect((await update(level.name,value)).status).toBe(200);
  const scheduled=await read(),pending=scheduled.allowances.find((item:any)=>item.name===level.name).scheduled;
  expect(scheduled.levels.globalHour).toBe(initial.levels.globalHour);
  expect(pending.value).toBe(value);
  expect(pending.effective_at).toBe((Math.floor(initial.now/(level.seconds*1000))+1)*level.seconds*1000);

  const identity=await site.control('/_kiosk/open',{id:'synthetic-mango-capacity-admin'});
  const admin=`${localSessionCookieName(site.runtime.url)}=${identity.token}`;
  const assigned=await fetch(site.runtime.url+'/api/operators/synthetic-mango-capacity-admin/role',{
    method:'PUT',headers:headers(),body:JSON.stringify({role:'admin'}),
  });
  expect(assigned.status).toBe(200);
  const operator=await fetch(site.runtime.url+'/api/operator',{headers:headers(admin)});
  expect(operator.status).toBe(200);
  expect((await operator.json()).operator.role).toBe('admin');
  expect((await read(admin)).levels).toEqual(scheduled.levels);

  // A valid Admin raise must reach the authority refusal, while the Owner's
  // invalid values reach the two distinct bound refusals. All preserve the
  // already scheduled Owner change as well as every active allowance.
  expect(level.floor).toBeGreaterThan(1);
  for(const refusal of [
    {actor:'Admin raise',cookie:admin,value,status:403,error:'signup_allowance_owner_required'},
    {actor:'Owner below floor',cookie:site.cookie,value:level.floor-1,status:400,error:'signup_allowance_below_floor'},
    {actor:'Owner above handoff ceiling',cookie:site.cookie,value:level.ceiling+1,status:400,error:'signup_allowance_above_handoff_ceiling'},
  ]){
    const before=await snapshot();
    const response=await update(level.name,refusal.value,refusal.cookie);
    expect(response.status,refusal.actor).toBe(refusal.status);
    expect(await response.json(),refusal.actor).toMatchObject({error:refusal.error});
    expect(await snapshot(),`${refusal.actor} leaves active, pending, stored levels and activity unchanged`).toEqual(before);
  }

  for(const [actor,cookie] of [['owner',site.cookie],['admin',admin]]){
    await page.context().addCookies([{name:localSessionCookieName(site.runtime.url),value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.setViewportSize({width:1440,height:1000});
    await openPage(page,site.runtime.url+'/app/settings');
    await page.reload();
    await page.waitForLoadState('networkidle');
    const panel=page.locator('#signup-allowances');
    const form=panel.locator('form').filter({has:page.getByRole('spinbutton',{name:level.label,exact:true})});
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Only an Owner changes a level.');
    await expect(form.getByRole('spinbutton',{name:level.label,exact:true})).toHaveValue(String(level.value));
    await expect(form).toContainText(`Active ${level.value.toLocaleString('en-US')}`);
    await expect(form).toContainText(`Next window: ${value.toLocaleString('en-US')}`);
    await panel.screenshot({path:info.outputPath(`signup-allowance-${actor}-1440.png`)});
    // Phone evidence uses the same saved state; behavioral assertions run once
    // at desktop width, as does this registered journey's existing coverage.
    await page.setViewportSize({width:390,height:1000});
    await page.reload();
    await page.waitForLoadState('networkidle');
    await panel.getByRole('spinbutton',{name:level.label,exact:true}).waitFor();
    await panel.screenshot({path:info.outputPath(`signup-allowance-${actor}-390.png`)});
  }
  await page.context().addCookies([{name:localSessionCookieName(site.runtime.url),value:site.cookie.split('=')[1],url:site.runtime.url}]);
  await page.setViewportSize({width:1440,height:1000});
  await site.control('/_kiosk/window',{kind:'hour'});
  const activated=await read();
  expect(activated.levels.globalHour).toBe(value);
  expect(activated.allowances.find((item:any)=>item.name===level.name).scheduled).toBeNull();
  const actions=await site.rows("SELECT actor_id,detail_json FROM lifecycle_audit_entries WHERE action='signup.allowance.changed'");
  expect(actions).toHaveLength(1);expect(actions[0].actor_id).toBe('kiosk-owner');
  expect(JSON.parse(actions[0].detail_json)).toMatchObject({name:level.name,value,effectiveAt:pending.effective_at});
}

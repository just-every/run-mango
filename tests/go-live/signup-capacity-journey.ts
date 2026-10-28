import {expect,type Page,type TestInfo} from '@playwright/test';
import type {kioskInstallation} from './kiosk-harness';
import {openPage} from '../support/navigation';

// Owner control is a public settings flow. Throughput floors and ceilings come
// from the installation; this journey does not pin their numeric defaults.
export async function capacityJourney(site:Awaited<ReturnType<typeof kioskInstallation>>,page:Page,info:TestInfo){
  const endpoint=site.runtime.url+'/api/audience/signup-allowance';
  const read=async()=>{const response=await fetch(endpoint,{headers:{Cookie:site.cookie}});expect(response.status).toBe(200);return response.json();};
  expect((await fetch(endpoint)).status).toBe(401);
  const initial=await read(),level=initial.allowances.find((item:any)=>item.name==='globalHour');
  const value=level.value===level.ceiling?level.floor:level.value+1;
  const update=()=>fetch(endpoint,{method:'PUT',headers:{Cookie:site.cookie,Origin:site.runtime.url,'Content-Type':'application/json'},body:JSON.stringify({name:level.name,value})});
  expect((await update()).status).toBe(200);expect((await update()).status).toBe(200);
  const scheduled=await read();
  expect(scheduled.levels.globalHour).toBe(initial.levels.globalHour);
  expect(scheduled.allowances.find((item:any)=>item.name===level.name).scheduled.value).toBe(value);
  await page.context().addCookies([{name:site.cookie.split('=')[0],value:site.cookie.split('=')[1],url:site.runtime.url}]);
  await page.setViewportSize({width:1440,height:1000});
  await openPage(page,site.runtime.url+'/app/settings');
  await expect(page.locator('#signup-allowances')).toBeVisible();
  await page.screenshot({path:info.outputPath('signup-allowance-1440.png'),fullPage:true});
  await site.control('/_kiosk/window',{kind:'hour'});
  expect((await read()).levels.globalHour).toBe(value);
  const actions=await site.rows("SELECT actor_id,detail_json FROM lifecycle_audit_entries WHERE action='signup.allowance.changed'");
  expect(actions).toHaveLength(1);expect(actions[0].actor_id).toBe('kiosk-owner');
  expect(JSON.parse(actions[0].detail_json)).toMatchObject({name:level.name,value});
}

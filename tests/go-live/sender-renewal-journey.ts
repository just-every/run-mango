import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import {availableTransport,json,type installation} from './harness';
import type {providerEdge} from './edge';

export async function proveSenderRenewal(page:Page,site:Awaited<ReturnType<typeof installation>>,edge:Awaited<ReturnType<typeof providerEdge>>,cookie:string,info:TestInfo) {
  await availableTransport(site);
  await json(await site.call('/api/settings/sender/confirmation',{method:'POST',cookie,body:{}}),202);
  const message=edge.resend.sends.at(-1)!.body;
  const link=message.text.match(/https:\/\/\S+\/sender-check\/\S+/)![0];
  expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
  await site.control('/_golive/clock',{advanceMs:23*86400000,hold:true});
  cookie=await site.open();
  const status=await json(await site.call('/api/settings/sender/renewal',{cookie}),200);expect(status.status).toMatchObject({due:true,stage:'renewal'});
  const before=edge.resend.sends.length,errors:string[]=[];
  // Exercise the real claim door at provider readiness; known no-POST pacing can resume.
  await json(await site.call('/api/settings/sender/renewal/run',{method:'POST',cookie,body:{}}),200);
  const pacing=await site.rows('SELECT MAX(next_at) due FROM provider_pacing');
  const clock=await site.control('/_golive/clock');
  await site.control('/_golive/clock',{advanceMs:Math.max(0,Number(pacing[0]?.due??0)-clock.now)+1,hold:true});
  await json(await site.call('/api/settings/sender/renewal/run',{method:'POST',cookie,body:{}}),200);
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/hydration|hydrated.*match/i.test(message.text()))errors.push(message.text());});
  await page.context().setExtraHTTPHeaders({Cookie:cookie});
  for(const width of [1440]) {
    await page.setViewportSize({width,height:1000});await openPage(page,site.runtime.url+'/app');
    const card=page.getByRole('region',{name:'Sender evidence renewal'});
    await expect(card).toBeVisible();await expect(card).toContainText('Sender evidence renewed from an authenticated receipt.');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
    await page.screenshot({path:info.outputPath(`sender-renewal-${width}.png`),fullPage:true});
  }
  expect(edge.resend.sends.length-before).toBe(2);
  const replay=await json(await site.call('/api/settings/sender/renewal/run',{method:'POST',cookie,body:{}}),200);expect(replay.status).toMatchObject({ready:true,due:false});
  expect(edge.resend.sends.length-before).toBe(2);expect(errors).toEqual([]);
  await page.context().setExtraHTTPHeaders({});
}

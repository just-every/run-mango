import {expect,type Page,type TestInfo} from '@playwright/test';
import {createRequire} from 'node:module';
const localRequire=createRequire(import.meta.url);
const axeSource=createRequire(localRequire.resolve('@axe-core/playwright'))('axe-core').source as string;
import seed from '../../seed.json' with {type:'json'};
import {json,consent,draftCampaign,type Installation} from './harness';
import {providerEdge,type EdgeSend} from './edge';
import {openPage} from '../support/navigation';

const preferenceLink=(sent:EdgeSend)=>{
  const html=sent.body.content.find((part:any)=>part.type==='text/html').value;
  expect(html).toContain('Manage preferences');
  const match=/<a\b[^>]*href="([^"]+)"[^>]*>Manage preferences<\/a>/.exec(html);
  expect(match).not.toBeNull();
  const link=match![1].replaceAll('&amp;','&');
  expect(new URL(link).pathname).toMatch(/^\/preferences\/[A-Za-z0-9._%-]+$/);
  expect(new URL(link).search).toBe('');
  expect(sent.body.content.find((part:any)=>part.type==='text/plain').value).toContain(link);
  return link;
};
async function accessible(page:Page,width:number) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
  await page.evaluate(axeSource);
  const violations=await page.evaluate(async()=>(await (window as any).axe.run(document.querySelector('main'),{iframes:false})).violations.filter((v:any)=>['serious','critical'].includes(v.impact??'')));
  expect(violations).toEqual([]);
}
export async function preferenceCenterJourney(site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,cookie:string,page:Page,info:TestInfo,original:EdgeSend,originalCampaign:{campaignId:string}) {
  console.log('Preference proof: delivered link');
  const tracked=edge.sends.findLast(send=>send.to==='ordinary@example.test'&&send.body.headers?.['List-Unsubscribe'])!;
  expect(tracked).toBeTruthy();
  expect(tracked.body.content.find((part:any)=>part.type==='text/html').value).toContain('/l/');
  const link=preferenceLink(tracked),otherLink=preferenceLink(edge.sends.findLast(send=>send.to==='branded@example.test'&&send.body.headers?.['List-Unsubscribe'])!);
  preferenceLink(original);
  const originalDetail=await json(await site.call('/api/campaigns/'+originalCampaign.campaignId,{cookie}),200),revision=originalDetail.revision;
  const size=await json(await site.call('/api/campaign-authoring/email-size',{method:'POST',cookie,body:{emailBody:revision.emailBody,preheader:revision.preheader,physicalAddress:revision.physicalAddress,trackingEnabled:revision.trackingEnabled,utmPolicyJson:revision.utmPolicyJson,inclusionRuleJson:revision.inclusionRuleJson,exclusionRulesJson:revision.exclusionRulesJson}}),200);
  expect(Buffer.byteLength(original.body.content.find((part:any)=>part.type==='text/html').value)).toBeLessThanOrEqual(size.htmlBytes);
  expect(Buffer.byteLength(original.body.content.find((part:any)=>part.type==='text/plain').value)).toBeLessThanOrEqual(size.textBytes);
  edge.domainSetup.dnsPass=true;edge.domainSetup.trackingHttps=true;
  const clock=await site.control('/_golive/clock',{hold:true});
  const captured=await json(await site.call('/api/contacts/consent',{method:'POST',cookie,body:{...consent,messageCategory:'promotions',contact:{email:tracked.to,displayName:'Preference reader'},occurredAt:new Date(clock.now).toISOString()}}),201);
  const contactId=captured.contact.id;
  const confirmation=edge.sends.findLast(send=>send.to===tracked.to&&send.body.subject==='Confirm your Mango Garden subscription')!;
  expect(confirmation.body.content.find((part:any)=>part.type==='text/html').value).not.toContain('Manage preferences');
  const confirmationUrl=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(confirmation.body.content.find((part:any)=>part.type==='text/plain').value)![0];
  expect((await fetch(site.local(confirmationUrl),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
  expect(link).not.toContain(contactId);expect(link).not.toContain(tracked.to);
  let owner=cookie;
  const detail=()=>jsonResponse(`/api/contacts/${contactId}`);
  const jsonResponse=async(path:string)=>json(await site.call(path,{cookie:owner}),200);
  console.log('Preference proof: scanner and settings');
  const before=await detail();
  const scanner=await fetch(site.local(link));expect(scanner.status).toBe(200);
  expect(await scanner.text()).not.toContain('name="displayName"');
  const afterGet=await detail();expect(afterGet.contact).toEqual(before.contact);expect(afterGet.history).toEqual(before.history);expect(afterGet.consent).toEqual(before.consent);
  expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true&displayName=Not+enabled'})).status).toBe(400);
  expect((await detail()).contact.displayName).toBe(before.contact.displayName);
  expect((await jsonResponse('/api/settings/preferences')).editableFields).toEqual([]);
  await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  await openPage(page,site.runtime.url+'/app/settings');
  const settings=page.locator('section[aria-labelledby="preference-settings-title"]');
  await settings.getByRole('checkbox',{name:'Let recipients update their display name',exact:true}).check();
  await settings.getByRole('button',{name:'Save preference settings',exact:true}).click();
  await expect(settings.getByRole('status')).toHaveText('Preference settings saved.');
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await accessible(page,width);await settings.screenshot({path:info.outputPath(`preference-settings-${width}.png`)});}
  const admin=await site.open('synthetic-mango-180-admin@example.test','synthetic-mango-180-admin');
  await json(await site.call('/api/operators/synthetic-mango-180-admin/role',{method:'PUT',cookie,body:{role:'admin'}}),200);
  await json(await site.call('/api/settings/preferences',{method:'PUT',cookie:admin,body:{editableFields:[]}}),200);
  await json(await site.call('/api/settings/preferences',{method:'PUT',cookie,body:{editableFields:['displayName']}}),200);
  for(const role of ['manager','author','analyst','support']){
    const id='synthetic-mango-180-'+role,other=await site.open(id+'@example.test',id);
    await json(await site.call('/api/operators/'+id+'/role',{method:'PUT',cookie,body:{role}}),200);
    const denied=await json(await site.call('/api/settings/preferences',{method:'PUT',cookie:other,body:{editableFields:[]}}),403);
    expect(denied.error).toBe('role_forbidden');
  }
  console.log('Preference proof: recipient page');
  await page.context().clearCookies();
  expect((await page.goto(site.local(link)))?.status()).toBe(200);
  await expect(page.getByRole('heading',{name:'Email preferences',exact:true})).toBeVisible();
  await expect(page.getByLabel('Display name',{exact:true})).toHaveValue(before.contact.displayName);
  expect(await page.locator('main').innerText()).not.toContain('iris@example.test');
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await accessible(page,width);await page.screenshot({path:info.outputPath(`recipient-preferences-${width}.png`),fullPage:true});}
  console.log('Preference proof: confirm changes');
  await page.getByLabel('Topic: newsletter',{exact:true}).selectOption('withdraw');
  await page.getByLabel('Pause email',{exact:true}).selectOption('30');
  await page.getByLabel('Display name',{exact:true}).fill('Updated preference reader');
  await page.getByRole('button',{name:'Confirm changes',exact:true}).press('Enter');
  await expect(page.getByRole('heading',{name:'Preferences saved',exact:true})).toBeVisible();
  console.log('Preference proof: read consent evidence');
  const changed=await detail();
  expect(changed.contact.displayName).toBe('Updated preference reader');
  expect(changed.consent).toEqual(before.consent);
  const evidence=changed.history.filter((row:any)=>row.kind.startsWith('preference-')).map((row:any)=>({...row,facts:JSON.parse(row.detail)}));
  expect(evidence.map((row:any)=>row.kind).sort()).toEqual(['preference-pause','preference-profile','preference-topic-withdrawal']);
  expect(evidence.every((row:any)=>row.facts.source==='preference center')).toBe(true);
  expect(evidence.find((row:any)=>row.kind==='preference-pause').facts.pauseUntil).toBe(clock.now+30*86400000);
  expect(evidence.find((row:any)=>row.kind==='preference-topic-withdrawal').facts).toMatchObject({topicId:'newsletter',choice:'unsubscribed'});
  expect(changed.timeline.filter((row:any)=>row.source==='preference center')).toHaveLength(3);
  expect((await jsonResponse('/api/activity?action=contact.profile-updated')).entries.some((entry:any)=>entry.detail.source==='preference center'&&entry.detail.field==='displayName'&&entry.detail.after==='Updated preference reader')).toBe(true);
  const unknown=await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true&topic%3Anever-held=keep'});expect(unknown.status).toBe(400);
  expect((await detail()).consent).toEqual(before.consent);expect((await detail()).history).toEqual(changed.history);
  // Topic withdrawal wins over a simultaneous pause. Campaigns name their send
  // topic through the existing affirmative topic-consent audience condition.
  console.log('Preference proof: campaign exclusions');
  await site.control('/_golive/clock',{advanceMs:7*86400000});owner=await site.open();
  for(const [topic,reason] of [['newsletter','topic-unsubscribed'],['promotions','paused-by-recipient']]){
    const now=(await site.control('/_golive/clock')).now,campaign=await draftCampaign(site,owner,'Preference '+topic,[tracked.to],new Date(now+3600000));
    const inclusion={version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator:'eq',value:tracked.to},{sourceType:'contact',field:'topic',channel:'email',topicId:topic,comparator:'eq',value:true}]};
    await json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie:owner,body:{inclusionRuleJson:JSON.stringify(inclusion)}}),200);
    const checks=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}}),200);
    expect(checks.eligibleCount).toBe(0);expect(checks.exclusions).toContainEqual({reason,count:1});
    const saved=await jsonResponse(`/api/campaigns/${campaign.campaignId}`);expect(JSON.parse(saved.audience.exclusions)).toEqual([{reason,count:1}]);
  }
  const foreignToken=new URL(confirmationUrl).pathname.split('/').at(-1)!;
  const foreign=await site.call('/preferences/'+foreignToken);expect(foreign.status).toBe(404);expect(await foreign.text()).not.toContain('Updated preference reader');
  const unknownToken=await site.call('/preferences/synthetic-mango-180-unknown-token');expect(unknownToken.status).toBe(404);expect(await unknownToken.text()).not.toContain('Updated preference reader');
  await site.control('/_golive/clock',{advanceMs:24*86400000});owner=await site.open();
  expect((await detail()).consent).toEqual(before.consent);expect((await detail()).history).toEqual(changed.history);
  console.log('Preference proof: unsubscribe and token isolation');
  const all=await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'unsubscribeAll=true'});expect(all.status).toBe(200);expect(await all.text()).toContain('You are unsubscribed');
  expect((await detail()).contact.emailStatus).toBe('unsubscribed');
  await site.control('/_golive/clock',{advanceMs:60000});
  for(let count=0;count<seed.limits.unsubscribeRequestsPerMinutePerToken;count++)expect((await fetch(site.local(link))).status).toBe(200);
  expect((await fetch(site.local(link))).status).toBe(429);expect((await fetch(site.local(otherLink))).status).toBe(200);
  const otherId=(await site.rows("SELECT id FROM contacts WHERE email='branded@example.test'"))[0].id;
  const otherBefore=await jsonResponse('/api/contacts/'+otherId),pauseClock=(await site.control('/_golive/clock')).now;
  for(const days of [60,90]){expect((await fetch(site.local(otherLink),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true&pauseDays='+days})).status).toBe(200);const updated=await jsonResponse('/api/contacts/'+otherId);expect(updated.consent).toEqual(otherBefore.consent);expect(updated.history.some((row:any)=>row.kind==='preference-pause'&&JSON.parse(row.detail).pauseUntil===pauseClock+days*86400000)).toBe(true);}
  let erased=await site.call('/api/contacts/'+otherId,{method:'DELETE',cookie:owner}),receipt=await erased.json();
  while(erased.status===202){erased=await site.call('/api/audience/erasures/'+receipt.receipt.reference+'/resume',{method:'POST',cookie:owner,body:{}});receipt=await erased.json();}
  expect(erased.status).toBe(200);expect((await fetch(site.local(otherLink))).status).toBe(404);
  expect(edge.unexpected).toEqual([]);
}

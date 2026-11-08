import {expect,type Page,type TestInfo} from '@playwright/test';
import {openPage} from '../support/navigation';
import {confirmedContact,json,draftCampaign,approve,dispatch,rule,type Installation} from './harness';
import type {providerEdge} from './edge';
import {mailchimpMember,type mailchimpEdge} from './mailchimp-edge';
import {restrictionPrivateJourney} from './restriction-private-journey';

/** One populated parallel run: allowed delivery, incoming restrictions and outgoing refusal. */
export async function optOutPrecedenceJourney(site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,incumbent:ReturnType<typeof mailchimpEdge>,cookie:string,page:Page,info:TestInfo) {
  await site.control('/_golive/clock',{hold:false});
  await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
  const addresses=['synthetic-mango-2401','synthetic-mango-2402','synthetic-mango-2403','synthetic-mango-2404'].map(local=>[local,'example.test'].join('@'));
  const contacts=[];
  for(const [index,email] of addresses.entries()) {
    await confirmedContact(site,edge,cookie,email,'Garden reader '+index);
    contacts.push((await json(await site.call('/api/contacts/search?address='+encodeURIComponent(email),{cookie}),200)).contacts.find((c:any)=>c.email===email));
    incumbent.members.push(mailchimpMember(email));
  }
  const due=new Date((await site.control('/_golive/clock')).now+90_000);
  const campaign=await draftCampaign(site,cookie,'Parallel garden letter',addresses,due);
  await approve(site,cookie,campaign);
  const connection={dataCenter:incumbent.dataCenter,audienceId:incumbent.audienceId,apiKey:'synthetic-mango-2499',consent:true};
  expect((await site.call('/api/settings/incumbent-restrictions',{method:'POST',body:connection})).status).toBe(401);
  expect((await site.call('/api/settings/incumbent-restrictions',{method:'POST',cookie,body:{...connection,consent:false}})).status).toBe(400);
  const outsiderId='synthetic-mango-2405',outsider=await site.open([outsiderId,'example.test'].join('@'),outsiderId);
  await json(await site.call('/api/operators/'+outsiderId+'/role',{method:'PUT',cookie,body:{role:'manager'}}),200);
  expect((await site.call('/api/settings/incumbent-restrictions',{method:'POST',cookie:outsider,body:connection})).status).toBe(403);
  expect(incumbent.requests).toEqual([]);
  await openPage(page,site.runtime.url+'/app/settings');
  const panel=page.getByRole('region',{name:'Mailchimp restrictions'});
  await panel.getByLabel('Mailchimp data center',{exact:true}).fill(connection.dataCenter);
  await panel.getByLabel('Mailchimp audience ID',{exact:true}).fill(connection.audienceId);
  await panel.getByLabel('Mailchimp API key',{exact:true}).fill(connection.apiKey);
  await panel.getByRole('checkbox').check();
  const connectResponse=page.waitForResponse(response=>response.url().endsWith('/api/settings/incumbent-restrictions')&&response.request().method()==='POST');
  await panel.getByRole('button',{name:'Connect parallel audience',exact:true}).click();
  const connected=await connectResponse;expect(connected.status(),JSON.stringify({response:await connected.text(),requests:incumbent.requests})).toBe(201);
  await expect(panel.getByText('Audience '+incumbent.audienceId+' · '+incumbent.dataCenter,{exact:true})).toBeVisible();
  await expect(panel.getByLabel('Mailchimp API key',{exact:true})).toHaveValue('');
  const status=await json(await site.call('/api/settings/incumbent-restrictions',{cookie}),200);
  expect(JSON.stringify(status)).not.toContain(connection.apiKey);
  expect(JSON.stringify(await site.rows('SELECT credentials FROM incumbent_restriction_connections'))).not.toContain(connection.apiKey);
  expect(incumbent.requests.every(request=>request.authorized)).toBe(true);
  // Real incumbent changes after approval must affect the already queued work.
  incumbent.members[0].status='unsubscribed';incumbent.members[1].status='cleaned';
  for(const member of incumbent.members.slice(0,2))member.last_changed=new Date((await site.control('/_golive/clock')).now).toISOString();
  const issued=await site.control('/_golive/unsubscribe-link',{contactId:contacts[2].id});
  const oneClick=issued.url.replace('/unsubscribe/','/unsubscribe/one-click/');
  expect((await fetch(site.local(oneClick),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'List-Unsubscribe=One-Click'})).status).toBe(200);
  expect((await json(await site.call('/api/contacts/'+contacts[2].id,{cookie}),200)).contact.emailStatus).toBe('unsubscribed');
  expect(incumbent.members[2].status).toBe('unsubscribed');
  expect(incumbent.members[3].status).toBe('subscribed');
  const key='synthetic_mango_restriction_note';
  await json(await site.call('/api/settings/properties',{method:'POST',cookie,body:{key,label:'Garden note',type:'text',options:[]}}),201);
  await json(await site.call('/api/contacts/'+contacts[2].id+'/properties',{method:'PUT',cookie,body:{fields:{[key]:'Still likes tomatoes'}}}),200);
  expect((await json(await site.call('/api/contacts/'+contacts[2].id,{cookie}),200)).contact.emailStatus).toBe('unsubscribed');
  const audience=await json(await site.call('/api/campaign-authoring/audience',{method:'POST',cookie,body:{inclusionRuleJson:rule([addresses[2]]),exclusionRulesJson:'[]',channels:['email']}}),200);
  expect(audience.eligibleCount).toBe(0);
  console.log('PROBE CONT-004 1: public one-click POST -> acknowledged unsubscribed, draft audience excludes recipient and incumbent is unsubscribed');
  console.log('PROBE CONT-004 2: operator property PUT after opt-out -> status stays unsubscribed and audience is empty');
  // Failed outbound calls keep the local restriction and are retried from its durable ledger.
  incumbent.failures.writeStatus=503;
  await json(await site.call('/api/contacts/'+contacts[3].id+'/opt-out',{method:'POST',cookie,body:{channel:'email'}}),200);
  expect((await json(await site.call('/api/contacts/'+contacts[3].id,{cookie}),200)).contact.emailStatus).toBe('unsubscribed');
  expect(incumbent.members[3].status).toBe('subscribed');
  await panel.getByRole('button',{name:'Synchronize restrictions',exact:true}).click();
  await expect(panel.getByRole('alert').filter({hasText:'Synchronization could not complete'})).toBeVisible();
  expect((await site.call('/api/settings/incumbent-restrictions/'+status.connections[0].id,{method:'DELETE',cookie})).status).toBe(409);
  incumbent.failures.writeStatus=0;
  const retried=page.waitForResponse(response=>response.url().endsWith('/api/settings/incumbent-restrictions/sync')&&response.request().method()==='POST');
  await panel.getByRole('button',{name:'Synchronize restrictions',exact:true}).click();
  const retryResult=await retried;expect(retryResult.status(),await retryResult.text()).toBe(200);
  await expect(panel.getByRole('alert')).toHaveCount(0);
  expect(incumbent.members[3].status).toBe('unsubscribed');
  expect((await json(await site.call('/api/contacts/'+contacts[0].id,{cookie}),200)).contact.emailStatus).toBe('unsubscribed');
  expect((await json(await site.call('/api/contacts/'+contacts[1].id,{cookie}),200)).contact.emailStatus).toBe('suppressed');
  // A later subscribed snapshot is marketing input, never recipient re-consent.
  incumbent.members[0].status='subscribed';incumbent.members[1].status='subscribed';
  await json(await site.call('/api/settings/incumbent-restrictions/sync',{method:'POST',cookie}),200);
  expect(incumbent.members.slice(0,2).map(member=>member.status)).toEqual(['unsubscribed','unsubscribed']);
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});await panel.scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await panel.locator('input,button,p,label').evaluateAll(elements=>elements.every(element=>parseFloat(getComputedStyle(element).fontSize)>=13))).toBe(true);
    await panel.screenshot({path:info.outputPath('opt-out-parallel-'+width+'.png')});
  }
  await openPage(page,site.runtime.url+'/docs/integrations#mailchimp-restrictions-during-a-parallel-run');
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.getByRole('heading',{name:'Mailchimp restrictions during a parallel run',exact:true}).scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath('opt-out-guide-'+width+'.png')});
  }
  // Keep a genuinely allowed recipient in the same scheduled campaign as the refused ones.
  const allowed=['synthetic-mango-2406','example.test'].join('@');
  await confirmedContact(site,edge,cookie,allowed,'Allowed garden reader');
  const allowedDue=new Date((await site.control('/_golive/clock')).now+7000);
  const allowedCampaign=await draftCampaign(site,cookie,'Allowed parallel letter',[allowed],allowedDue);
  await approve(site,cookie,allowedCampaign);
  expect((await dispatch(site,allowedCampaign.campaignId,allowedDue)).map(row=>row.transport_disposition)).toEqual(['accepted']);
  const skipped=await dispatch(site,campaign.campaignId,due);
  expect(skipped).toHaveLength(4);expect(skipped.every(row=>row.transport_disposition==='skipped')).toBe(true);
  expect(skipped.map(row=>row.skip_reason)).toEqual(Array(4).fill('channel-not-subscribed'));
  expect(edge.sends.filter(send=>addresses.includes(send.to)&&send.body.headers?.['List-Unsubscribe'])).toEqual([]);
  console.log('PROBE CONT-004 3: parallel Mailchimp snapshots and failed writeback retry -> restrictions persist both ways, queued four skipped, independent allowed recipient accepted');
  await restrictionPrivateJourney(site,cookie,connection.apiKey);
  let erasure=await site.call('/api/contacts/'+contacts[0].id,{method:'DELETE',cookie}),receipt=await erasure.json();
  for(let turn=0;erasure.status===202&&turn<400;turn++) {
    erasure=await site.call('/api/audience/erasures/'+receipt.receipt.reference+'/resume',{method:'POST',cookie,body:{}});receipt=await erasure.json();
  }
  expect(erasure.status,JSON.stringify(receipt)).toBe(200);
  incumbent.members[0].status='subscribed';
  await json(await site.call('/api/settings/incumbent-restrictions/sync',{method:'POST',cookie}),200);
  expect(incumbent.members[0].status).toBe('unsubscribed');
  expect((await site.call('/api/contacts/'+contacts[0].id,{cookie})).status).toBe(404);
  expect((await json(await site.call('/api/contacts/search?address='+encodeURIComponent(addresses[0]),{cookie}),200)).contacts).toEqual([]);
  await json(await site.call('/api/settings/incumbent-restrictions/'+status.connections[0].id,{method:'DELETE',cookie}),200);
  const calls=incumbent.requests.length;
  await json(await site.call('/api/settings/incumbent-restrictions/sync',{method:'POST',cookie}),200);
  expect(incumbent.requests).toHaveLength(calls);
  expect(await site.rows('SELECT id FROM incumbent_restriction_connections')).toEqual([]);
}

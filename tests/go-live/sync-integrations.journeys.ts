import AxeBuilder from '@axe-core/playwright';
import {openPage} from '../support/navigation';
import {manualEntryJourney} from './manual-entry-journey';
import {proveReviewLoyalty} from './review-loyalty-journey';
import {proveCustomEvents} from './custom-event-journey';
import { test, expect } from '@playwright/test';
import { providerEdge } from './edge';
import { event, eventSigner } from './sendgrid-events';
import { activityJourney } from './activity-log';
import { installation, json, sender, availableTransport, draftCampaign, approve, dispatch, signedPost } from './harness';

test('[CONT-026][CONT-025] [INT-007][INT-014][INT-011][OPER-007][CONT-004][CONT-006] scoped custom events and client sync, replayable refusals and last-moment send suppression', async ({page: browserPage}, info) => {
  const edge = await providerEdge(), signer = eventSigner(), site = await installation(edge, signer,{sms:true});
  try {
    const cookie = await site.open();
    await browserPage.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await json(await site.call('/api/settings/sender', {method: 'PUT', cookie, body: sender}), 200);
    const signedInEntry=await site.call('/signin',{cookie});
    expect(signedInEntry.status).toBe(303);
    expect(signedInEntry.headers.get('Location')).toBe('/app');
    for(const [target,expected] of [['/app/audience?view=contacts','/app/audience?view=contacts'],['https://outside.example/path','/app'],['//outside.example/path','/app'],['/signin','/app']]) {
      const response=await site.call('/signin?returnTo='+encodeURIComponent(target),{cookie});
      expect(response.status).toBe(303);expect(response.headers.get('Location')).toBe(expected);
    }
    const entryErrors:string[]=[];
    browserPage.on('pageerror',error=>entryErrors.push(error.message));
    browserPage.on('console',message=>{if(message.type()==='error'&&/hydration|hydrated.*match/i.test(message.text()))entryErrors.push(message.text());});
    for(const width of [1440]) {
      await browserPage.setViewportSize({width,height:1000});await openPage(browserPage,site.runtime.url+'/signin');
      await expect(browserPage).toHaveURL(site.runtime.url+'/app');
      await expect(browserPage.getByRole('heading',{name:'Sign in to Mango',exact:true})).toHaveCount(0);
      expect(await browserPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect((await new AxeBuilder({page:browserPage}).analyze()).violations.filter(v=>v.impact==='serious'||v.impact==='critical')).toEqual([]);
      await browserPage.screenshot({path:info.outputPath('signed-in-entry-'+width+'.png'),fullPage:true});
    }
    expect(entryErrors).toEqual([]);

    await json(await site.call('/api/settings/sender/confirmation', {method: 'POST', cookie, body: {}}), 202);
    const message = edge.sends.findLast(send => send.to === 'owner@example.test')!;
    const check = /https:\/\/\S+\/sender-check\/\S+/.exec(message.body.content.find((part: any) => part.type === 'text/plain').value)![0];
    expect((await fetch(site.local(check), {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=true'})).status).toBe(200);
    const created = await json(await site.call('/api/settings/integrations', {method: 'POST', cookie,
      body: {name: 'Coffer donor sync', scopes: ['contacts:read', 'contacts:write', 'events:read', 'campaigns:send']}}), 201);
    const headers = {Authorization: `Bearer ${created.token}`};
    const api = (path: string, method = 'GET', body?: unknown) => site.call('/api/integrations/v1' + path, {headers, method, body});
    expect((await site.call('/api/operator', {headers})).status).toBe(401);
    const inventory = await json(await site.call('/api/settings/integrations', {cookie}), 200);
    expect(JSON.stringify(inventory)).not.toContain(created.token);
    const consent = {source: 'Coffer signup', evidence: 'Please send the monthly Mango Garden newsletter.', brandOrLegalSender: 'Mango Garden',
      messageCategory: 'newsletter', frequencyDisclosure: 'Monthly', destinationJurisdiction: 'AU', consentVersion: 'v1', occurredAt: new Date(Date.now() - 1000).toISOString()};
    const contact = {email: 'alex@example.test', displayName: 'Alex River', segmentName: 'Coffer donors', fields: {cofferDonorId: 'alex'}, tags: ['donor'], subscribe: true, consent};
    await availableTransport(site);
    const first = await json(await api('/contacts', 'PUT', contact), 200);
    const replay = await json(await api('/contacts', 'PUT', {...contact, email: ' ALEX@example.test '}), 200);
    expect(replay.contact.id).toBe(first.contact.id);
    expect(replay.contact).toMatchObject({email: 'alex@example.test', emailStatus: 'pending', fields: {cofferDonorId: 'alex'}, tags: ['donor']});
    await availableTransport(site);
    await json(await api('/contacts', 'PUT', {...contact, email: 'blair@example.test', displayName: 'Blair Lane', segmentName: 'Coffer follow-up donors'}), 200);
    for(const email of ['alex@example.test','blair@example.test']){
      const confirmations=edge.sends.filter(send=>send.to===email&&send.body.subject==='Confirm your Mango Garden subscription');expect(confirmations).toHaveLength(1);
      const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(confirmations[0].body.content.find((part:any)=>part.type==='text/plain').value)![0];
      expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
      expect((await json(await api('/contacts?email='+encodeURIComponent(email)),200)).contacts[0].emailStatus).toBe('subscribed');
    }
    expect(await json(await api('/contacts', 'PUT', {...contact, email: 'missing-evidence@example.test', consent: undefined}),400)).toEqual({error:'consent_evidence_required'});
    await proveCustomEvents(site,cookie,first.contact.id,first.contact.segmentIds[0],browserPage,info);
    const reader = await json(await site.call('/api/settings/integrations', {method: 'POST', cookie, body: {name: 'Read only', scopes: ['contacts:read']}}), 201);
    expect((await site.call('/api/integrations/v1/contacts', {method: 'PUT', headers: {Authorization: `Bearer ${reader.token}`}, body: contact})).status).toBe(403);
    const firstDue = new Date(Date.now() + 30000);
    const sent = await json(await site.call('/api/campaigns', {method: 'POST', cookie, body: {}}), 201);
    const inclusionRuleJson = JSON.stringify({version: 1, operator: 'all', predicates: [{sourceType: 'contact', field: 'id', comparator: 'in', value: [first.contact.id]}]});
    await json(await site.call(`/api/campaign-revisions/${sent.revisionId}`, {method: 'PATCH', cookie, body: {
      name: 'Thank you donors', emailSubject: 'Thank you for growing with us', preheader: 'A note from the garden', emailBody: '<p>Thank you for supporting the garden.</p>',
      audienceRule: 'Coffer donors', inclusionRuleJson, exclusionRulesJson: '[]', messageCategory: 'newsletter',
      steps: [{channel: 'email', timezone: 'Australia/Brisbane', scheduledAt: firstDue.toISOString(), sendByAt: new Date(firstDue.getTime() + 3600000).toISOString(), whyThisTime: 'Owner chose this time'}],
    }}), 200);
    const senderKey = await json(await site.call('/api/settings/integrations', {method: 'POST', cookie, body: {name: 'Approved segment sender', scopes: ['campaigns:send']}}), 201);
    const send = () => site.call(`/api/integrations/v1/campaigns/${sent.campaignId}/send`, {method: 'POST', headers: {Authorization: `Bearer ${senderKey.token}`}, body: {revisionId: sent.revisionId, segmentId: first.contact.segmentIds[0]}});
    expect((await send()).status).toBe(409);
    await approve(site, cookie, sent);
    // Approval also queues the step's own dispatch for its real due instant, which would complete the
    // campaign first. Reach the due instant on the Worker clock alone so the integration send leads;
    // both commands share one dispatch idempotency key, so the later approval command is fenced.
    const beforeDue = await site.control('/_golive/clock');
    await site.control('/_golive/clock', {advanceMs: firstDue.getTime() - beforeDue.now + 1});
    await json(await send(), 202);
    expect((await dispatch(site, sent.campaignId, firstDue))[0].transport_disposition).toBe('accepted');
    const delivered = edge.sends.findLast(send => send.to === 'alex@example.test' && send.body.headers?.['List-Unsubscribe'])!;
    const html = delivered.body.content.find((part: any) => part.type === 'text/html').value;
    const unsubscribe = /href="(https:\/\/[^\"]+\/unsubscribe\/[^\"]+)"[^>]*>Unsubscribe<\/a>/.exec(html)![1].replaceAll('&amp;', '&');
    const nextDue = new Date((await site.control('/_golive/clock')).now + 7000);
    const queued = await draftCampaign(site, cookie, 'Next donor update', ['blair@example.test'], nextDue);
    await approve(site, cookie, queued);
    expect((await fetch(site.local(unsubscribe))).status).toBe(200);
    expect((await json(await api('/events?cursor=0'), 200)).events).toEqual([]);
    expect((await fetch(site.local(unsubscribe), {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'}, body: 'confirm=true'})).status).toBe(200);
    const refusal = {email: 'blair@example.test', reason: 'Coffer donor chose no email', idempotencyKey: 'coffer:blair:consent-2'};
    await json(await api('/suppressions', 'POST', refusal), 200);
    await json(await api('/suppressions', 'POST', refusal), 200);
    const page = await json(await api('/events?cursor=0&limit=1'), 200);
    expect(page.events).toHaveLength(1);
    expect(page.events[0]).toMatchObject({type: 'unsubscribe', email: 'alex@example.test'});
    expect(await json(await api('/events?cursor=0&limit=1'), 200)).toEqual(page);
    const tail = await json(await api('/events?cursor=' + page.nextCursor), 200);
    expect(tail.events.filter((value: any) => value.type === 'suppression' && value.email === refusal.email)).toHaveLength(1);
    await json(await api('/contacts', 'PUT', contact), 200);
    expect((await json(await api('/contacts?email=alex%40example.test'), 200)).contacts[0].emailStatus).toBe('unsubscribed');
    const dispositions = await dispatch(site, queued.campaignId, nextDue);
    expect(dispositions.map(row => [row.email, row.transport_disposition])).toEqual([['blair@example.test', 'skipped']]);
    expect(edge.sends.filter(send => send.body.headers?.['List-Unsubscribe'])).toHaveLength(1);
    const facts = Buffer.from(JSON.stringify([event('bounce', 'alex@example.test', Date.now(), 'prior-mail', {}, {type: 'bounce'}), event('spamreport', 'blair@example.test', Date.now(), 'other-mail', {})]));
    expect(await signedPost(site, '/webhooks/mail/sendgrid', facts, signer.headers(facts))).toBe(204);
    const changes = await json(await api('/events?cursor=' + tail.nextCursor), 200);
    expect(changes.events.map((value: any) => value.type)).toEqual(expect.arrayContaining(['bounce', 'complaint']));
    await json(await site.call(`/api/settings/integrations/${created.credential.id}`, {method: 'DELETE', cookie}), 200);
    expect((await api('/contacts?email=alex%40example.test')).status).toBe(401);
    const audit = await json(await site.call('/api/settings/integrations/audit?limit=100', {cookie}), 200);
    expect(audit.audit.some((entry: any) => entry.status === 403)).toBe(true);
    expect(audit.audit.some((entry: any) => entry.credentialId === created.credential.id && entry.status === 401)).toBe(true);
    expect(JSON.stringify(audit)).not.toContain(created.token);
    await activityJourney(site, edge, cookie, browserPage, info, {sent});
    await manualEntryJourney(site,edge,cookie,browserPage,info);
    await proveReviewLoyalty(site,cookie,browserPage,info,edge);
    expect(edge.unexpected).toEqual([]);
  } finally {await site.runtime.close(); await edge.close();}
  const managedEdge = await providerEdge(), managed = await installation(managedEdge, eventSigner(), {managed: 'none'});
  try {
    const cookie = await managed.open();
    const key = await json(await managed.call('/api/settings/integrations', {method: 'POST', cookie, body: {name: 'Managed segment sender', scopes: ['campaigns:send']}}), 201);
    expect((await managed.call('/api/integrations/v1/campaigns/unapproved/send', {method: 'POST', headers: {Authorization: `Bearer ${key.token}`},
      body: {revisionId: 'unapproved', segmentId: 'unavailable-segment'}})).status).toBe(503);
    expect(managedEdge.sends).toEqual([]);
    expect(managedEdge.relaySends).toEqual([]);
  } finally {await managed.runtime.close(); await managedEdge.close();}
});

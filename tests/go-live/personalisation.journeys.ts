import {test} from '@playwright/test';
import { expect } from '@playwright/test';

import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, consent, confirmedContact, draftCampaign, approve, dispatch, availableTransport } from './harness';
import { openPage, reloadPage } from '../support/navigation';

test("[MSG-008] saved review counts fallback recipients and delivery uses the same escaped personalisation",async ({page}, info) => {
  const edge = await providerEdge(), site = await installation(edge,eventSigner());
  try {
    await page.setViewportSize({width:390,height:1000});
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const named = 'ava@example.test', unnamed = 'reader@example.test', pending = 'pending@example.test';
    const displayName = 'Ava <b>Gardener</b> & Co';
    await confirmedContact(site,edge,cookie,named,displayName);
    await confirmedContact(site,edge,cookie,unnamed,'');
    await availableTransport(site);
    await json(await site.call('/api/contacts/consent',{method:'POST',cookie,body:{...consent,contact:{email:pending},occurredAt:new Date().toISOString()}}),201);
    const clock = await site.control('/_golive/clock',{hold:true}), due = new Date(clock.now+3600000);
    const campaign = await draftCampaign(site,cookie,'Your garden club letter',[named,unnamed,pending],due);
    const patch = async (body:unknown) => json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body}),200);
    const review = async () => json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
    await patch({emailSubject:'For {{displayName}}',emailBody:'<p>Hello {{displayName}}.</p>'});
    const invalid = await review();
    expect(invalid.checks.some((check:any)=>check.kind==='message.personalisation'&&check.blocking)).toBe(true);
    await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:campaign.revisionId,idempotencyKey:'missing-fallback-refused'}}),409);
    expect(await site.count('recipient_steps')).toBe(0);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
    await page.getByLabel('Email subject',{exact:true}).fill('For {{displayName | fallback: Garden friend}}');
    await page.getByLabel('Email preheader',{exact:true}).fill('A note for {{displayName | fallback: Garden friend}}');
    await page.getByRole('button',{name:'HTML mode',exact:true}).click();
    await page.getByLabel('Email body',{exact:true}).fill('<p>Hello {{displayName | fallback: Garden friend}}.</p><p>Thank you, {{displayName | fallback: Garden friend}}.</p>');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    const checked = await review();
    expect(checked.candidateCount).toBe(3);
    expect(checked.eligibleCount).toBe(2);
    expect(checked.channelCounts).toEqual([{channel:'email',eligibleContactCount:2,fallbackContactCount:1,recipientStepCount:2}]);
    for(const width of [390]) {
      await page.setViewportSize({width,height:1000});await reloadPage(page);
      await expect(page.getByLabel('Email subject',{exact:true})).toHaveValue('For {{displayName | fallback: Garden friend}}');
      await expect(page.getByLabel('Email preheader',{exact:true})).toHaveValue('A note for {{displayName | fallback: Garden friend}}');
      await page.getByRole('button',{name:'HTML mode',exact:true}).click();
      await expect(page.getByLabel('Email body',{exact:true})).toHaveValue('<p>Hello {{displayName | fallback: Garden friend}}.</p><p>Thank you, {{displayName | fallback: Garden friend}}.</p>');
      await expect(page.getByLabel('Personalisation fallback counts')).toContainText('1 of 2');
      await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('Hello Alex Example.');
      await expect(page.locator('.message-preview--plain')).toContainText('Thank you, Alex Example.');
      await page.locator('.rich-email-fieldset').screenshot({path:info.outputPath(`personalisation-editor-${width}.png`)});
      await page.locator('.audience-snapshot').screenshot({path:info.outputPath(`fallback-counts-${width}.png`)});
      await page.locator('.message-preview--email').screenshot({path:info.outputPath(`personalised-preview-${width}.png`)});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      await page.screenshot({path:info.outputPath(`personalisation-review-${width}.png`),fullPage:true});
      await page.setViewportSize({width:1440,height:1000});await reloadPage(page);
      await page.locator('.rich-email-fieldset').screenshot({path:info.outputPath('personalisation-editor-1440.png')});
      await page.locator('.audience-snapshot').screenshot({path:info.outputPath('fallback-counts-1440.png')});
      await page.locator('.message-preview--email').screenshot({path:info.outputPath('personalised-preview-1440.png')});
      await page.screenshot({path:info.outputPath('personalisation-review-1440.png'),fullPage:true});
      await page.setViewportSize({width,height:1000});
    }
    // Unknown properties use their saved fallback in both the illustrative preview and real delivery.
    await patch({preheader:'Your {{first_name | fallback: garden}} update'});
    const changed = await review();
    expect(changed.channelCounts[0].fallbackContactCount).toBe(2);
    for (const width of [390]) {
      await page.setViewportSize({width,height:1000});await reloadPage(page);
      await expect(page.locator('.message-preview--email')).toContainText('Preheader: Your garden update');
      await expect(page.getByLabel('Personalisation fallback counts')).toContainText('2 of 2');
      await page.locator('.message-preview--email').screenshot({path:info.outputPath(`property-fallback-preview-${width}.png`)});
      await page.setViewportSize({width:1440,height:1000});await reloadPage(page);
      await page.locator('.message-preview--email').screenshot({path:info.outputPath('property-fallback-preview-1440.png')});
      await page.setViewportSize({width,height:1000});
    }
    await approve(site,cookie,campaign);
    await site.control('/_golive/clock',{advanceMs:3600001,hold:false});
    const outcomes = await dispatch(site,campaign.campaignId,due);
    expect(outcomes.map(row=>row.email)).toEqual([named,unnamed]);
    expect(outcomes.every(row=>row.transport_disposition==='accepted')).toBe(true);
    for(const [email,value,htmlValue] of [[named,displayName,'Ava &lt;b&gt;Gardener&lt;/b&gt; &amp; Co'],[unnamed,'Garden friend','Garden friend']]) {
      const sent = edge.sends.findLast(send=>send.to===email&&send.body.headers?.['List-Unsubscribe'])!;
      expect(sent.body.subject).toBe(`For ${value}`);
      const html=sent.body.content.find((part:any)=>part.type==='text/html').value;
      const plain=sent.body.content.find((part:any)=>part.type==='text/plain').value;
      expect(html).toContain(`Hello ${htmlValue}.`);expect(html).toContain(`Thank you, ${htmlValue}.`);
      expect(plain).toContain(`Hello ${value}.`);expect(plain).toContain(`Thank you, ${value}.`);
      expect(html).toContain('Your garden update');expect(html).not.toContain('{{displayName');
    }
    const saved=await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
    expect(saved.audienceChannelCounts[0]).toMatchObject({eligibleContactCount:2,fallbackContactCount:2});


    // All eligible people resolve the name, so the missing fallback must be the only approval blocker.
    const allNamed = [2,3].map(number => ({email:named.replace('ava',`synthetic-mango-${number}`),displayName:`Garden reader ${number}`}));
    const contactIds:string[] = [];
    for (const contact of allNamed) {
      await confirmedContact(site,edge,cookie,contact.email,contact.displayName);
      const found = await json(await site.call(`/api/contacts/search?address=${encodeURIComponent(contact.email)}`,{cookie}),200);
      expect(found.contacts).toEqual([expect.objectContaining({...contact,emailStatus:'subscribed'})]);
      contactIds.push(found.contacts[0].id);
    }
    await availableTransport(site);
    const isolatedClock = await site.control('/_golive/clock',{hold:true});
    const isolated = await draftCampaign(site,cookie,'Named garden readers',allNamed.map(contact=>contact.email),new Date(isolatedClock.now+3600000));
    const isolatedPath = `/api/campaigns/${isolated.campaignId}`;
    const readIsolated = () => site.call(isolatedPath,{cookie}).then(response=>json(response,200));
    const patchIsolated = (emailBody:string) => site.call(`/api/campaign-revisions/${isolated.revisionId}`,{method:'PATCH',cookie,body:{emailBody}}).then(response=>json(response,200));
    const reviewIsolated = () => site.call(`${isolatedPath}/checks`,{method:'POST',cookie,body:{revisionId:isolated.revisionId}}).then(response=>json(response,200));
    // The same saved email passes every check before introducing its bare token.
    expect((await reviewIsolated()).checks.filter((check:any)=>check.blocking)).toEqual([]);
    await patchIsolated('<p>Hello {{displayName}}. The spring beds are in.</p>');
    const isolatedReview = await reviewIsolated();
    expect(isolatedReview.candidateCount).toBe(2);
    expect(isolatedReview.eligibleCount).toBe(2);
    expect(isolatedReview.channelCounts).toEqual([{channel:'email',eligibleContactCount:2,fallbackContactCount:0,recipientStepCount:2}]);
    expect(isolatedReview.checks.filter((check:any)=>check.blocking)).toEqual([
      expect.objectContaining({kind:'message.personalisation',status:'blocked',detail:expect.stringContaining('displayName')})
    ]);
    const beforeRefusal = await readIsolated();
    expect(beforeRefusal.campaign).toMatchObject({state:'draft',activeRevisionId:isolated.revisionId});
    expect(beforeRefusal.revision).toMatchObject({state:'draft',contentDigest:null,approvedAt:null,approvedByOperatorId:null});
    const refused = await json(await site.call(`${isolatedPath}/approve`,{method:'POST',cookie,body:{revisionId:isolated.revisionId,idempotencyKey:'all-named-missing-fallback'}}),409);
    expect(refused.status).toBe('blocked');
    expect(refused.blockers).toEqual([expect.objectContaining({kind:'message.personalisation',blocking:true})]);
    const afterRefusal = await readIsolated();
    expect(afterRefusal.campaign).toEqual(beforeRefusal.campaign);
    expect(afterRefusal.revision).toEqual(beforeRefusal.revision);
    expect(afterRefusal.steps).toEqual(beforeRefusal.steps);
    expect(await site.rows(`SELECT * FROM campaign_approval_requests WHERE campaign_id='${isolated.campaignId}'`)).toEqual([]);
    expect(await site.rows(`SELECT * FROM campaign_revision_candidates WHERE revision_id='${isolated.revisionId}'`)).toEqual([]);
    expect(await site.rows(`SELECT * FROM recipient_steps WHERE campaign_id='${isolated.campaignId}'`)).toEqual([]);
    const dispatchCommands = async () => (await site.control('/_golive/emissions')).filter((emission:any)=>emission.command.kind==='campaign.dispatch'&&emission.command.payload.campaignId===isolated.campaignId);
    expect(await dispatchCommands()).toEqual([]);
    expect(edge.sends.filter(send=>allNamed.some(contact=>contact.email===send.to)&&send.body.headers?.['List-Unsubscribe'])).toEqual([]);

    // Adding only the fallback admits ordinary approval and schedules precisely this verified audience.
    await patchIsolated('<p>Hello {{displayName | fallback: Garden friend}}. The spring beds are in.</p>');
    expect((await reviewIsolated()).checks.filter((check:any)=>check.blocking)).toEqual([]);
    const isolatedApproval = await approve(site,cookie,isolated);
    expect(isolatedApproval).toMatchObject({status:'scheduled',idempotent:false,revisionDigest:expect.stringMatching(/^[a-f0-9]{64}$/)});
    const scheduled = await readIsolated();
    expect(scheduled.campaign).toMatchObject({state:'scheduled',activeRevisionId:isolated.revisionId});
    expect(scheduled.revision).toMatchObject({state:'approved',contentDigest:isolatedApproval.revisionDigest,approvedByOperatorId:'go-live-owner'});
    expect(scheduled.audienceChannelCounts).toEqual([expect.objectContaining({channel:'email',eligibleContactCount:2,fallbackContactCount:0,recipientStepCount:2})]);
    expect(await site.rows(`SELECT revision_id,revision_digest,operator_id FROM campaign_approval_requests WHERE campaign_id='${isolated.campaignId}'`)).toEqual([
      {revision_id:isolated.revisionId,revision_digest:isolatedApproval.revisionDigest,operator_id:'go-live-owner'}
    ]);
    const frozenRecipients = await site.rows(`SELECT contact_id,destination,channel,transport_disposition FROM recipient_steps WHERE campaign_id='${isolated.campaignId}' ORDER BY destination`);
    expect(frozenRecipients).toEqual(allNamed.map((contact,index)=>({contact_id:contactIds[index],destination:contact.email,channel:'email',transport_disposition:'queued'})));
    expect(await dispatchCommands()).toEqual([expect.objectContaining({command:expect.objectContaining({payload:expect.objectContaining({campaignId:isolated.campaignId,revisionId:isolated.revisionId,channel:'email'})})})]);
  } finally {await site.runtime.close();await edge.close();}
});

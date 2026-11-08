import { test, expect } from '@playwright/test';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, consent, confirmedContact, draftCampaign, approve, availableTransport } from './harness';

test('f134: a delayed fake provider produces consent uncertainty without a link lookup', async () => {
  let delay = false;
  const edge = await providerEdge({sending: async(url, request) => {
    if (delay && url.hostname === 'api.sendgrid.com' && url.pathname === '/v3/mail/send' && request.method === 'POST') {
      const start = performance.now();
      await new Promise(resolve => setTimeout(resolve, 16000));
      console.log('FLEET_PROVIDER_DELAY', JSON.stringify({elapsedMs: performance.now() - start}));
    }
    return false;
  }}), site = await installation(edge, eventSigner());
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method:'PUT', cookie, body:sender}), 200);
    await site.control('/_golive/sender-evidence');
    await availableTransport(site);
    delay = true;
    const clock = await site.control('/_golive/clock');
    const result = await json(await site.call('/api/contacts/consent', {method:'POST', cookie,
      body:{...consent,contact:{email:'uncertain-reader@example.test',displayName:'Garden reader'},occurredAt:new Date(clock.now).toISOString()}}), 409);
    console.log('FLEET_CONSENT_FAILURE', JSON.stringify(result));
    expect(result).toMatchObject({error:'consent_capture_failed',detail:'Confirmation delivery is uncertain; the attempt will not be repeated automatically.'});
  } finally {await site.runtime.close();await edge.close();}
});

test('f137: expiry before resume produces a completed campaign and a refusal', async () => {
  const edge = await providerEdge(), site = await installation(edge, eventSigner());
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    await confirmedContact(site,edge,cookie,'expiry-reader@example.test','Garden reader');
    const clock = await site.control('/_golive/clock',{hold:true});
    const campaign = await draftCampaign(site,cookie,'Expiry while paused',['expiry-reader@example.test'],new Date(clock.now+3600000));
    await approve(site,cookie,campaign);
    await json(await site.call(`/api/campaigns/${campaign.campaignId}/pause`,{method:'POST',cookie}),200);
    await site.control('/_golive/clock',{advanceMs:4*3600000});
    await site.control('/_golive/cron');
    const result = await json(await site.call(`/api/campaigns/${campaign.campaignId}/resume`,{method:'POST',cookie}),409);
    const state = await site.rows(`SELECT state FROM campaigns WHERE id='${campaign.campaignId}'`);
    const recipients = await site.rows(`SELECT transport_disposition,skip_reason FROM recipient_steps WHERE campaign_id='${campaign.campaignId}'`);
    console.log('FLEET_EXPIRED_RESUME',JSON.stringify({result,state,recipients}));
    expect(result).toEqual({error:'campaign_not_operator_paused'});
    expect(state).toEqual([{state:'completed'}]);
    expect(recipients).toEqual([{transport_disposition:'skipped',skip_reason:'send-window-expired'}]);
    expect(edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe'])).toHaveLength(0);
  } finally {await site.runtime.close();await edge.close();}
});

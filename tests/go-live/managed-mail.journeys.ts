import {proveSenderRenewal} from './sender-renewal-journey';
import { openPage } from '../support/navigation';
import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, consent, draftCampaign, approve, dispatch, availableTransport } from './harness';

// One public flow proves the Managed transactional boundary and both supported
// owner marketing connections. Only the paid provider/DNS/receiving edge is fake.
test('[SEND-001][OPER-001][DELIV-007] Managed relay confirms access and consent while the owner connection sends approved newsletters', async ({browser},info) => {
  const shots = process.env.MANGO_RELEASE_SHOTS;
  if (shots) await mkdir(shots, {recursive:true});
  for (const provider of ['none', 'sendgrid', 'resend'] as const) {
    const edge = await providerEdge(), signer = eventSigner();
    const site = await installation(edge, signer, {managed:provider === 'none' ? 'none' : 'connected', mailProvider:provider === 'resend' ? 'resend' : 'sendgrid'});
    const context=await browser.newContext();
    const page = await context.newPage();
    try {
      const cookie = await site.open();
      await json(await site.call('/api/settings/sender', {method:'PUT', cookie, body:sender}), 200);
      const signin = await site.call('/auth/magic-link', {method:'POST', body:{email:'owner@example.test', returnTo:'/app'},headers:{'CF-Connecting-IP':'192.0.2.10'}});
      expect(signin.status, await signin.text()).toBe(202);
      expect(edge.relaySends).toHaveLength(1);
      expect(edge.relaySends[0].authorization).toBe('Bearer managed-relay-test-key');
      expect(edge.relaySends[0].body.to).toBe('owner@example.test');
      await availableTransport(site);
      await json(await site.call('/api/contacts/consent', {method:'POST', cookie, body:{...consent, contact:{email:'gardener@example.test',displayName:'Ada Gardener'},occurredAt:new Date().toISOString()}}), 201);
      const confirmation = edge.relaySends.at(-1)!;
      expect(confirmation.body.to).toBe('gardener@example.test');
      const link = /https:\/\/\S+\/consent\/confirm\/\S+/.exec(confirmation.body.text)![0];
      expect((await fetch(site.local(link), {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
      const campaigns = await json(await site.call('/api/campaigns', {cookie}), 200);
      expect(campaigns.marketingConnectionRequired).toBe(provider === 'none');
      expect(campaigns.commerceEnabled).toBe(false);
      expect(campaigns.aiEnabled).toBe(false);
      if (provider === 'none') {
        expect(edge.sends).toHaveLength(0);
        await page.context().setExtraHTTPHeaders({Cookie:cookie});
        for (const width of [1440,390]) {
          await page.setViewportSize({width,height:1000});
          await openPage(page, site.runtime.url+'/app/campaigns');
          await expect(page.getByRole('heading',{name:'Connect a newsletter provider'})).toBeVisible();
          await page.getByRole('button',{name:'New campaign',exact:true}).click();
          await expect(page.getByRole('button',{name:'Blank newsletter'})).toBeVisible();
          await expect(page.getByRole('heading',{name:'From store signals'})).toHaveCount(0);
          await expect(page.getByRole('heading',{name:'Saved suggestions'})).toHaveCount(0);
          if (shots) await page.screenshot({path:resolve(shots,`campaigns-managed-${width}.png`),fullPage:true});
        }
        await page.context().setExtraHTTPHeaders({});
        continue;
      }
      await availableTransport(site);
      await site.control('/_golive/sender-evidence');
      const due = new Date(Date.now()+120_000);
      const campaign = await draftCampaign(site,cookie,'Market garden letter',['gardener@example.test'],due);
      await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
      expect((await approve(site,cookie,campaign)).status).toBe('scheduled');
      expect((await site.call('/api/insights/open-tracking',{method:'PUT',cookie,body:{enabled:true}})).status).toBe(409);
      if (provider === 'sendgrid' && shots) {
        await page.context().setExtraHTTPHeaders({Cookie:cookie});
        for (const width of [1440,390]) {
          await page.setViewportSize({width,height:1000});
          await openPage(page, site.runtime.url+'/app/insights');
          await page.getByRole('checkbox',{name:'Enable privacy-sensitive open estimates'}).click();
          await expect(page.getByRole('alert')).toContainText('Finish or cancel approved email');
          await page.screenshot({path:resolve(shots,`insights-approved-${width}.png`),fullPage:true});
          await openPage(page, site.runtime.url+'/app/settings');
          await expect(page.getByRole('heading',{name:'Settings',exact:true})).toBeVisible();
          await page.waitForLoadState('networkidle');
          await page.screenshot({path:resolve(shots,`settings-operators-${width}.png`),fullPage:true});
        }
        await page.context().setExtraHTTPHeaders({});
      }
      const relayCount = edge.relaySends.length;
      await site.control('/_golive/clock',{advanceMs:121_000});
      const recipients = await dispatch(site,campaign.campaignId,due);
      expect(recipients.map(row=>row.transport_disposition)).toEqual(['accepted']);
      expect(edge.relaySends).toHaveLength(relayCount);
      await json(await site.call('/api/insights/open-tracking',{method:'PUT',cookie,body:{enabled:true}}),200);
      if (provider === 'sendgrid') {
        const letter = edge.sends.findLast(send=>send.to==='gardener@example.test')!;
        expect(letter.body.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
      } else expect(edge.resend.sends.some(send=>send.body.to.includes('gardener@example.test'))).toBe(true);
      if(provider==='resend')await proveSenderRenewal(page,site,edge,cookie,info);
      expect(edge.unexpected).toEqual([]);
    } finally {await context.close();await site.runtime.close();await edge.close();}
  }
});

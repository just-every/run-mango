import { imageNetwork, imageHosts, imageApi, imageBytes } from './incumbent-image-journey';
import {sourceEdge} from './source-edge';
import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve } from './harness';
import { blockedHostJourney, hostNetwork } from './content-hosts';
import { linkRulesJourney, linkNetwork } from './content-links';
import { smsReviewJourney } from './sms-review';
import { openPage, reloadPage } from '../support/navigation';

contract('MSG-014][MSG-015][MSG-006][MSG-007][MSG-005][MOVE-014', 'review names blocked hosts and links, allows an approver to trust them, keeps advisory safety and shows each SMS with its opt-out', async ({page}, info) => {
  const commerce=sourceEdge();
  const edge = await providerEdge({incumbent:async(url,request,response)=>(await imageApi(url,request,response)) || (await imageBytes(url,request,response)),commerce:request=>commerce.commerce(request),links:{...hostNetwork,...linkNetwork,...imageNetwork}}), site = await installation(edge, eventSigner(), {commerce:true,sms:true,networkHosts:imageHosts});
  try {
    const cookie = await site.open();
    await json(await site.call('/api/settings/sender', {method:'PUT', cookie, body:sender}), 200);
    await site.control('/_golive/sender-evidence');
    await confirmedContact(site, edge, cookie, 'garden-reader@example.test', 'Garden reader');
    const clock = await site.control('/_golive/clock', {hold:true});
    const campaign = await draftCampaign(site, cookie, 'Summer market letter', ['garden-reader@example.test'], new Date(clock.now + 3600000));
    const subject = 'Our summer market letter: herbs, seedlings, garden workshops and everything to bring for a sunny weekend';
    const patch = async (body:unknown) => json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`, {method:'PATCH',cookie,body}),200);
    const review = async () => {
      await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
      return json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
    };
    const ackPath = (check:any) => `/api/campaigns/${campaign.campaignId}/checks/${check.id}/acknowledge`;
    const ackBody = (check:any) => ({revisionId:campaign.revisionId,findingIdentity:check.findingIdentity ?? '0'.repeat(64)});
    await patch({emailSubject:subject, emailBody:'<p style="color:#ffffff">Hidden offer {{displayName}}</p><p><a href="https://unlisted.example/offer">Offer</a></p>'});
    const blocked = await review();
    expect(blocked.checks.filter((check:any) => check.blocking).map((check:any) => check.kind)).toEqual(expect.arrayContaining(['message.content','message.personalisation','message.links']));
    // Every safety finding, including passed checks, is outside the acknowledgement allowlist.
    for (const check of blocked.checks.filter((check:any) => check.kind !== 'message.email-subject-length')) {
      expect(check.findingIdentity).toBeUndefined();
      await json(await site.call(ackPath(check),{method:'POST',cookie,body:ackBody(check)}),409);
    }
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await openPage(page,`${site.runtime.url}/app/campaigns/${campaign.campaignId}/review`);
      const panel = page.locator('.approval-checks');
      await expect(panel.getByRole('button',{name:'Acknowledge advisory',exact:true})).toHaveCount(1);
      await expect(panel).toContainText('Blocking');
      await expect(panel).toContainText('Advisory');
      await panel.screenshot({path:info.outputPath(`content-findings-${width}.png`)});
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    const oldAdvisory = blocked.checks.find((check:any) => check.kind === 'message.email-subject-length');
    await page.getByRole('button',{name:'Acknowledge advisory',exact:true}).click();
    await expect(page.locator('.approval-checks')).toContainText('Acknowledged by');
    await reloadPage(page);
    await expect(page.locator('.approval-checks')).toContainText('Acknowledged by');
    await json(await site.call(ackPath(oldAdvisory),{method:'POST',cookie,body:ackBody(oldAdvisory)}),200);
    expect((await site.rows("SELECT * FROM lifecycle_audit_entries WHERE action='acknowledge-advisory'")).length).toBe(1);
    const rejected = await json(await site.call(`/api/campaigns/${campaign.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:campaign.revisionId,idempotencyKey:'blocked-after-acknowledgement'}}),409);
    expect(rejected.blockers.length).toBeGreaterThan(0);
    expect(await site.count('recipient_steps')).toBe(0);
    await patch({emailBody:'<p>Bring your garden questions to the summer market.</p>',links:[]});
    const current = await review();
    const advisory = current.checks.find((check:any) => check.kind === 'message.email-subject-length');
    expect(advisory.acknowledgement).toBeUndefined();
    expect(advisory.findingIdentity).not.toBe(oldAdvisory.findingIdentity);
    await json(await site.call(ackPath(oldAdvisory),{method:'POST',cookie,body:ackBody(oldAdvisory)}),409);
    expect((await site.call(ackPath(advisory),{method:'POST',body:ackBody(advisory)})).status).toBe(401);
    await json(await site.call(ackPath(advisory),{method:'POST',cookie,headers:{Origin:'https://foreign.example'},body:ackBody(advisory)}),403);
    await reloadPage(page);
    await page.getByRole('button',{name:'Acknowledge advisory',exact:true}).click();
    await expect(page.locator('.approval-checks')).toContainText('Acknowledged by');
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.locator('.approval-checks').screenshot({path:info.outputPath(`acknowledged-advisory-${width}.png`)});
    }
    await approve(site,cookie,campaign);
    const records = await site.rows("SELECT actor_id,occurred_at FROM lifecycle_audit_entries WHERE action='acknowledge-advisory'");
    expect(records).toHaveLength(2);
    expect(records.every(record => record.actor_id === 'go-live-owner' && record.occurred_at > 0)).toBe(true);
    await blockedHostJourney(site,cookie,page,info,clock.now);
    await linkRulesJourney(site,cookie,page,info,clock.now);
    await smsReviewJourney(site,edge,cookie,page,info,clock.now);
  } finally {await site.runtime.close();await edge.close();}
});

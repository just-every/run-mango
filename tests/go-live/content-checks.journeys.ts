import {test} from '@playwright/test';
import { imageNetwork, imageHosts, imageApi, imageBytes } from './incumbent-image-journey';
import {sourceEdge} from './source-edge';
import { expect } from '@playwright/test';

import { providerEdge } from './edge';
import { eventSigner } from './sendgrid-events';
import { installation, json, sender, confirmedContact, draftCampaign, approve } from './harness';
import { blockedHostJourney, hostNetwork } from './content-hosts';
import { linkRulesJourney, linkNetwork } from './content-links';
import { smsReviewJourney } from './sms-review';
import { openPage, reloadPage } from '../support/navigation';

test("[MSG-014][MSG-015][MSG-006][MSG-007][MSG-005][MOVE-014] review names blocked hosts and links, allows an approver to trust them, keeps advisory safety and shows each SMS with its opt-out",async ({page}, info) => {
  const commerce=sourceEdge();
  const edge = await providerEdge({incumbent:async(url,request,response)=>(await imageApi(url,request,response)) || (await imageBytes(url,request,response)),commerce:request=>commerce.commerce(request),links:{...hostNetwork,...linkNetwork,...imageNetwork}}), site = await installation(edge, eventSigner(), {commerce:true,sms:true,networkHosts:[...imageHosts,'admin-review.example.test']});
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
    for (const width of [1440]) {
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
    const acknowledgingOperator = await json(await site.call('/api/operator',{cookie}),200);
    expect(acknowledgingOperator.operator.id).toBe('go-live-owner');
    const startedAt = (await site.control('/_golive/clock',{advanceMs:60000})).now;
    const acknowledgementResponse = page.waitForResponse(response =>
      new URL(response.url()).pathname === ackPath(advisory) && response.request().method() === 'POST');
    await page.getByRole('button',{name:'Acknowledge advisory',exact:true}).click();
    const response = await acknowledgementResponse;
    expect(response.status()).toBe(200);
    const originalRequest = response.request();
    const originalAcknowledgement = originalRequest.postDataJSON();
    expect(originalAcknowledgement).toEqual({revisionId:campaign.revisionId,findingIdentity:advisory.findingIdentity});
    const acknowledged = await response.json();
    const finishedAt = (await site.control('/_golive/clock')).now;
    expect(acknowledged).toMatchObject({status:'acknowledged',acknowledgement:{operatorId:'go-live-owner'}});
    const acknowledgedAt = Date.parse(acknowledged.acknowledgement.acknowledgedAt);
    expect(acknowledgedAt).toBeGreaterThanOrEqual(startedAt);
    expect(acknowledgedAt).toBeLessThanOrEqual(finishedAt);
    const audit = () => site.rows(`SELECT * FROM lifecycle_audit_entries
      WHERE action='acknowledge-advisory' AND operation_key='advisory-acknowledgement:${advisory.findingIdentity}'`);
    const originalAudit = await audit();
    expect(originalAudit).toEqual([expect.objectContaining({entity_type:'campaign-revision',entity_id:campaign.revisionId,
      actor_type:'operator',actor_id:'go-live-owner',occurred_at:acknowledgedAt,created_at:acknowledgedAt})]);
    expect(JSON.parse(originalAudit[0].detail_json)).toMatchObject({campaignId:campaign.campaignId,
      revisionId:campaign.revisionId,findingIdentity:advisory.findingIdentity,kind:advisory.kind,detail:advisory.detail});
    const retainedFinding = async () => {
      const saved = await json(await site.call(`/api/campaigns/${campaign.campaignId}/review`,{cookie}),200);
      const finding = saved.checks.find((check:any) => check.kind === advisory.kind);
      expect(finding).toMatchObject({findingIdentity:advisory.findingIdentity,acknowledgement:acknowledged.acknowledgement});
      return finding;
    };
    const noAuthority = async () => {
      const saved = await json(await site.call(`/api/campaigns/${campaign.campaignId}`,{cookie}),200);
      expect(saved.campaign).toMatchObject({state:'draft',activeRevisionId:campaign.revisionId});
      expect(saved.revision).toMatchObject({state:'draft'});
      for (const table of ['campaign_approval_requests','campaign_revision_candidates','recipient_steps','step_dispatches']) expect(await site.count(table)).toBe(0);
      expect((await site.control('/_golive/emissions')).filter((item:any) => item.command.kind === 'campaign.dispatch')).toEqual([]);
      expect(edge.sends.filter(send => send.body.headers?.['List-Unsubscribe'])).toEqual([]);
    };
    const originalFinding = await retainedFinding();
    await noAuthority();
    await expect(page.locator('.approval-checks')).toContainText('Acknowledged by');
    await expect(page.locator('.approval-checks time')).toHaveAttribute('datetime',acknowledged.acknowledgement.acknowledgedAt);
    const replayAt = (await site.control('/_golive/clock',{advanceMs:120000})).now;
    expect(replayAt).toBeGreaterThan(acknowledgedAt);
    const replayOperatorId = 'synthetic-mango-2';
    const replayCookie = await site.open([replayOperatorId,'example.test'].join('@'),replayOperatorId);
    const replayOperator = await json(await site.call('/api/operator',{cookie:replayCookie}),200);
    expect(replayOperator.operator.id).toBe(replayOperatorId);
    expect(replayOperator.operator.id).not.toBe(acknowledged.acknowledgement.operatorId);
    await reloadPage(page);
    await expect(page.locator('.approval-checks time')).toHaveAttribute('datetime',acknowledged.acknowledgement.acknowledgedAt);
    // Preserve the original-operator replay and exercise the captured request as another operator.
    expect(await json(await site.call(ackPath(advisory),{method:'POST',cookie,body:ackBody(advisory)}),200)).toEqual(acknowledged);
    expect(await json(await site.call(ackPath(advisory),{method:originalRequest.method(),cookie:replayCookie,body:originalAcknowledgement}),200)).toEqual(acknowledged);
    await review();
    const refreshed = await retainedFinding();
    expect(refreshed.id).not.toBe(originalFinding.id);
    expect(await json(await site.call(ackPath(refreshed),{method:'POST',cookie,body:ackBody(advisory)}),200)).toEqual(acknowledged);
    // Expired check row IDs cannot grant authority, even with the exact original payload.
    await json(await site.call(ackPath(advisory),{method:originalRequest.method(),cookie:replayCookie,body:originalAcknowledgement}),409);
    // Another authenticated operator cannot replace the original actor or time.
    expect(await json(await site.call(ackPath(refreshed),{method:originalRequest.method(),cookie:replayCookie,body:originalAcknowledgement}),200)).toEqual(acknowledged);
    await reloadPage(page);
    await expect(page.locator('.approval-checks time')).toHaveAttribute('datetime',acknowledged.acknowledgement.acknowledgedAt);
    await retainedFinding();
    expect(await audit()).toEqual(originalAudit);
    await noAuthority();
    await info.attach('msg-007-acknowledgement-retention',{contentType:'application/json',body:JSON.stringify({
      startedAt,finishedAt,replayAt,acknowledged,findingIdentity:advisory.findingIdentity,
      refreshedFindingIdentity:refreshed.findingIdentity,originalAcknowledgement,
      originalCheckId:originalFinding.id,refreshedCheckId:refreshed.id,
      acknowledgingOperatorId:acknowledgingOperator.operator.id,replayOperatorId,
      staleCheckStatus:409,audit:originalAudit,noAuthorityAsserted:true,
    },null,2)});
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.locator('.approval-checks').screenshot({path:info.outputPath(`acknowledged-advisory-${width}.png`)});
    }
    await page.setViewportSize({width:1440,height:1000});
    await approve(site,cookie,campaign);
    const records = await site.rows("SELECT actor_id,occurred_at FROM lifecycle_audit_entries WHERE action='acknowledge-advisory'");
    expect(records).toHaveLength(2);
    expect(records.every(record => record.actor_id === 'go-live-owner' && record.occurred_at > 0)).toBe(true);
    await blockedHostJourney(site,cookie,page,info,clock.now);
    await linkRulesJourney(site,cookie,page,info,clock.now);
    await smsReviewJourney(site,edge,cookie,page,info,clock.now);
  } finally {await site.runtime.close();await edge.close();}
});

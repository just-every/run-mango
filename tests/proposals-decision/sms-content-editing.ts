import {expect,type Page,type TestInfo} from '@playwright/test';
import {authoringRuntime} from '../campaign-authoring/browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';
import {openPage,reloadPage} from '../support/navigation';

export async function smsContentEditing(page:Page,info:TestInfo) {
  const runtime=await authoringRuntime({suite:'proposal-content',fixtureWorker:'tests/proposals-decision/content-worker.ts',vars:(url:string)=>({MANGO_PUBLIC_BASE_URL:url})});
  try {
    const open=await page.request.post(runtime.url+'/_proposal/open',{headers:{'X-Test-Token':runtime.token}});
    expect(open.status()).toBe(200);
    const token=(await open.json()).token;
    await page.context().addCookies([{name:localSessionCookieName(runtime.url),value:token,url:runtime.url}]);
    const native=async(path:string,body?:unknown,method=body===undefined?'GET':'POST')=>{
      const response=await page.request.fetch(runtime.url+path,{method,headers:{Origin:runtime.url},...(body===undefined?{}:{data:body})});
      expect(response.ok(),await response.text()).toBe(true);
      return response.json();
    };
    const proposal=await native('/api/proposals/generate',{});
    const original=await native(`/api/proposals/${proposal.proposalId}`);
    expect(original.steps.map((step:any)=>step.channel)).toEqual(['email','sms']);
    expect(original.composition.revision).toMatchObject({smsBody:'Synthetic garden news for your phone. https://example.test/synthetic-mango-7',smsSender:'MANGO'});
    const provenance=await runtime.sql(`SELECT * FROM proposal_evidence_items WHERE proposal_id='${proposal.proposalId}' ORDER BY id`);
    const originalProposal=await runtime.sql(`SELECT * FROM proposals WHERE id='${proposal.proposalId}'`);
    expect((await native(`/api/proposals/${proposal.proposalId}/adopt`,{})).campaignId).toBe(proposal.campaignId);
    await page.setViewportSize({width:1440,height:1000});
    await openPage(page,`${runtime.url}/app/campaigns/${proposal.campaignId}/review`);
    await expect(page.getByRole('textbox',{name:'SMS message',exact:true})).toHaveValue('Synthetic garden news for your phone. https://example.test/synthetic-mango-7');
    await expect(page.getByRole('textbox',{name:'SMS sender',exact:true})).toHaveValue('MANGO');
    const chosen={name:'Synthetic Mango Harvest',emailSubject:'Your autumn garden',smsBody:'Reserve the blue planter at https://example.test/synthetic-mango-8',smsSender:'GARDEN'};
    for(const [label,value] of [['Campaign name',chosen.name],['Email subject',chosen.emailSubject],['SMS message',chosen.smsBody],['SMS sender',chosen.smsSender]])await page.getByRole('textbox',{name:label,exact:true}).fill(value);
    // Editing the form does not change the saved preview until its native save completes.
    await expect(page.locator('.message-preview--sms')).toContainText('Synthetic garden news for your phone. https://example.test/synthetic-mango-7');
    await expect(page.locator('.message-preview--sms')).not.toContainText(chosen.smsBody);
    const save=page.waitForResponse(response=>response.url().includes(`/api/campaign-revisions/${proposal.revisionId}`)&&response.request().method()==='PATCH');
    await page.getByRole('button',{name:'Save full draft',exact:true}).click();
    expect((await save).status()).toBe(200);
    await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
    const checkPreview=async()=>{
      await expect(page.locator('.message-preview--sms')).toContainText(chosen.smsBody);
      await expect(page.locator('.message-preview--sms .preview-sender')).toHaveText('Sender GARDEN');
      await expect(page.locator('.message-preview--sms')).not.toContainText('Synthetic garden news for your phone. https://example.test/synthetic-mango-7');
      await expect(page.locator('.message-preview--email h3')).toHaveText(chosen.emailSubject);
      await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('Garden news for you.');
    };
    await checkPreview();
    await reloadPage(page);
    await expect(page.getByRole('textbox',{name:'SMS message',exact:true})).toHaveValue(chosen.smsBody);
    await expect(page.getByRole('textbox',{name:'SMS sender',exact:true})).toHaveValue(chosen.smsSender);
    await checkPreview();
    let storedRevision:unknown;
    for(let read=0;read<2;read++) {
      for(const suffix of ['', '/review']) {
        const detail=await native(`/api/campaigns/${proposal.campaignId}${suffix}`);
        expect(detail.campaign).toMatchObject({state:'draft',activeRevisionId:proposal.revisionId,proposalId:proposal.proposalId});
        expect(detail.revision).toMatchObject({...chosen,state:'draft',approvedAt:null,approvedByOperatorId:null,contentDigest:null,
          emailBody:original.composition.revision.emailBody,emailText:original.composition.revision.emailText,senderName:original.composition.revision.senderName,
          fromEmail:original.composition.revision.fromEmail,replyToEmail:original.composition.revision.replyToEmail,physicalAddress:original.composition.revision.physicalAddress});
        expect(detail.steps.map((step:any)=>step.channel)).toEqual(['email','sms']);
      }
      const revision=await runtime.sql(`SELECT * FROM campaign_revisions WHERE id='${proposal.revisionId}'`);
      expect(revision).toEqual([expect.objectContaining({name:chosen.name,email_subject:chosen.emailSubject,sms_body:chosen.smsBody,sms_sender:chosen.smsSender,state:'draft',approved_at:null,approved_by_operator_id:null,content_digest:null})]);
      if(read===0)storedRevision=revision;else expect(revision).toEqual(storedRevision);
      const detail=await native(`/api/proposals/${proposal.proposalId}`);
      expect(detail.evidenceItems).toEqual(original.evidenceItems);
      expect(await runtime.sql(`SELECT * FROM proposal_evidence_items WHERE proposal_id='${proposal.proposalId}' ORDER BY id`)).toEqual(provenance);
      expect(await runtime.sql(`SELECT * FROM proposals WHERE id='${proposal.proposalId}'`)).toEqual(originalProposal);
      expect(await runtime.sql(`SELECT COUNT(*) AS count FROM campaign_approval_requests WHERE campaign_id='${proposal.campaignId}'`)).toEqual([{count:0}]);
      expect(await runtime.sql(`SELECT COUNT(*) AS count FROM recipient_steps WHERE campaign_id='${proposal.campaignId}'`)).toEqual([{count:0}]);
      expect(await runtime.sql(`SELECT COUNT(*) AS count FROM step_dispatches WHERE revision_id='${proposal.revisionId}'`)).toEqual([{count:0}]);
      expect(await runtime.sql('SELECT * FROM task_content_jobs')).toEqual([]);
    }
    // Assertions run at the desktop width; the same saved screen is captured once at each release width.
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.locator('.message-preview--sms').scrollIntoViewIfNeeded();
      await page.screenshot({path:info.outputPath(`proposal-content-${width}.png`),fullPage:true});
    }
    console.log('PROBE PROP-004 acceptance-1 name and subject: generated dual-channel proposal, native editor save and repeated GET -> independently chosen name and subject persisted');
    console.log('PROBE PROP-004 acceptance-2 SMS body: generate and adopt, edit SMS message and save -> chosen SMS body persists across reload and repeated campaign and review reads');
    console.log('PROBE PROP-004 acceptance-3 SMS sender: native editor save -> GARDEN persists in revision and saved SMS preview; no approval, recipients, dispatch or jobs');
    console.log('PROBE PROP-004 acceptance-4 saved previews: before save original SMS remains; after save and reload chosen SMS body and sender plus saved email subject and body render at 1440; screens captured at 1440 and 390');
  } finally {await runtime.close();}
}

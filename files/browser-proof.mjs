import {createRequire} from 'node:module';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('./run-mango/',import.meta.url));
const require=createRequire(root+'package.json');
const {chromium,expect}=require('@playwright/test');
const {authoringRuntime}=await import(root+'tests/campaign-authoring/browser-runtime.mjs');
const {localCookieName}=await import(root+'src/vendor/base/operator-auth/http.mjs');
const packet=fileURLToPath(new URL('./packet/',import.meta.url));
const receipt={source:'dcc08a05da68b051a956f210d57886bf7b4075fd',kind:'Independent functional browser walkthrough; no visual-quality judgment',startedAt:new Date().toISOString(),command:'cloud_run node ../browser-proof.mjs',checks:[],screens:[],exit:null};
let runtime,browser;
try {
  runtime=await authoringRuntime({suite:'ct-prop004-proof',fixtureWorker:'tests/proposals-decision/content-worker.ts',vars:url=>({MANGO_PUBLIC_BASE_URL:url})});
  browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const open=await page.request.post(runtime.url+'/_proposal/open',{headers:{'X-Test-Token':runtime.token}});
  assert.equal(open.status(),200);
  await context.addCookies([{name:localCookieName('operator_session_local',runtime.url),value:(await open.json()).token,url:runtime.url}]);
  const native=async(path,data,method=data===undefined?'GET':'POST')=>{
    const response=await page.request.fetch(runtime.url+path,{method,headers:{Origin:runtime.url},...(data===undefined?{}:{data})});
    assert.ok(response.ok(),'native request failed: '+response.status());
    return response.json();
  };
  const proposal=await native('/api/proposals/generate',{});
  const original=await native('/api/proposals/'+proposal.proposalId);
  assert.deepEqual(original.steps.map(s=>s.channel),['email','sms']);
  const originalProvenance=await runtime.sql(`SELECT * FROM proposals WHERE id='${proposal.proposalId}'`);
  const originalEvidence=await runtime.sql(`SELECT * FROM proposal_evidence_items WHERE proposal_id='${proposal.proposalId}' ORDER BY id`);
  await native('/api/proposals/'+proposal.proposalId+'/adopt',{});
  await page.goto(runtime.url+'/app/campaigns/'+proposal.campaignId+'/review');
  await page.waitForFunction(()=>document.documentElement.dataset.mangoHydrated==='true');
  const chosen={name:'CT vermilion harvest',emailSubject:'Your seed collection is ready',emailBody:'<h2>Vermilion seed collection</h2><p>Choose the copper watering can.</p><p><a href="https://example.test/ct-first">Open the collection</a></p>',smsBody:'CT harvest: choose your seeds at https://example.test/ct-sms-garden',smsSender:'CTGARDEN',senderName:'CT Synthetic Garden',fromEmail:'ct-garden@example.test',replyToEmail:'ct-reply@example.test',physicalAddress:'17 Synthetic Orchard Road, Example City, CA 90001',destination:'https://example.test/ct-harvest?offer=vermilion'};
  for(const [label,value] of [['Campaign name',chosen.name],['Email subject',chosen.emailSubject],['Sender name',chosen.senderName],['From email',chosen.fromEmail],['Reply-to email',chosen.replyToEmail],['Physical postal address',chosen.physicalAddress],['SMS message',chosen.smsBody],['SMS sender',chosen.smsSender]]) await page.getByRole('textbox',{name:label,exact:true}).fill(value);
  await page.getByRole('button',{name:'HTML mode',exact:true}).click();
  await page.getByRole('textbox',{name:'Email body',exact:true}).fill(chosen.emailBody);
  await page.getByRole('textbox',{name:'Link 1 destination',exact:true}).fill(chosen.destination);
  await expect(page.locator('.message-preview--sms')).toContainText(original.composition.revision.smsBody);
  await expect(page.locator('.message-preview--email h3')).toHaveText(original.composition.revision.emailSubject);
  receipt.checks.push('Unsaved edits leave both saved previews unchanged');
  const responsePromise=page.waitForResponse(r=>r.url().includes('/api/campaign-revisions/'+proposal.revisionId)&&r.request().method()==='PATCH');
  await page.getByRole('button',{name:'Save full draft',exact:true}).click();
  assert.equal((await responsePromise).status(),200);
  await expect(page.getByRole('status').filter({hasText:'Draft saved.'})).toBeVisible();
  await page.reload();
  await page.waitForFunction(()=>document.documentElement.dataset.mangoHydrated==='true');
  for(const [label,value] of [['Campaign name',chosen.name],['Email subject',chosen.emailSubject],['Sender name',chosen.senderName],['From email',chosen.fromEmail],['Reply-to email',chosen.replyToEmail],['Physical postal address',chosen.physicalAddress],['SMS message',chosen.smsBody],['SMS sender',chosen.smsSender],['Link 1 destination',chosen.destination]]) await expect(page.getByRole('textbox',{name:label,exact:true})).toHaveValue(value);
  await expect(page.locator('.message-preview--email h3')).toHaveText(chosen.emailSubject);
  await expect(page.locator('.message-preview--email .preview-sender')).toContainText(chosen.senderName);
  await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('Vermilion seed collection');
  await expect(page.frameLocator('iframe[title="Saved email preview"]').locator('body')).toContainText('Choose the copper watering can.');
  await expect(page.locator('.message-preview--links')).toContainText(chosen.destination);
  await expect(page.locator('.message-preview--sms')).toContainText(chosen.smsBody);
  await expect(page.locator('.message-preview--sms .preview-sender')).toHaveText('Sender '+chosen.smsSender);
  receipt.checks.push('All independent name, subject, email body, sender identities, SMS body and replacement destination choices survive native save and browser reload');
  receipt.checks.push('Saved email and SMS previews show the chosen saved content and identities at 1440');
  for(const suffix of ['', '/review']) {
    const detail=await native('/api/campaigns/'+proposal.campaignId+suffix);
    for(const key of ['name','emailSubject','smsBody','smsSender','senderName','fromEmail','replyToEmail','physicalAddress']) assert.equal(detail.revision[key],chosen[key]);
    assert.ok(detail.revision.emailBody.includes('Vermilion seed collection'));
    assert.ok(detail.revision.emailBody.includes(chosen.destination));
    assert.equal(detail.revision.state,'draft');
    assert.equal(detail.revision.approvedAt,null);
    assert.equal(detail.revision.contentDigest,null);
    assert.deepEqual(detail.links.map(l=>l.destinationUrl),[chosen.destination]);
  }
  const stored=await runtime.sql(`SELECT name,email_subject,email_body,sms_body,sms_sender,sender_name,from_email,reply_to_email,physical_address,state,approved_at,content_digest FROM campaign_revisions WHERE id='${proposal.revisionId}'`);
  assert.equal(stored[0].sms_body,chosen.smsBody);
  assert.equal(stored[0].from_email,chosen.fromEmail);
  assert.ok(stored[0].email_body.includes(chosen.destination));
  assert.deepEqual(await runtime.sql(`SELECT * FROM proposals WHERE id='${proposal.proposalId}'`),originalProvenance);
  assert.deepEqual(await runtime.sql(`SELECT * FROM proposal_evidence_items WHERE proposal_id='${proposal.proposalId}' ORDER BY id`),originalEvidence);
  for(const query of [`SELECT COUNT(*) AS count FROM campaign_approval_requests WHERE campaign_id='${proposal.campaignId}'`,`SELECT COUNT(*) AS count FROM recipient_steps WHERE campaign_id='${proposal.campaignId}'`,`SELECT COUNT(*) AS count FROM step_dispatches WHERE revision_id='${proposal.revisionId}'`]) assert.deepEqual(await runtime.sql(query),[{count:0}]);
  assert.deepEqual(await runtime.sql('SELECT * FROM task_content_jobs'),[]);
  receipt.checks.push('Authenticated campaign and review readback and native D1 match the saved choices; proposal provenance is unchanged; approvals, recipients, dispatches and queued product jobs remain empty');
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.locator('iframe[title="Saved email preview"]').scrollIntoViewIfNeeded();
    await expect(page.frameLocator('iframe[title="Saved email preview"]').getByRole('heading',{name:'Vermilion seed collection',exact:true})).toBeVisible();
    await page.screenshot({path:packet+'browser-proof-'+width+'.png',fullPage:true});
    receipt.screens.push({width,height:1000,path:'browser-proof-'+width+'.png'});
  }
  receipt.checks.push('Capture diagnostic: scroll saved email iframe into the viewport before full-page capture; saved heading is visible at both widths');
  receipt.exit=0;
  console.log('Independent functional browser proof PASS; screenshots 1440 and 390; no delivery authority');
} catch(error) {
  receipt.exit=1;
  receipt.error=String(error).replace(/https?:\/\/\S+/g,'[local URL omitted]');
  console.error(receipt.error);
  process.exitCode=1;
} finally {
  await browser?.close();
  await runtime?.close();
  receipt.finishedAt=new Date().toISOString();
  await writeFile(packet+'browser-receipt.json',JSON.stringify(receipt,null,2)+'\n');
}

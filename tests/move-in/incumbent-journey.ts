import {expectCampaignAxe} from '../newsletter-ui/campaign-axe';
import {installation} from './support';
import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type {providerEdge} from '../go-live/edge';
import type {eventSigner} from '../go-live/sendgrid-events';
import {json,sender,draftCampaign} from '../go-live/harness';
import {archiveRecords,stageArchive} from '../portability/flows';
import {zip} from './archive';
import {postArchive,drive,consentEvidence} from './support';
import {openPage} from '../support/navigation';
import type {AttestationInput} from '../../src/core/features/move-in/incumbent-policy';

/** Synthetic Mailchimp-format rows, public multipart doors, no provider consent. */
export async function incumbentJourney(page:Page,info:TestInfo,edge:Awaited<ReturnType<typeof providerEdge>>,signer:ReturnType<typeof eventSigner>) {
  const site=await installation(edge,signer);
  try {
    const cookie=await site.open(),source='synthetic-mango-90',path='audiences/'+source,answers={brand:'yes',category:'yes',frequency:'yes',jurisdiction:'yes',wording:'yes',notPurchased:'yes'} as const;
    const choice:AttestationInput={nonce:crypto.randomUUID(),sourceKey:path,typedSource:source,exportCreatedAt:'2026-03-06T00:00:00Z',answers};
    const csv='Email Address,OPTIN_TIME,CONFIRM_TIME,LAST_CHANGED,CC,phone,sms_status\n'+[
      'synthetic-mango-91@example.test,2026-03-01 00:00:00,2026-03-02 00:00:00,2026-03-03 00:00:00,AU,,',
      'synthetic-mango-92@example.test,,2026-03-02 00:00:00,,AU,,',
      'synthetic-mango-93@example.test,,,2026-03-03 00:00:00,AU,,',
      'synthetic-mango-94@example.test,,,,AU,,',
      'postmaster@example.test,,2026-03-02 00:00:00,,AU,,',
      'synthetic-mango-95@example.test,,2026-03-02 00:00:00,,US,,',
      'synthetic-mango-96@example.test,,2026-03-02 00:00:00,,AU,+61412345678,subscribed',
    ].join('\n');
    const bytes=zip([{name:path+'/subscribed.csv',data:csv},{name:path+'/unsubscribed.csv',data:'Email Address\nsynthetic-mango-97@example.test'},{name:path+'/cleaned.csv',data:'Email Address\nsynthetic-mango-98@example.test'}]);
    const preview=async(choices:AttestationInput[])=>(await postArchive(site,cookie,'/api/audience/archive-preview',bytes,undefined,consentEvidence,choices));
    const missing=await preview([]);expect(missing.status).toBe(200);expect(missing.body.summary.audience.find((row:any)=>row.status==='subscribed').outcomes.subscribed).toBe(0);
    expect(JSON.stringify(missing.body.summary)).toContain('attestation-missing');
    const missingApplied=await postArchive(site,cookie,'/api/audience/archives',bytes,missing.body.fingerprint,consentEvidence,[]);expect(missingApplied.status,JSON.stringify(missingApplied.body)).toBe(200);
    const missingMoved=await drive(site,cookie,missingApplied.body.archive.id,'continue');expect(await site.rows("SELECT id FROM contacts WHERE email_status='subscribed'")).toEqual([]);
    await drive(site,cookie,missingMoved.archive.id,'undo');
    const unsure=await preview([{...choice,answers:{...answers,wording:'not-sure'}}]);expect(unsure.status).toBe(200);expect(unsure.body.summary.audience.find((row:any)=>row.status==='subscribed').outcomes.subscribed).toBe(0);expect(JSON.stringify(unsure.body.summary)).toContain('attestation-not-sure');
    await page.context().clearCookies();await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page,site.runtime.url+'/app/audience/import');
    await page.getByLabel('Choose CSV files').setInputFiles({name:'synthetic-mango-90.zip',mimeType:'application/zip',buffer:Buffer.from(bytes)});
    await page.getByRole('combobox',{name:'Message category',exact:true}).selectOption(consentEvidence.messageCategory);
    for(const [label,value] of [['Brand or legal sender',consentEvidence.brandOrLegalSender],['Disclosed frequency',consentEvidence.frequencyDisclosure],['Destination jurisdiction','AU'],['Consent version',consentEvidence.consentVersion],['Original consent text',consentEvidence.consentText]])await page.getByRole('textbox',{name:new RegExp('^'+label)}).fill(value);
    await page.getByRole('button',{name:'Preview import'}).click();await expect(page.getByRole('heading',{name:'Mailchimp-held consent'})).toBeVisible();
    for(const radio of await page.getByRole('radio',{name:'I attest',exact:true}).all()){await expect(radio).not.toBeChecked();await radio.check();}
    await page.getByLabel('Type the source name to confirm: '+source,{exact:true}).fill(source);
    await page.getByLabel('Export creation time (UTC, for rows with no recorded time)',{exact:true}).fill('2026-03-06T00:00');
    for(const width of [1440]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);expect((await new AxeBuilder({page}).analyze()).violations.filter(row=>row.impact==='serious'||row.impact==='critical')).toEqual([]);await page.locator('[aria-labelledby="incumbent-title"]').screenshot({path:info.outputPath(`incumbent-attestation-${width}.png`)});}
    // Apply the explicit API attestation as well, so its audit fields can be read back independently.
    const reviewed=await preview([choice]);expect(reviewed.status).toBe(200);
    const summary=reviewed.body.summary.audience.find((row:any)=>row.status==='subscribed');expect(summary.outcomes.subscribed).toBe(5);expect(summary.evidenceKinds['incumbent-held']).toBe(5);expect(summary.reasons).toMatchObject({'reserved-role-mailbox':1,'outside-attested-jurisdiction':1});
    const sends=edge.sends.length;
    const applied=await postArchive(site,cookie,'/api/audience/archives',bytes,reviewed.body.fingerprint,consentEvidence,[choice]);expect(applied.status,JSON.stringify(applied.body)).toBe(200);
    const moved=await drive(site,cookie,applied.body.archive.id,'continue');expect(edge.sends).toHaveLength(sends);
    const rows=await site.rows('SELECT c.email,c.email_status,c.sms_status,e.capture_method,e.confirmed_at,l.evidence_at,l.time_quality,l.attestation_id FROM contacts c LEFT JOIN consent_evidence e ON e.contact_id=c.id LEFT JOIN incumbent_consent_links l ON l.id=e.id ORDER BY c.email');
    for(const [n,time,quality] of [[91,'2026-03-02T00:00:00Z','CONFIRM_TIME'],[92,'2026-03-02T00:00:00Z','CONFIRM_TIME'],[93,'2026-03-03T00:00:00Z','LAST_CHANGED'],[94,'2026-03-06T00:00:00Z','time-unknown']] as const)expect(rows.find(row=>row.email===`synthetic-mango-${n}@example.test`)).toMatchObject({email_status:'subscribed',capture_method:'incumbent-held',confirmed_at:null,evidence_at:Date.parse(time),time_quality:quality});
    expect(rows.find(row=>row.email==='synthetic-mango-96@example.test')?.sms_status).toBe('non-subscribed');expect(rows.find(row=>row.email==='synthetic-mango-97@example.test')?.email_status).toBe('unsubscribed');expect(rows.find(row=>row.email==='synthetic-mango-98@example.test')?.email_status).toBe('suppressed');
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);await site.control('/_golive/sender-evidence');
    const campaign=await draftCampaign(site,cookie,'Synthetic Mango incumbent review',['synthetic-mango-91@example.test'],new Date(Date.now()+3600000));
    const review=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);expect(review.eligibleCount).toBe(1);expect(review.incumbentHeldCount).toBe(1);
    await openPage(page,site.runtime.url+`/app/campaigns/${campaign.campaignId}/review`);
    for(const width of [1440]){await page.setViewportSize({width,height:1000});await expect(page.getByText("Contacts relying on consent from your previous provider:")).toContainText("1");expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);await expectCampaignAxe(page,`incumbent-review-${width}`);await page.screenshot({path:info.outputPath(`incumbent-review-${width}.png`),fullPage:true});}
    const [audit]=await site.rows('SELECT * FROM consent_attestations');expect(audit).toMatchObject({operator_role:'owner',covered_rows:5,revoked_at:null});expect(audit.operator_id).toBeTruthy();expect(audit.created_at).toBeGreaterThan(0);expect(audit.session_ip).toBeTruthy();expect(audit.wording_hash).toBeTruthy();expect(JSON.parse(audit.answers_json)).toEqual(answers);
    const exported=await archiveRecords({call:(path:string,init:any)=>site.call(path,{...init,headers:{Origin:site.runtime.url}})},cookie);expect(JSON.stringify(exported)).toContain(audit.id);expect(JSON.stringify(exported)).toContain(audit.wording_hash);
    const beforeRestore=edge.sends.length;
    const restored=await installation(edge,signer,{token:site.runtime.token,restore:true});
    try {
      const restoredCookie=await restored.open(),transport={cookie:restoredCookie,call:(path:string,init:any)=>restored.call(path,{...init,headers:{Origin:restored.runtime.url}})};
      const id=await stageArchive(transport,exported),closing=exported.at(-1);
      await json(await transport.call(`/api/portability/imports/${id}/finalize`,{method:'POST',cookie:restoredCookie,body:{contentHash:closing.contentHash,archiveHash:closing.archiveHash}}),200);
      expect(await restored.rows('SELECT * FROM consent_attestations')).toEqual([audit]);
      expect(await restored.rows('SELECT * FROM incumbent_consent_links ORDER BY id')).toEqual(await site.rows('SELECT * FROM incumbent_consent_links ORDER BY id'));
      expect(edge.sends).toHaveLength(beforeRestore);
    }finally{await restored.runtime.close();}
    const report=await (await site.call(`/api/audience/archives/${moved.archive.id}/report`,{cookie})).text();expect(report).toContain('incumbent-held');expect(report).toContain('reserved-role-mailbox');
    const [contact]=await site.rows("SELECT id FROM contacts WHERE email='synthetic-mango-91@example.test'");
    let {receipt}=await json(await site.call(`/api/contacts/${contact.id}`,{method:'DELETE',cookie}),202);
    while(receipt.state==='pending'){const response=await site.call(`/api/audience/erasures/${receipt.reference}/resume`,{method:'POST',cookie});expect([200,202]).toContain(response.status);({receipt}=await response.json());}
    expect(receipt.state).toBe('complete');
    expect(await site.count('consent_attestations')).toBe(1);expect(await site.rows(`SELECT * FROM incumbent_consent_links WHERE contact_id='${contact.id}'`)).toEqual([]);
    await json(await site.call(`/api/audience/attestations/${audit.id}/revoke`,{method:'POST',cookie}),200);
    expect(await site.rows("SELECT id FROM contacts WHERE email_status='subscribed'")).toEqual([]);

    expect(edge.unexpected).toEqual([]);
  }finally{await site.runtime.close();}
}

import {expect,type Page,type TestInfo} from '@playwright/test';
import {COMPLAINT_RATE_LIMIT,HARD_BOUNCE_RATE_LIMIT,REPUTATION_WARNING_FRACTION} from '../../src/core/features/lifecycle/reputation-guard';
import {encodeProviderReference} from '../../src/core/shared/provider-reference';
import {event,type eventSigner} from './sendgrid-events';
import {json,signedPost,draftCampaign,type Installation} from './harness';
import {openPage} from '../support/navigation';

export async function complianceJourney(page:Page,info:TestInfo,site:Installation,cookie:string,signer:ReturnType<typeof eventSigner>,revisionId:string) {
  const [message]=await site.rows(`SELECT outbound_request_json FROM recipient_steps WHERE revision_id='${revisionId}' AND outbound_request_json IS NOT NULL LIMIT 1`);
  const oneClick=JSON.parse(message.outbound_request_json).content.headers['List-Unsubscribe'].slice(1,-1);
  expect((await site.call(new URL(oneClick).pathname,{method:'POST',raw:'List-Unsubscribe=One-Click',headers:{'Content-Type':'application/x-www-form-urlencoded'}})).status).toBe(200);
  const measured=await json(await site.call('/api/insights/deliverability',{cookie}),200);
  const evidence=measured.compliance.find((row:any)=>row.domain==='example.test').rows;
  for(const key of ['spf','dkim','dmarc','one-click'])expect(evidence.find((row:any)=>row.key===key).state).toBe('pass');
  const [timing]=await site.rows(`SELECT used_at,updated_at FROM public_action_tokens WHERE used_at IS NOT NULL AND purpose='unsubscribe' LIMIT 1`);
  expect(timing.updated_at).toBeGreaterThan(timing.used_at);
  expect(evidence.find((row:any)=>row.key==='unsubscribe-time').state).toBe('pass');
  expect(evidence.find((row:any)=>row.key==='unsubscribe-time').value).toContain(String(timing.updated_at-timing.used_at));
  const clock=await site.control('/_golive/clock',{hold:true}),at=clock.now;
  // Seed accepted handoffs, then submit every outcome through the signed public
  // webhook. No production rate, signature, normalization or guard is mocked.
  const seeded=await site.runtime.sql(`WITH RECURSIVE samples(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM samples WHERE n<1999)
    INSERT INTO recipient_steps(id,campaign_id,revision_id,step_id,contact_id,contact_identity_key,channel,destination,idempotency_key,
      transport_disposition,provider,provider_message_id,attempt_count,first_attempt_at,send_by_at,created_at,updated_at)
    SELECT 'synthetic-mango-'||(600+n),r.campaign_id,r.revision_id,r.step_id,r.contact_id,'synthetic-mango-'||(600+n),'email',
      'synthetic-mango-'||(600+n)||'@example.test','synthetic-mango-'||(600+n),'accepted','sendgrid','synthetic-mango-'||(600+n),1,${at-1000},${at+86400000},${at},${at}
    FROM samples JOIN (SELECT * FROM recipient_steps WHERE revision_id='${revisionId}' LIMIT 1) r RETURNING id,destination`);
  const post=async(items:unknown[])=>{const raw=Buffer.from(JSON.stringify(items));expect(await signedPost(site,'/webhooks/mail/sendgrid',raw,signer.headers(raw,String(Math.floor(at/1000))))).toBe(204);};
  const fact=(row:any,kind:string)=>event(kind,row.destination,at-1000,row.id,{mango_recipient_step:encodeProviderReference(row.id)});
  for(let i=0;i<seeded.length;i+=1000)await post(seeded.slice(i,i+1000).map(row=>fact(row,'delivered')));
  await post(seeded.slice(0,4).map(row=>fact(row,'spamreport')));
  const read=async()=>json(await site.call('/api/insights/deliverability',{cookie}),200);
  let reporting=await read();
  const rate=(data:any)=>data.senders.find((row:any)=>row.sender==='example.test'&&row.channel==='email');
  expect(rate(reporting).complained/rate(reporting).delivered).toBe(COMPLAINT_RATE_LIMIT*REPUTATION_WARNING_FRACTION);
  const domain=page.locator('[data-compliance-domain="example.test"]'),complaint=domain.locator('[data-requirement=complaints]');
  const section=page.locator('section').filter({has:page.getByRole('heading',{name:'Bulk-sender compliance',exact:true})});
  const show=async(state:string)=>{
    await page.setViewportSize({width:1440,height:1000});await openPage(page,site.runtime.url+'/app/insights');
    await expect(complaint).toHaveAttribute('data-state',state);
    // Browser proof at both widths; the permanent state assertion is desktop.
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);const capture=info.outputPath(`bulk-compliance-${state}-${width}.png`);if(width===1440)await section.screenshot({path:capture});else {await complaint.scrollIntoViewIfNeeded();await page.screenshot({path:capture});}}
    await page.setViewportSize({width:1440,height:1000});
  };
  await show('warn');
  const eligible=await site.rows("SELECT email FROM contacts WHERE email_status='subscribed' LIMIT 1");
  const draft=await draftCampaign(site,cookie,'synthetic-mango-2601',[eligible[0].email],new Date(at+3600000));
  const checks=async()=>json(await site.call(`/api/campaigns/${draft.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:draft.revisionId}}),200);
  const warningChecks=await checks();expect(warningChecks.checks.find((row:any)=>row.kind==='message.sending-reputation').blocking).toBe(false);
  // One late complaint reaches the block. Both surfaces recompute from the same
  // numerators, denominators, reporting window and rate representation.
  await post([fact(seeded[4],'spamreport')]);
  reporting=await read();expect(rate(reporting).complained/rate(reporting).delivered).toBe(COMPLAINT_RATE_LIMIT);
  await show('fail');
  const figures=await domain.locator('[data-reputation-figures]').innerText();
  const blocked=await json(await site.call(`/api/campaigns/${draft.campaignId}/approve`,{method:'POST',cookie,body:{revisionId:draft.revisionId,idempotencyKey:'synthetic-mango-2602'}}),409);
  const finding=blocked.blockers.find((row:any)=>row.kind==='message.sending-reputation');expect(finding.blocking).toBe(true);expect(finding.detail).toContain(figures);
  await openPage(page,`${site.runtime.url}/app/campaigns/${draft.campaignId}`);
  await expect(page.locator('.check-list__item').filter({hasText:figures}).first()).toBeVisible();
  // Hard bounces warn independently of complaints at the same fraction of their
  // limit. Feed signed, late facts; never rewrite the delivered denominator.
  const current=rate(reporting),needed=Math.ceil(current.attempted*HARD_BOUNCE_RATE_LIMIT*REPUTATION_WARNING_FRACTION)-current.hardBounced;
  await post(seeded.slice(10,10+needed).map(row=>({...fact(row,'bounce'),type:'bounce',bounce_classification:'Invalid Address'})));
  await openPage(page,site.runtime.url+'/app/insights');
  await expect(domain.locator('[data-requirement=hard-bounces]')).toHaveAttribute('data-state','warn');
  const updatedFigures=await domain.locator('[data-reputation-figures]').innerText();
  const late=await checks();expect(late.checks.find((row:any)=>row.kind==='message.sending-reputation').detail).toContain(updatedFigures);
  expect(updatedFigures).not.toBe(figures);
  // Replaying an event cannot change either surface's figures.
  await post([fact(seeded[4],'spamreport')]);
  expect((await read()).compliance.find((row:any)=>row.domain==='example.test').figures).toBe(updatedFigures);
  expect(JSON.stringify(reporting.compliance)).not.toContain('@');
}

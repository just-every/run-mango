import {writeFile} from 'node:fs/promises';
import {expect,type FrameLocator,type Page,type TestInfo} from '@playwright/test';
import {availableTransport,draftCampaign,json,type Installation} from './harness';
import type {providerEdge} from './edge';

/** Observe real authority alongside an existing, unapproved campaign. */
export async function signupAuthority(site:Installation) {
  const tables=['campaigns','campaign_revisions','campaign_approval_requests','recipient_steps',
    'flow_draft_revisions','woocommerce_flows','woocommerce_flow_enrollments'];
  return {
    records:await Promise.all(tables.map(table=>site.rows(`SELECT * FROM ${table} ORDER BY 1`))),
    deliveryCommands:(await site.control('/_golive/emissions')).filter((entry:any)=>entry.command.kind==='campaign.dispatch'||entry.command.kind.startsWith('flow.')),
  };
}

/** Both real form carriers share consent and confirmation, never send authority. */
export async function signupConsentJourney(page:Page,site:Installation,edge:Awaited<ReturnType<typeof providerEdge>>,
  cookie:string,embedOrigin:string,info:TestInfo) {
  const description=await json(await site.call('/subscribe/info'),200);
  expect(description.sms).toBeUndefined();
  const emails=Array.from({length:4},(_,index)=>`synthetic-mango-${610+index}${String.fromCharCode(64)}example.test`);
  const clock=await site.control('/_golive/clock');
  const campaign=await draftCampaign(site,cookie,'Signup permission boundary',emails,new Date(clock.now+3600000));
  await json(await site.call('/api/flow-drafts',{method:'POST',cookie,body:{name:'Signup draft boundary',trigger:'Newsletter signup',
    nodes:[{id:'signup',kind:'trigger',label:'Newsletter signup',next:['done']},{id:'done',kind:'exit',label:'Finish',next:[]}]}}),201);
  const authority=await signupAuthority(site);
  expect(authority.records[4]).toHaveLength(1);
  expect(authority.records[2]).toEqual([]);expect(authority.records[3]).toEqual([]);
  expect(authority.records[0]).toEqual([expect.objectContaining({state:'draft',active_revision_id:campaign.revisionId})]);
  const initialMail=edge.sends.length;
  const expiries:Array<{path:string;email:string;expiresAt:number}>=[];
  const receipts:unknown[]=[];
  await page.setViewportSize({width:1440,height:1000});
  await page.context().setExtraHTTPHeaders({'CF-Connecting-IP':'192.0.2.180'});
  const status=async(email:string)=>(await site.rows(`SELECT email_status FROM contacts WHERE email='${email}'`))[0]?.email_status;
  const captureState=async()=>({contacts:await site.count('contacts'),evidence:await site.count('consent_evidence'),
    confirmations:await site.count('consent_confirmations'),mail:edge.sends.length});
  for(const [index,carrier] of ['hosted','embedded'].entries()) {
    const open=()=>page.goto(carrier==='hosted'?site.runtime.url+'/subscribe':embedOrigin);
    const form:Page|FrameLocator=carrier==='hosted'?page:page.frameLocator('iframe');
    await open();
    await expect(form.getByRole('combobox',{name:/Channel/})).toHaveCount(0);
    await expect(form.getByRole('checkbox')).not.toBeChecked();
    await form.getByLabel('Email address').fill(emails[index*2]);
    const before=await captureState();
    await form.getByRole('button',{name:'Request confirmation'}).click();
    expect(await captureState()).toEqual(before);
    expect((await json(await site.call('/subscribe/sms',{method:'POST',body:{}}),503)).error).toBe('sms_unavailable');
    expect(await captureState()).toEqual(before);
    // Browser validation and the public server both require affirmative consent.
    const refusal=await json(await site.call('/subscribe',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.180'},
      body:{email:emails[index*2],consent:false,disclosure:description.disclosure}}),400);
    expect(refusal.error).toBe('invalid_signup');
    expect(await captureState()).toEqual(before);
    expect((await json(await site.call('/subscribe',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.180'},
      body:{email:'synthetic-mango-invalid',consent:true,disclosure:description.disclosure}}),400)).error).toBe('invalid_signup');
    expect(await captureState()).toEqual(before);
    receipts.push({carrier,case:'refused-capture',before,after:await captureState()});
    for(const [offset,outcome] of ['confirm','expire'].entries()) {
      const email=emails[index*2+offset];
      if(offset)await open();
      await availableTransport(site);
      await form.getByLabel('Email address').fill(email);
      await expect(form.getByRole('checkbox')).toHaveAccessibleName(`${description.consentText} (required)`);
      await form.getByRole('checkbox').check();
      const started=(await site.control('/_golive/clock')).now;
      const submitted=page.waitForResponse(response=>response.url()===site.runtime.url+'/subscribe'&&response.request().method()==='POST');
      await form.getByRole('button',{name:'Request confirmation'}).click();
      expect((await submitted).status()).toBe(202);
      await expect(form.getByRole('status')).toContainText('Request received');
      const ended=(await site.control('/_golive/clock')).now;
      const [evidence]=await site.rows(`SELECT c.email_status,e.channel,e.brand_or_legal_sender,e.message_category,
        e.frequency_disclosure,e.destination_jurisdiction,e.capture_source,e.capture_method,e.consent_text,e.consent_version,e.occurred_at,
        e.confirmation_required,f.expires_at,f.confirmed_at FROM contacts c JOIN consent_evidence e ON e.contact_id=c.id
        JOIN consent_confirmations f ON f.consent_evidence_id=e.id WHERE c.email='${email}'`);
      expect(evidence).toMatchObject({email_status:'pending',channel:'email',brand_or_legal_sender:description.sender,
        message_category:'newsletter',frequency_disclosure:description.frequencyDisclosure,destination_jurisdiction:'Not provided',capture_source:site.runtime.url+'/subscribe',
        capture_method:'hosted-signup-form',consent_text:description.consentText,consent_version:'newsletter-signup-v1',
        confirmation_required:1,confirmed_at:null});
      // Capture time comes from D1's second-resolution clock, independently bracketed.
      expect(evidence.occurred_at).toBeGreaterThanOrEqual(started-1000);
      expect(evidence.occurred_at).toBeLessThanOrEqual(ended);
      const messages=edge.sends.filter(send=>send.to===email);
      expect(messages).toHaveLength(1);
      const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(messages[0].body.content.find((part:any)=>part.type==='text/plain').value)![0];
      const path=new URL(site.local(link)).pathname;
      expect(await signupAuthority(site)).toEqual(authority);
      expect((await page.goto(site.runtime.url+path))!.status()).toBe(200);
      await expect(page.getByRole('button',{name:'Confirm subscription',exact:true})).toBeVisible();
      expect(await status(email)).toBe('pending');
      expect((await site.call(path,{method:'HEAD'})).status).toBe(200);
      expect(await status(email)).toBe('pending');
      if(outcome==='confirm') {
        const confirmed=page.waitForResponse(response=>new URL(response.url()).pathname===path&&response.request().method()==='POST');
        await page.getByRole('button',{name:'Confirm subscription',exact:true}).click();
        expect((await confirmed).status()).toBe(200);
        await expect(page.getByRole('heading',{name:'Subscription confirmed',exact:true})).toBeVisible();
        expect(await status(email)).toBe('subscribed');
        const rows=await site.rows(`SELECT * FROM consent_evidence WHERE destination='${email}'`);
        expect(rows).toHaveLength(1);expect(rows[0].confirmed_at).toEqual(expect.any(Number));
        expect((await site.call(path,{method:'POST',body:{confirm:true}})).status).toBe(410);
        expect(await site.rows(`SELECT * FROM consent_evidence WHERE destination='${email}'`)).toEqual(rows);
        expect(await status(email)).toBe('subscribed');
      } else expiries.push({path,email,expiresAt:evidence.expires_at});
      expect(await signupAuthority(site)).toEqual(authority);
      receipts.push({carrier,outcome,pendingEvidence:evidence,finalStatus:await status(email)});
    }
    await open();
    await page.screenshot({path:info.outputPath(`signup-${carrier}-1440.png`),fullPage:true});
    await page.setViewportSize({width:390,height:1000});
    await page.screenshot({path:info.outputPath(`signup-${carrier}-390.png`),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
  }
  const now=(await site.control('/_golive/clock')).now;
  await site.control('/_golive/clock',{advanceMs:Math.max(...expiries.map(item=>item.expiresAt))-now+1000});
  for(const {path,email} of expiries) {
    const before=await site.rows(`SELECT * FROM consent_evidence WHERE destination='${email}'`);
    expect((await page.goto(site.runtime.url+path))!.status()).toBe(404);
    await expect(page.getByRole('heading',{name:'This link is not valid',exact:true})).toBeVisible();
    expect((await site.call(path,{method:'POST',body:{confirm:true}})).status).toBe(404);
    expect(await status(email)).toBe('pending');
    expect(await site.rows(`SELECT * FROM consent_evidence WHERE destination='${email}'`)).toEqual(before);
    receipts.push({case:'expired',email,status:'pending',confirmationRefused:true});
  }
  expect(edge.sends).toHaveLength(initialMail+4);
  expect(edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe'])).toEqual([]);
  const after=await signupAuthority(site);
  expect(after).toEqual(authority);
  receipts.push({case:'delivery-authority',beforeCounts:authority.records.map(rows=>rows.length),afterCounts:after.records.map(rows=>rows.length),deliveryCommands:after.deliveryCommands.length});
  await writeFile(info.outputPath('signup-consent-observations.json'),JSON.stringify(receipts,null,2));
}

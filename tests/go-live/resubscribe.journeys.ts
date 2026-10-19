import {test,expect} from '@playwright/test';
import {kioskInstallation,kioskChallenge} from './kiosk-harness';
import {openPage} from '../support/navigation';
import {
  responseJson,ownerRequest,messagesFor,confirmationLink,confirm,subscribedContact,importContacts,
  contactDetail,growth,expectEmailStatus,screenshots,publicCapture,
} from './resubscribe-support';

test('[CONT-027][CONT-005][REPORT-005] a reader resubscribes through the normal and shared kiosk forms only after confirming by POST',async({page:operator,browser},info)=>{
  const site=await kioskInstallation(),visitor=await browser.newContext(),page=await visitor.newPage();
  try {
    await kioskChallenge(page);
    await operator.context().addCookies([{name:site.cookie.split('=')[0],value:site.cookie.split('=')[1],url:site.runtime.url}]);
    for(const kiosk of [false,true]) {
      const mode=kiosk?'kiosk':'normal',email=`returning-${mode}@example.test`,ip=kiosk?'192.0.2.42':'192.0.2.41';
      const method=kiosk?'kiosk':'hosted-signup-form';
      expect((await site.settings({frequencyDisclosure:'Monthly newsletter',embedOrigins:[],kioskEnabled:kiosk,kioskDeviceLabel:'Market tablet'})).status).toBe(200);
      const description=await responseJson(await site.call('/subscribe/info'));
      const id=await subscribedContact(site,email);
      const unsubscribe=await site.control('/_kiosk/unsubscribe',{contactId:id});
      expect((await page.goto(unsubscribe.url))!.status()).toBe(200);
      await expectEmailStatus(site,email,'subscribed');
      await screenshots(page,info,`resubscribe-${mode}-unsubscribe`);
      await page.getByRole('button',{name:'Unsubscribe',exact:true}).click();
      await expectEmailStatus(site,email,'unsubscribed');
      await screenshots(page,info,`resubscribe-${mode}-unsubscribed`);
      const optedOut=await contactDetail(site,id),beforeGrowth=await growth(site);

      await page.setExtraHTTPHeaders({'CF-Connecting-IP':ip});
      await openPage(page,site.runtime.url+'/subscribe');
      const emailField=page.getByRole('textbox',{name:'Email address'});
      await emailField.click();await emailField.fill(email);
      const nameField=page.getByRole('textbox',{name:'Name',exact:true});
      await nameField.click();await nameField.fill('Returning reader');
      await page.getByRole('checkbox').check();
      await page.getByRole('button',{name:'Complete verification'}).click();
      await screenshots(page,info,`resubscribe-${mode}-request`);
      const posting=page.waitForResponse(response=>new URL(response.url()).pathname==='/subscribe'&&response.request().method()==='POST');
      await page.getByRole('button',{name:'Request confirmation',exact:true}).click();
      const ack=await posting;
      expect(ack.status()).toBe(202);
      expect(await ack.json()).toEqual({status:'confirmation-required'});
      await expect(page.getByRole('status')).toBeVisible();
      await screenshots(page,info,`resubscribe-${mode}-acknowledgment`);

      await expectEmailStatus(site,email,'unsubscribed');
      const pending=await contactDetail(site,id);
      expect(pending.timeline).toContainEqual(expect.objectContaining({kind:'consent-captured',source:`${method} · ${kiosk?'Kiosk: Market tablet':site.runtime.url+'/subscribe'}`}));
      const evidence=pending.consent.find((item:any)=>item.captureMethod===method);
      expect(evidence).toMatchObject({channel:'email',destination:email,confirmationRequired:true,confirmedAt:null,
        consentText:description.consentText,consentVersion:'newsletter-signup-v1',captureIp:ip,
        captureSource:kiosk?'Kiosk: Market tablet':site.runtime.url+'/subscribe'});
      expect(Date.parse(evidence.occurredAt)).toBeGreaterThan(Date.parse(optedOut.contact.emailStatusAt));
      expect(pending.history.map((event:any)=>event.kind)).toEqual(expect.arrayContaining(['resubscribe-request','confirmation-handed-off']));
      expect(pending.history.some((event:any)=>event.kind==='resubscribed')).toBe(false);
      expect((await growth(site)).channels).toEqual(beforeGrowth.channels);
      const sent=await messagesFor(site,email);
      expect(sent).toHaveLength(2); // Original opt-in and the one fresh resubscribe email.
      const link=confirmationLink(site,sent[1]);

      // Mail scanners and repeated page views must not consume consent or clear the opt-out.
      for(let view=0;view<2;view++) {
        const landing=await page.goto(link);
        expect(landing!.status()).toBe(200);
        expect(landing!.headers()['cache-control']).toBe('no-store');
        expect(landing!.headers()['referrer-policy']).toBe('no-referrer');
        await expect(page.getByRole('button',{name:'Confirm subscription',exact:true})).toBeVisible();
      }
      await screenshots(page,info,`resubscribe-${mode}-confirmation`);
      expect(await contactDetail(site,id)).toEqual(pending);
      await expectEmailStatus(site,email,'unsubscribed');
      const confirming=page.waitForResponse(response=>response.url()===link&&response.request().method()==='POST');
      await page.getByRole('button',{name:'Confirm subscription',exact:true}).click();
      expect((await confirming).status()).toBe(200);
      await expect(page.getByRole('heading',{name:'Subscription confirmed',exact:true})).toBeVisible();
      await screenshots(page,info,`resubscribe-${mode}-success`);
      await expectEmailStatus(site,email,'subscribed');
      const confirmed=await contactDetail(site,id),afterGrowth=await growth(site);
      expect(confirmed.history.filter((event:any)=>event.kind==='resubscribed')).toHaveLength(1);
      expect(confirmed.consent.find((item:any)=>item.id===evidence.id)).toMatchObject({confirmationIp:ip,confirmedAt:expect.any(String)});
      expect(afterGrowth.rows).toContainEqual(expect.objectContaining({kind:'resubscribe',channel:'email',method,
        source:evidence.captureSource,consentText:description.consentText,count:1,net:1}));
      const beforeTotal=beforeGrowth.channels.find((row:any)=>row.channel==='email').closing;
      expect(afterGrowth.channels.find((row:any)=>row.channel==='email').closing).toBe(beforeTotal+1);
      expect((await fetch(link)).status).toBe(410);
      expect((await confirm(link)).status).toBe(410);
      expect(await contactDetail(site,id)).toEqual(confirmed);
      expect((await growth(site)).channels).toEqual(afterGrowth.channels);
      expect(await messagesFor(site,email)).toHaveLength(2);

      await openPage(operator,`${site.runtime.url}/app/audience/${id}`);
      const history=operator.locator('section[aria-labelledby="timeline-title"]');
      for(const kind of ['opt-out','resubscribe-request','confirmation-handed-off','resubscribed']) {
        await expect(history.locator(`[data-timeline-kind="${kind}"]`).first()).toBeVisible();
      }
      await screenshots(operator,info,`resubscribe-${mode}-contact-history`);
      if(kiosk) {
        await openPage(page,site.runtime.url+'/subscribe');
        await expect(page.getByRole('textbox',{name:'Email address'})).toHaveValue('');
        await expect(page.getByRole('checkbox')).not.toBeChecked();
        expect(await page.context().cookies()).toEqual([]);
        expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});
      }
    }
    await openPage(operator,site.runtime.url+'/app/insights');
    const report=operator.locator('section[aria-labelledby="list-growth-title"]');
    await expect(report).toContainText('Resubscription');
    await report.getByRole('button',{name:'How these counts work',exact:true}).click();
    for(const width of [1440,390]) {
      await operator.setViewportSize({width,height:1000});
      await report.evaluate(element=>window.scrollTo(0,window.scrollY+element.getBoundingClientRect().top-80));
      await operator.screenshot({path:info.outputPath(`resubscribe-growth-${width}.png`)});
      await report.getByRole('button',{name:'How these counts work',exact:true}).scrollIntoViewIfNeeded();
      await operator.screenshot({path:info.outputPath(`resubscribe-growth-explanation-${width}.png`)});
      expect(await operator.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    await openPage(page,site.runtime.url+'/docs/signup-and-consent');
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      for(const [name,locator] of [
        ['resubscribe',page.getByRole('heading',{name:'Resubscribing',exact:true})],
        ['restrictions',page.getByRole('heading',{name:'What signup will not do',exact:true})],
        ['deferral',page.getByText('When the shared email transport rejects an attempt before handoff',{exact:false})],
      ] as const) {
        await locator.scrollIntoViewIfNeeded();
        await page.screenshot({path:info.outputPath(`resubscribe-docs-${name}-${width}.png`)});
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  } finally {await visitor.close();await site.runtime.close();}
});

test('[CONT-027][CONT-006][CONT-009] daily resubscribe mail is bounded without revealing status and a later opt-out or complaint defeats a pending link',async()=>{
  const site=await kioskInstallation();
  try {
    const capped=['cap-normal@example.test','cap-kiosk@example.test'];
    const later=['later-optout@example.test','later-complaint@example.test'];
    await importContacts(site,[...capped,...later],'csv-unsubscribed');
    await importContacts(site,['hard@example.test','complaint@example.test'],'csv-non-subscribed');
    await importContacts(site,['owner-blocked@example.test'],'csv-cleaned');
    await site.control('/_kiosk/provider-fact',{email:'hard@example.test',kind:'hard'});
    await site.control('/_kiosk/provider-fact',{email:'complaint@example.test',kind:'complaint'});
    await subscribedContact(site,'subscribed@example.test');
    let network=70;
    const capture=async(email:string)=>responseJson(await publicCapture(site,email,`198.51.100.${network++}`),202);
    for(const kiosk of [false,true]) {
      expect((await site.settings({frequencyDisclosure:'Monthly newsletter',embedOrigins:[],kioskEnabled:kiosk,kioskDeviceLabel:'Market tablet'})).status).toBe(200);
      const email=capped[kiosk?1:0],pending=`new-${kiosk?'kiosk':'normal'}@example.test`;
      const generic=await capture(pending);
      expect(await capture(pending)).toEqual(generic);
      expect(await messagesFor(site,pending)).toHaveLength(1); // Ordinary new pending signup still deduplicates.
      for(let request=0;request<4;request++) {
        expect(await capture(email)).toEqual(generic);
        expect(await messagesFor(site,email)).toHaveLength(Math.min(request+1,3));
        await expectEmailStatus(site,email,'unsubscribed');
      }
      const requests=await site.rows(`SELECT e.id,e.confirmed_at,strftime('%Y-%m-%d',e.occurred_at/1000,'unixepoch') day FROM consent_evidence e JOIN contacts c ON c.id=e.contact_id WHERE c.email='${email}' AND e.capture_method IN ('hosted-signup-form','kiosk')`);
      expect(requests).toHaveLength(3);
      expect(new Set(requests.map(row=>row.day)).size).toBe(1);
      expect(requests.every(row=>row.confirmed_at===null)).toBe(true);
      const links=(await messagesFor(site,email)).map(message=>confirmationLink(site,message));
      expect(new Set(links).size).toBe(3); // Fresh requests are not collapsed into the old hourly claim.
      for(const restricted of ['subscribed@example.test','hard@example.test','complaint@example.test','owner-blocked@example.test']) {
        const before=await site.rows(`SELECT c.email_status,a.channel_status,(SELECT count(*) FROM consent_evidence e WHERE e.contact_id=c.id) evidence FROM contacts c JOIN contact_email_addresses a ON a.contact_id=c.id WHERE a.email='${restricted}'`);
        const sent=await messagesFor(site,restricted);
        expect(await capture(restricted)).toEqual(generic);
        expect(await messagesFor(site,restricted)).toEqual(sent);
        expect(await site.rows(`SELECT c.email_status,a.channel_status,(SELECT count(*) FROM consent_evidence e WHERE e.contact_id=c.id) evidence FROM contacts c JOIN contact_email_addresses a ON a.contact_id=c.id WHERE a.email='${restricted}'`)).toEqual(before);
      }
    }
    expect((await site.settings({frequencyDisclosure:'Monthly newsletter',embedOrigins:[],kioskEnabled:false,kioskDeviceLabel:''})).status).toBe(200);
    for(const email of later) {
      expect(await capture(email)).toEqual({status:'confirmation-required'});
      const [message]=await messagesFor(site,email),link=confirmationLink(site,message);
      expect((await fetch(link)).status).toBe(200);
      const [{id}]=await site.rows(`SELECT id FROM contacts WHERE email='${email}'`);
      if(email==='later-optout@example.test') {
        const unsubscribe=await site.control('/_kiosk/unsubscribe',{contactId:id});
        expect((await confirm(unsubscribe.url)).status).toBe(200);
      } else await site.control('/_kiosk/provider-fact',{email,kind:'complaint'});
      const restricted=await contactDetail(site,id);
      expect((await fetch(link)).status).toBe(404);
      expect((await confirm(link)).status).toBe(404);
      await expectEmailStatus(site,email,email===later[0]?'unsubscribed':'suppressed');
      expect(await contactDetail(site,id)).toEqual(restricted);
      expect(restricted.history.some((event:any)=>event.kind==='resubscribed')).toBe(false);
      expect(await messagesFor(site,email)).toHaveLength(1);
    }
    expect((await growth(site)).rows.some((row:any)=>row.kind==='resubscribe')).toBe(false);
  } finally {await site.runtime.close();}
});

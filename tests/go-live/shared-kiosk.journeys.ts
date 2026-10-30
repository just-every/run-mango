import {test,expect} from '@playwright/test';
import {walk0 as section0} from "./shared-kiosk.flow";
import {walk0 as section1} from "./resubscribe.flow";

test("[FORM-009][CONT-005][CONT-027] shared signup clears each visitor and resubscribes only after their affirmative confirmation", async ({page, browser}, info) => {
  test.setTimeout(900000);
  await section0({page, browser} as any, info);
  await section1({page, browser} as any, info);
  await erasedResubscription(page,browser,info);
});


import {kioskInstallation} from './kiosk-harness';
import {ownerRequest,responseJson,subscribedContact,messagesFor,confirmationLink,confirm,contactDetail,publicCapture} from './resubscribe-support';

/** CONT-043: actual signup, erasure and confirmation doors, independently read back. */
async function erasedResubscription(operator,browser,info) {
  const site=await kioskInstallation(false),visitor=await browser.newContext({viewport:{width:1440,height:1000}}),page=await visitor.newPage();
  const address=(id:number)=>`synthetic-mango-${id}${String.fromCharCode(64)}example.test`;
  const erase=async(id:string)=>{
    const first=await fetch(`${site.runtime.url}/api/contacts/${id}`,{method:'DELETE',headers:{Cookie:site.cookie,Origin:site.runtime.url}});
    expect(first.status).toBe(202);let {receipt}=await first.json();
    for(let step=0;receipt.state==='pending'&&step<500;step++) {
      const next=await ownerRequest(site,`/api/audience/erasures/${receipt.reference}/resume`,{});
      expect([200,202]).toContain(next.status);({receipt}=await next.json());
    }
    expect(receipt.state).toBe('complete');
  };
  const proof=async(name:string)=>{
    // Assertions run at the journey width; these two pictures are review proof.
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.screenshot({path:info.outputPath(`erased-${name}-${width}.png`),fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1000});
  };
  try {
    expect((await site.settings({frequencyDisclosure:'Monthly newsletter',embedOrigins:[],kioskEnabled:false,kioskDeviceLabel:''})).status).toBe(200);
    await operator.context().addCookies([{name:site.cookie.split('=')[0],value:site.cookie.split('=')[1],url:site.runtime.url}]);
    for(const [index,restriction] of [[1,'unsubscribe'],[2,'suppression'],[3,'expiry']] as const) {
      const email=address(index),oldId=await subscribedContact(site,email),oldMessages=await messagesFor(site,email);
      const staleLink=confirmationLink(site,oldMessages[0]);
      if(restriction==='suppression')await site.control('/_kiosk/provider-fact',{email,kind:'hard'});
      else {
        const link=await site.control('/_kiosk/unsubscribe',{contactId:oldId});
        expect((await fetch(link.url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'unsubscribe=true'})).status).toBe(200);
      }
      const oldProfile=await contactDetail(site,oldId);
      expect(oldProfile.history.length).toBeGreaterThan(0);expect(oldProfile.consent.length).toBeGreaterThan(0);
      const oldEvidence=oldProfile.consent.map(item=>item.id);
      await erase(oldId);
      expect(await site.rows(`SELECT id FROM contacts WHERE id='${oldId}'`)).toEqual([]);
      const retained=await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id');
      expect(retained.some(row=>row.reason===(restriction==='suppression'?'hard-bounce':'recipient-unsubscribe'))).toBe(true);
      const before=(await messagesFor(site,email)).length;
      expect((await publicCapture(site,email,`192.0.2.${100+index}`)).status).toBe(202);
      const sent=await messagesFor(site,email);
      if(restriction==='suppression') {
        expect(sent).toHaveLength(before);
        expect(await site.rows(`SELECT id FROM contacts WHERE email='${email}'`)).toEqual([]);
        expect(await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id')).toEqual(retained);
        expect((await confirm(staleLink)).status).toBe(404);
        continue;
      }
      expect(sent).toHaveLength(before+1);
      const fresh=(await site.rows(`SELECT id,email_status FROM contacts WHERE email='${email}'`))[0];
      expect(fresh.id).not.toBe(oldId);expect(fresh.email_status).toBe('pending');
      const pending=await contactDetail(site,fresh.id);
      expect(pending.consent).toHaveLength(1);expect(oldEvidence).not.toContain(pending.consent[0].id);
      expect(pending.consent[0]).toMatchObject({confirmedAt:null,captureMethod:'hosted-signup-form'});
      expect(pending.campaignHistory).toEqual([]);expect(pending.importObservations).toEqual([]);
      expect(await site.rows(`SELECT id FROM contact_history WHERE contact_id='${oldId}'`)).toEqual([]);
      const link=confirmationLink(site,sent.at(-1)!);
      if(restriction==='expiry') {
        const [{expires_at}]=await site.rows(`SELECT expires_at FROM audience_reconsent_contacts WHERE contact_id='${fresh.id}'`);
        const {now}=await site.control('/_kiosk/clock',{advanceMs:0});
        // Advance to the persisted deadline, independent of a UTC date boundary.
        await site.control('/_kiosk/clock',{advanceMs:expires_at-now+1});
        expect((await site.call('/subscribe/info')).status).toBe(200);
        for(const table of ['contacts','consent_evidence','consent_confirmations','consent_capture_metadata','consent_handoff_claims','contact_history','contact_email_addresses','audience_reconsent_contacts']) {
          expect(await site.rows(`SELECT * FROM ${table} WHERE ${table==='contacts'?'id':'contact_id'}='${fresh.id}'`)).toEqual([]);
        }
        expect(await site.rows(`SELECT id FROM audience_signup_requests WHERE id='${pending.consent[0].id}'`)).toEqual([]);
        expect(await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id')).toEqual(retained);
        expect((await confirm(link)).status).toBe(404);
        continue;
      }
      expect((await page.goto(link))!.status()).toBe(200);
      await expect(page.getByRole('button',{name:'Confirm subscription',exact:true})).toBeVisible();await proof('confirmation');
      await page.getByRole('button',{name:'Confirm subscription',exact:true}).click();
      await expect(page.getByRole('heading',{name:'Subscription confirmed',exact:true})).toBeVisible();await proof('confirmed');
      const freshProfile=await contactDetail(site,fresh.id);
      expect(freshProfile.contact.emailStatus).toBe('subscribed');expect(freshProfile.consent).toHaveLength(1);
      expect(freshProfile.consent[0].confirmedAt).not.toBeNull();
      expect(freshProfile.campaignHistory).toEqual([]);expect(freshProfile.importObservations).toEqual([]);
      expect(freshProfile.history.every(item=>item.occurredAt>=pending.consent[0].occurredAt)).toBe(true);
      expect(freshProfile.history.some(item=>item.kind==='opt-out'||item.kind==='suppression')).toBe(false);
      expect(await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id')).toEqual(retained);
      const markers=await site.rows(`SELECT s.opt_out_id,s.evidence_id FROM audience_opt_out_supersessions s JOIN surviving_opt_outs o ON o.id=s.opt_out_id WHERE s.evidence_id='${pending.consent[0].id}'`);
      expect(markers).toEqual(retained.filter(row=>row.reason==='recipient-unsubscribe').map(row=>({opt_out_id:row.id,evidence_id:pending.consent[0].id})));
      expect((await confirm(staleLink)).status).toBe(404);expect((await confirm(link)).status).toBe(410);
      expect(await contactDetail(site,fresh.id)).toEqual(freshProfile);
      await operator.goto(`${site.runtime.url}/app/audience/${fresh.id}`);
      await expect(operator.getByRole('heading',{name:email,exact:true}).first()).toBeVisible();
      for(const width of [1440,390]) {await operator.setViewportSize({width,height:1000});await operator.screenshot({path:info.outputPath(`erased-profile-${width}.png`),fullPage:true});}
    }
  } finally {await visitor.close();await site.runtime.close();}
}

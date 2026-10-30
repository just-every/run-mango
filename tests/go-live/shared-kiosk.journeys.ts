import {test} from '@playwright/test';
import {walk0 as section0} from "./shared-kiosk.flow";
import {walk0 as section1} from "./resubscribe.flow";

test("[FORM-009][CONT-005][CONT-027][CONT-043] shared signup clears each visitor and resubscribes only after their affirmative confirmation", async ({page, browser}, info) => {
  test.setTimeout(900000);
  await section0({page, browser} as any, info);
  await section1({page, browser} as any, info);
  await erasedContactJourney({page,browser},info);
});

import {expect} from '@playwright/test';
import {kioskInstallation,kioskChallenge} from './kiosk-harness';
import {openPage} from '../support/navigation';
import {contactDetail,confirmationLink,confirm,messagesFor,publicCapture,responseJson,subscribedContact} from './resubscribe-support';

async function erasedContactJourney({page,browser},info){
  const site=await kioskInstallation(),visitor=await browser.newContext({viewport:{width:1440,height:1000}}),signup=await visitor.newPage();
  const address=(name:string)=>[name,'example.test'].join('@');
  const erase=async(id:string)=>{
    const response=await fetch(`${site.runtime.url}/api/contacts/${id}`,{method:'DELETE',headers:{Cookie:site.cookie,Origin:site.runtime.url}});
    expect(response.status).toBe(202);
    let {receipt}=await response.json();
    while(receipt.state==='pending'){
      const next=await fetch(`${site.runtime.url}/api/audience/erasures/${receipt.reference}/resume`,{method:'POST',headers:{Cookie:site.cookie,Origin:site.runtime.url}});
      expect([200,202]).toContain(next.status);({receipt}=await next.json());
    }
    expect(receipt.state).toBe('complete');
  };
  const optOut=async(id:string)=>{
    const link=await site.control('/_kiosk/unsubscribe',{contactId:id});
    expect((await fetch(link.url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
  };
  const proof=async(screen,kind:string)=>{
    for(const width of [1440,390]){
      await screen.setViewportSize({width,height:1000});
      await screen.screenshot({path:info.outputPath(`erased-resubscription-${kind}-${width}.png`),fullPage:true});
    }
    await screen.setViewportSize({width:1440,height:1000});
  };
  try {
    await kioskChallenge(signup);
    await page.context().addCookies([{name:site.cookie.split('=')[0],value:site.cookie.split('=')[1],url:site.runtime.url}]);
    const email=address('synthetic-mango-432');
    const oldId=await subscribedContact(site,email),oldLink=confirmationLink(site,(await messagesFor(site,email))[0]);
    await optOut(oldId);
    const retained=await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id');
    expect(retained).toHaveLength(1);
    const prior=await contactDetail(site,oldId);expect(prior.history.length).toBeGreaterThan(0);expect(prior.consent).toHaveLength(1);
    await erase(oldId);
    expect(await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id')).toEqual(retained);
    expect(await site.rows(`SELECT id FROM contacts WHERE id='${oldId}'`)).toEqual([]);
    await signup.setExtraHTTPHeaders({'CF-Connecting-IP':'198.51.100.43'});
    await openPage(signup,site.runtime.url+'/subscribe');
    await signup.getByRole('textbox',{name:'Email address'}).fill(email);
    await signup.getByRole('textbox',{name:'Name',exact:true}).fill('Fresh Reader');
    await signup.getByRole('checkbox').check();await signup.getByRole('button',{name:'Complete verification'}).click();
    await proof(signup,'request');
    const posting=signup.waitForResponse(r=>new URL(r.url()).pathname==='/subscribe'&&r.request().method()==='POST');
    await signup.getByRole('button',{name:'Request confirmation',exact:true}).click();expect((await posting).status()).toBe(202);
    const fresh=(await site.rows(`SELECT id,email_status FROM contacts WHERE email='${email}'`))[0];
    expect(fresh.id).not.toBe(oldId);expect(fresh.email_status).toBe('unsubscribed');
    const pending=await contactDetail(site,fresh.id);
    expect(pending.consent).toHaveLength(1);expect(pending.consent[0]).toMatchObject({confirmedAt:null,captureMethod:'hosted-signup-form'});
    expect(pending.campaignHistory).toEqual([]);expect(pending.importObservations).toEqual([]);
    expect((await confirm(oldLink)).status).toBe(404);expect(await contactDetail(site,fresh.id)).toEqual(pending);
    const sent=await messagesFor(site,email);expect(sent).toHaveLength(2);
    const link=confirmationLink(site,sent[1]);
    expect((await signup.goto(link))!.status()).toBe(200);
    await expect(signup.getByRole('button',{name:'Confirm subscription',exact:true})).toBeVisible();
    await proof(signup,'confirmation');expect(await contactDetail(site,fresh.id)).toEqual(pending);
    await signup.getByRole('button',{name:'Confirm subscription',exact:true}).click();
    await expect(signup.getByRole('heading',{name:'Subscription confirmed',exact:true})).toBeVisible();
    const confirmed=await contactDetail(site,fresh.id);
    expect(confirmed.contact.emailStatus).toBe('subscribed');expect(confirmed.consent).toHaveLength(1);
    expect(confirmed.history.every(event=>!prior.history.some(old=>old.id===event.id))).toBe(true);
    expect(confirmed.campaignHistory).toEqual([]);expect(confirmed.importObservations).toEqual([]);
    expect(confirmed.supersededOptOuts).toEqual([{reason:retained[0].reason,occurredAt:retained[0].occurred_at,evidenceId:confirmed.consent[0].id,confirmedAt:expect.any(Number)}]);
    expect(await site.rows(`SELECT opt_out_id,evidence_id,contact_id FROM audience_opt_out_supersessions`)).toEqual([{opt_out_id:retained[0].id,evidence_id:confirmed.consent[0].id,contact_id:fresh.id}]);
    expect(await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id')).toEqual(retained);
    expect((await confirm(link)).status).toBe(410);expect(await contactDetail(site,fresh.id)).toEqual(confirmed);
    await openPage(page,`${site.runtime.url}/app/audience/${fresh.id}`);
    await expect(page.getByText('Fresh Reader',{exact:true}).first()).toBeVisible();
    await proof(page,'empty-history-profile');

    await optOut(fresh.id);await erase(fresh.id);
    const beforeExpiry=await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id');
    expect((await publicCapture(site,email,'198.51.100.44')).status).toBe(202);
    const expires=(await site.rows('SELECT contact_id,expires_at FROM audience_resubscriptions'))[0];expect(expires).toBeTruthy();
    const expiredLink=confirmationLink(site,(await messagesFor(site,email)).at(-1)!);
    // Pin the Worker clock to the saved deadline; no date-boundary assumption.
    const clock=await site.control('/_kiosk/clock',{advanceMs:0});
    await site.control('/_kiosk/clock',{advanceMs:expires.expires_at+1-clock.now});
    expect((await confirm(expiredLink)).status).toBe(404);
    expect(await site.control('/_kiosk/cron')).toEqual({completed:true});
    expect(await site.rows(`SELECT id FROM contacts WHERE id='${expires.contact_id}'`)).toEqual([]);
    for(const table of ['consent_evidence','consent_confirmations','contact_history','consent_capture_metadata','audience_signup_requests','audience_resubscriptions']){
      expect(await site.rows(`SELECT count(*) n FROM ${table}`),table).toEqual([{n:0}]);
    }
    expect(await site.rows('SELECT * FROM surviving_opt_outs ORDER BY id')).toEqual(beforeExpiry);
    await site.control('/_kiosk/clock',{advanceMs:clock.now-expires.expires_at-1});
    expect((await fetch(`${site.runtime.url}/api/contacts/${expires.contact_id}`,{headers:{Cookie:site.cookie}})).status).toBe(404);
  }finally{await visitor.close();await site.runtime.close();}
}

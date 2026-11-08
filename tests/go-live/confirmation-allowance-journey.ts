import {expect, type Browser, type Page, type TestInfo} from '@playwright/test';
import {kioskChallenge, signupCounterWindow} from './kiosk-harness';
import {openPage} from '../support/navigation';
import {
  type ResubscribeSite, responseJson, ownerRequest, importContacts, messagesFor,
  contactDetail, expectEmailStatus, confirmationLink, confirm,
} from './resubscribe-support';

const address=(index:number)=>`synthetic-mango-${index}${String.fromCharCode(64)}${['example','test'].join('.')}`;

async function captureState(site:ResubscribeSite, id:string, email:string) {
  return {
    contact:await site.rows(`SELECT * FROM contacts WHERE id='${id}'`),
    addresses:await site.rows(`SELECT * FROM contact_email_addresses WHERE contact_id='${id}' ORDER BY id`),
    evidence:await site.rows(`SELECT * FROM consent_evidence WHERE contact_id='${id}' ORDER BY id`),
    metadata:await site.rows(`SELECT * FROM consent_capture_metadata WHERE contact_id='${id}' ORDER BY id`),
    confirmations:await site.rows(`SELECT c.* FROM consent_confirmations c JOIN consent_evidence e ON e.id=c.consent_evidence_id WHERE e.contact_id='${id}' ORDER BY c.id`),
    handoffs:await site.rows(`SELECT * FROM consent_handoff_claims WHERE contact_id='${id}' ORDER BY id`),
    requests:await site.rows(`SELECT r.* FROM audience_signup_requests r WHERE r.destination_hash IN
      (SELECT r.destination_hash FROM audience_signup_requests r JOIN consent_evidence e ON e.id=r.id WHERE e.destination='${email}') ORDER BY r.id`),
    history:await site.rows(`SELECT * FROM contact_history WHERE contact_id='${id}' AND kind<>'resubscribe-refused' ORDER BY id`),
  };
}

async function destinationCounter(site:ResubscribeSite, email:string) {
  return site.rows(`SELECT DISTINCT l.key,l.window,l.count FROM oa_limits l JOIN audience_signup_requests r
    ON l.key='signup-email:'||r.destination_hash JOIN consent_evidence e ON e.id=r.id WHERE e.destination='${email}'`);
}

async function refusals(site:ResubscribeSite) {
  const report=await responseJson(await ownerRequest(site,'/api/audience/signup/refusals'));
  const totals={hosted:0,kiosk:0};
  for(const row of report.hours)if(row.reason==='daily-allowance')totals[row.form as keyof typeof totals]+=row.refusals;
  return totals;
}

async function refusalAccounting(site:ResubscribeSite) {
  const report=await responseJson(await ownerRequest(site,'/api/audience/signup/refusals'));
  const counts:Record<string,number>={};
  for(const row of report.hours) {
    const key=`${row.form}:${row.reason}`;
    counts[key]=(counts[key]??0)+row.refusals;
  }
  return {counts,refusedLastHour:report.refusedLastHour};
}

async function responseScreens(page:Page,info:TestInfo,name:string) {
  // Assertions execute at the desktop width; the same response is also recorded on a phone.
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await page.screenshot({path:info.outputPath(`confirmation-allowance-${name}-${width}.png`),fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
}

/** Real imports and public form submissions share the same durable destination budget.
 * Only the existing challenge and mail HTTP edges are synthetic. */
export async function confirmationAllowanceJourney(site:ResubscribeSite,browser:Browser,info:TestInfo) {
  const visitor=await browser.newContext({viewport:{width:1440,height:1000}}),page=await visitor.newPage();
  const receipt:Array<Record<string,unknown>>=[],tokens=new Set<string>(),links=new Set<string>();
  const exhausted:Array<{email:string;counter:Array<Record<string,any>>}>=[];
  try {
    await kioskChallenge(page);
    await page.clock.install();
    await importContacts(site,[address(421),address(422)],'csv-unsubscribed');
    for(const [order,modes] of [[false,[false,true,false,true]],[true,[true,false,true,false]]] as const) {
      const email=address(order?422:421),label=order?'kiosk-first':'hosted-first';
      const contacts=await site.rows(`SELECT id FROM contacts WHERE email='${email}'`);
      expect(contacts).toHaveLength(1);
      const id=contacts[0].id as string;
      await expectEmailStatus(site,email,'unsubscribed');
      expect(await messagesFor(site,email)).toEqual([]);
      expect(await destinationCounter(site,email)).toEqual([]);
      const original=await contactDetail(site,id);
      // Reserve a real database hour for the short burst, including its UTC-day bucket.
      // This does not advance application time or manufacture a next-day reset.
      await signupCounterWindow(site,'signup-challenged-global');
      let acknowledgment:unknown;
      for(const [index,kiosk] of modes.entries()) {
        const frequencyDisclosure=['Monthly newsletter','Weekly newsletter','Fortnightly newsletter','Occasional newsletter'][index];
        expect((await site.settings({frequencyDisclosure,embedOrigins:[],kioskEnabled:kiosk,kioskDeviceLabel:'Market tablet'})).status).toBe(200);
        const description=await responseJson(await site.call('/subscribe/info'));
        expect(description.kioskEnabled).toBe(kiosk);
        const before=await captureState(site,id,email),beforeCounter=await destinationCounter(site,email),beforeRefusals=await refusals(site);
        const beforeAccounting=await refusalAccounting(site);
        const beforeMail=await messagesFor(site,email);
        expect(beforeMail).toHaveLength(Math.min(index,3));
        const ip=`198.51.${(order?110:100)+index}.1`;
        await page.setExtraHTTPHeaders({'CF-Connecting-IP':ip});
        await openPage(page,site.runtime.url+'/subscribe');
        await page.getByRole('textbox',{name:'Email address'}).click();
        await page.getByRole('textbox',{name:'Email address'}).fill(email);
        await page.getByRole('textbox',{name:'Name',exact:true}).click();
        await page.getByRole('textbox',{name:'Name',exact:true}).fill(`Synthetic reader ${index+1}`);
        await page.getByRole('checkbox').check();
        await page.getByRole('button',{name:'Complete verification'}).click();
        // Keep the kiosk's two-second acknowledgment visible for both screenshots.
        await page.clock.pauseAt(await page.evaluate(()=>Date.now()+10000));
        const posting=page.waitForResponse(response=>new URL(response.url()).pathname==='/subscribe'&&response.request().method()==='POST');
        await page.getByRole('button',{name:'Request confirmation',exact:true}).click();
        const response=await posting,body=await response.json(),submitted=response.request().postDataJSON();
        expect(response.status()).toBe(202);
        expect(body).toEqual({status:'confirmation-required'});
        if(index===0)acknowledgment=body;
        expect(body).toEqual(acknowledgment);
        expect(submitted.disclosure).toBe(description.disclosure);
        expect(tokens.has(submitted['cf-turnstile-response'])).toBe(false);
        tokens.add(submitted['cf-turnstile-response']);
        await expect(page.getByRole('status')).toContainText('Request received');
        if(index===0||index===3)await responseScreens(page,info,`${label}-${index===3?'exhausted':'admitted'}`);
        await page.clock.resume();
        await expectEmailStatus(site,email,'unsubscribed');
        const after=await captureState(site,id,email),counter=await destinationCounter(site,email),mail=await messagesFor(site,email);
        expect(mail).toHaveLength(Math.min(index+1,3));
        expect(counter).toHaveLength(1);
        expect(counter[0].count).toBe(Math.min(index+1,3));
        expect(after.requests).toHaveLength(Math.min(index+1,3));
        expect(after.requests.every(row=>row.status==='sent')).toBe(true);
        expect(after.handoffs.map(row=>row.id)).toEqual(after.confirmations.map(row=>row.id));
        expect(after.handoffs).toHaveLength(Math.min(index+1,3));
        for(const row of after.requests)expect(Math.floor(row.created_at/86400000)).toBe(counter[0].window);
        const detail=await contactDetail(site,id);
        if(index<3) {
          expect(after.evidence.length).toBe(before.evidence.length+1);
          expect(after.metadata.length).toBe(before.metadata.length+1);
          expect(after.confirmations.length).toBe(before.confirmations.length+1);
          const evidence=detail.consent.find((row:any)=>!original.consent.some((old:any)=>old.id===row.id)&&row.captureIp===ip);
          expect(evidence).toMatchObject({captureMethod:kiosk?'kiosk':'hosted-signup-form',captureIp:ip,frequencyDisclosure,confirmedAt:null,confirmationRequired:true});
          const link=confirmationLink(site,mail[index]);
          expect(links.has(link)).toBe(false);
          links.add(link);
          expect(await refusals(site)).toEqual(beforeRefusals);
          expect(await refusalAccounting(site)).toEqual(beforeAccounting);
        } else {
          expect(after).toEqual(before);
          expect(counter).toEqual(beforeCounter);
          expect(mail).toEqual(beforeMail);
          const expected={...beforeRefusals};expected[kiosk?'kiosk':'hosted']++;
          expect(await refusals(site)).toEqual(expected);
          const key=`${kiosk?'kiosk':'hosted'}:daily-allowance`;
          expect(await refusalAccounting(site)).toEqual({
            counts:{...beforeAccounting.counts,[key]:(beforeAccounting.counts[key]??0)+1},
            refusedLastHour:beforeAccounting.refusedLastHour+1,
          });
          const refusal=detail.history.filter((row:any)=>row.kind==='resubscribe-refused');
          expect(refusal).toEqual([expect.objectContaining({detail:'Daily confirmation allowance exhausted.'})]);
        }
        expect(detail.history.filter((row:any)=>row.kind==='resubscribe-request')).toHaveLength(Math.min(index+1,3));
        expect(detail.history.filter((row:any)=>row.kind==='confirmation-handed-off')).toHaveLength(Math.min(index+1,3));
        expect(detail.history.some((row:any)=>row.kind==='resubscribed')).toBe(false);
        receipt.push({order:label,request:index+1,carrier:kiosk?'kiosk':'hosted',network:ip,
          status:response.status(),acknowledgment:body,mailBefore:beforeMail.length,mailAfter:mail.length,
          capturesAdded:after.evidence.length-before.evidence.length,handoffs:after.handoffs.length,
          confirmationEvidenceIds:after.confirmations.map(row=>row.consent_evidence_id),
          requestIds:after.requests.map(row=>row.id),outboxBefore:beforeOutbox.length,
          outboxAfter:(await site.control('/_kiosk/messages')).length,
          counter,refusals:await refusalAccounting(site)});
      }
      const detail=await contactDetail(site,id);
      expect(detail.consent.filter((row:any)=>!original.consent.some((old:any)=>old.id===row.id))).toHaveLength(3);
      expect((await captureState(site,id,email)).confirmations.every(row=>row.confirmed_at===null)).toBe(true);
      exhausted.push({email,counter:await destinationCounter(site,email)});
    }
    // Exhaustion is destination-specific: a fresh reader still receives and confirms mail.
    const email=address(423);
    expect(await site.rows(`SELECT id FROM contacts WHERE email='${email}'`)).toEqual([]);
    const description=await responseJson(await site.call('/subscribe/info'));
    const response=await site.call('/subscribe',{email,consent:true,disclosure:description.disclosure,
      'cf-turnstile-response':`kiosk-token-${crypto.randomUUID()}`},{'CF-Connecting-IP':'203.0.113.23'});
    expect(await responseJson(response,202)).toEqual({status:'confirmation-required'});
    const mail=await messagesFor(site,email);
    expect(mail).toHaveLength(1);
    await expectEmailStatus(site,email,'pending');
    expect((await confirm(confirmationLink(site,mail[0]))).status).toBe(200);
    await expectEmailStatus(site,email,'subscribed');
    expect(await messagesFor(site,email)).toEqual(mail);
    const controlCounter=await destinationCounter(site,email);
    expect(controlCounter).toEqual([expect.objectContaining({count:1})]);
    for(const destination of exhausted)expect(await destinationCounter(site,destination.email)).toEqual(destination.counter);
    expect(await refusals(site)).toEqual({hosted:1,kiosk:1});
    await info.attach('confirmation-allowance-reconciliation',{contentType:'application/json',body:JSON.stringify({requests:receipt,freshControl:{mail:mail.length,status:'subscribed',counter:controlCounter}},null,2)});
  } finally {await visitor.close();}
}

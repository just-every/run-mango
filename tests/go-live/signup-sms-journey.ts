import {writeFile} from 'node:fs/promises';
import {expect,type Page,type TestInfo} from '@playwright/test';
import {draftCampaign,installation,json,sender} from './harness';
import {eventSigner} from './sendgrid-events';
import type {providerEdge} from './edge';
import {signupAuthority} from './signup-consent-journey';

type EmbeddingOrigin=(target:()=>string)=>Promise<{url:string;close:()=>Promise<void>}>;

/** Optional SMS uses the production adapter at a synthetic provider boundary. */
export async function signupSmsJourney(page:Page,edge:Awaited<ReturnType<typeof providerEdge>>,info:TestInfo,embeddingOrigin:EmbeddingOrigin) {
  page.setDefaultTimeout(15000);
  const site=await installation(edge,eventSigner(),{sms:true});
  const embed=await embeddingOrigin(()=>site.runtime.url+'/subscribe');
  const observations:unknown[]=[];
  try {
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    const settings=await json(await site.call('/api/audience/signup',{cookie}),200);
    await json(await site.call('/api/audience/signup',{method:'PUT',cookie,body:{frequencyDisclosure:settings.frequencyDisclosure,embedOrigins:[embed.url]}}),200);
    const description=await json(await site.call('/subscribe/info'),200);
    expect(description.sms).toBeTruthy();
    const clock=await site.control('/_golive/clock');
    await draftCampaign(site,cookie,'SMS signup boundary',[`synthetic-mango-620${String.fromCharCode(64)}example.test`],new Date(clock.now+3600000));
    await json(await site.call('/api/flow-drafts',{method:'POST',cookie,body:{name:'SMS signup draft boundary',trigger:'Newsletter signup',
      nodes:[{id:'signup',kind:'trigger',label:'Newsletter signup',next:['done']},{id:'done',kind:'exit',label:'Finish',next:[]}]}}),201);
    const authority=await signupAuthority(site),initialSms=edge.sms.sends.length,initialMail=edge.sends.length;
    const expiries:Array<{path:string;phone:string;expiresAt:number}>=[];
    const state=async(phone:string)=>(await site.rows(`SELECT c.sms_status,c.email_status,p.channel_status FROM contacts c
      JOIN contact_phones p ON p.contact_id=c.id WHERE p.phone_e164='${phone}'`))[0];
    const captureState=async()=>({contacts:await site.count('contacts'),evidence:await site.count('consent_evidence'),
      confirmations:await site.count('consent_confirmations'),service:await site.count('sms_service_messages'),sms:edge.sms.sends.length});
    await page.setViewportSize({width:1440,height:1000});
    await page.context().setExtraHTTPHeaders({'CF-Connecting-IP':'192.0.2.181'});
    for(const [index,carrier] of ['hosted','embedded'].entries()) {
      const form=carrier==='hosted'?page:page.frameLocator('iframe');
      const open=async()=>{
        await page.goto(carrier==='hosted'?site.runtime.url+'/subscribe':embed.url);
        await expect(form.getByRole('button',{name:'Request confirmation'})).toBeEnabled();
        await form.getByRole('combobox',{name:/Channel/}).selectOption('sms');
        await expect(form.getByRole('textbox',{name:'Phone',exact:true})).toBeVisible();
      };
      await open();
      const before=await captureState();
      await expect(form.getByRole('checkbox')).not.toBeChecked();
      await form.getByRole('textbox',{name:'Phone',exact:true}).fill(`+614${index}1111111`);
      await form.getByRole('textbox',{name:'Time zone',exact:true}).fill('Australia/Brisbane');
      await form.getByRole('button',{name:'Request confirmation'}).click();
      expect(await captureState()).toEqual(before);
      const invalid={phone:`+614${index}1111111`,timeZone:'Australia/Brisbane',disclosure:description.sms.disclosure};
      expect((await json(await site.call('/subscribe/sms',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.181'},
        body:{...invalid,consent:false}}),400)).error).toBe('invalid_sms_signup');
      expect((await json(await site.call('/subscribe/sms',{method:'POST',headers:{'CF-Connecting-IP':'192.0.2.181'},
        body:{...invalid,phone:'synthetic-mango-invalid',consent:true}}),400)).error).toBe('invalid_sms_signup');
      expect(await captureState()).toEqual(before);
      observations.push({carrier,case:'refused-capture',before,after:await captureState()});
      for(const [offset,outcome] of ['confirm','expire'].entries()) {
        const phone=`+614${index}${offset}111111`;
        if(offset)await open();
        await form.getByRole('textbox',{name:'Phone',exact:true}).fill(phone);
        await form.getByRole('textbox',{name:'Time zone',exact:true}).fill('Australia/Brisbane');
        await expect(form.getByRole('checkbox')).toHaveAccessibleName(`${description.sms.consentText} (required)`);
        await form.getByRole('checkbox').check();
        const submitted=page.waitForResponse(response=>response.url()===site.runtime.url+'/subscribe/sms'&&response.request().method()==='POST');
        await form.getByRole('button',{name:'Request confirmation'}).click();
        expect((await submitted).status()).toBe(202);
        await expect(form.getByRole('status')).toContainText('Request received');
        const [evidence]=await site.rows(`SELECT e.*,f.expires_at,f.confirmed_at FROM consent_evidence e
          JOIN consent_confirmations f ON f.consent_evidence_id=e.id WHERE e.destination='${phone}'`);
        expect(evidence).toMatchObject({channel:'sms',brand_or_legal_sender:description.sms.brand,
          message_category:'newsletter',frequency_disclosure:description.sms.frequency,sms_program:description.sms.programme,destination_jurisdiction:'AU',capture_source:site.origin+'/subscribe',
          capture_method:'hosted-sms-signup',consent_text:description.sms.consentText,consent_version:'sms-signup-v1',
          confirmation_required:1,confirmed_at:null});
        expect(await state(phone)).toEqual({sms_status:'pending',email_status:'non-subscribed',channel_status:'pending'});
        // Advance only this test installation to Brisbane noon so quiet hours never depend on the real hour.
        const current=(await site.control('/_golive/clock')).now;
        const noon=await site.control('/_golive/clock',{advanceMs:(43200000-((current+36000000)%86400000)+86400000)%86400000});
        edge.sms.setClock(noon.now);
        await site.control('/_golive/cron');
        await expect.poll(async()=>site.rows(`SELECT state,reason,provider_message_id FROM sms_service_messages
          WHERE consent_id='${evidence.id}'`),{timeout:60000,intervals:[250]}).toEqual([expect.objectContaining({state:'accepted',provider_message_id:expect.any(String)})]);
        const [service]=await site.rows(`SELECT provider_message_id,purpose FROM sms_service_messages WHERE consent_id='${evidence.id}'`);
        expect(service.purpose).toBe('consent-confirmation');
        const message=edge.sms.sends.find(send=>send.messageId===service.provider_message_id)!;
        expect(message).toBeTruthy();
        const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(message.body.messages[0].message)![0];
        const path=new URL(site.local(link)).pathname;
        expect(await signupAuthority(site)).toEqual(authority);
        expect((await page.goto(site.runtime.url+path))!.status()).toBe(200);
        expect((await state(phone)).sms_status).toBe('pending');
        if(outcome==='confirm') {
          await page.getByRole('button',{name:'Confirm subscription',exact:true}).click();
          await expect(page.getByRole('heading',{name:'Subscription confirmed',exact:true})).toBeVisible();
          expect(await state(phone)).toEqual({sms_status:'subscribed',email_status:'non-subscribed',channel_status:'subscribed'});
          const confirmed=await site.rows(`SELECT * FROM consent_evidence WHERE destination='${phone}'`);
          expect((await site.call(path,{method:'POST',body:{confirm:true}})).status).toBe(410);
          expect(await site.rows(`SELECT * FROM consent_evidence WHERE destination='${phone}'`)).toEqual(confirmed);
        } else expiries.push({path,phone,expiresAt:evidence.expires_at});
        expect(await signupAuthority(site)).toEqual(authority);
        observations.push({carrier,outcome,channel:'sms',pending:true,finalState:await state(phone),purpose:service.purpose});
      }
      await open();
      await page.screenshot({path:info.outputPath(`signup-sms-${carrier}-1440.png`),fullPage:true});
      await page.setViewportSize({width:390,height:1000});
      await page.screenshot({path:info.outputPath(`signup-sms-${carrier}-390.png`),fullPage:true});
      await page.setViewportSize({width:1440,height:1000});
    }
    const now=(await site.control('/_golive/clock')).now;
    await site.control('/_golive/clock',{advanceMs:Math.max(...expiries.map(item=>item.expiresAt))-now+1000});
    for(const {phone,path} of expiries) {
      const before=await site.rows(`SELECT * FROM consent_evidence WHERE destination='${phone}'`);
      expect((await page.goto(site.runtime.url+path))!.status()).toBe(404);
      expect((await site.call(path,{method:'POST',body:{confirm:true}})).status).toBe(404);
      expect((await state(phone)).sms_status).toBe('pending');
      expect(await site.rows(`SELECT * FROM consent_evidence WHERE destination='${phone}'`)).toEqual(before);
      observations.push({carrier:'expired',channel:'sms',pending:true,confirmationRefused:true});
    }
    expect(edge.sms.sends).toHaveLength(initialSms+4);
    expect(edge.sends).toHaveLength(initialMail);
    const after=await signupAuthority(site);
    expect(after).toEqual(authority);
    observations.push({case:'delivery-authority',beforeCounts:authority.records.map(rows=>rows.length),afterCounts:after.records.map(rows=>rows.length),deliveryCommands:after.deliveryCommands.length});
    await writeFile(info.outputPath('signup-sms-observations.json'),JSON.stringify(observations,null,2));
  } finally {await page.goto('about:blank');await embed.close();await site.runtime.close();}
}

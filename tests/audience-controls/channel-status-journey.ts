import {expect,type Page,type TestInfo} from '@playwright/test';
import {providerEdge} from '../go-live/edge';
import {eventSigner} from '../go-live/sendgrid-events';
import {availableTransport,approve,consent,draftCampaign,installation,json,sender} from '../go-live/harness';
import {smsDisclosure,smsProgramme,smsSender} from '../go-live/sms-bindings';
import {confirmSmsReply} from '../go-live/sms-confirm-reply';
import {openPage} from '../support/navigation';
import {channelPeople,channelStateCommerce} from './channel-state-commerce';

/** All five states come from store intake, imported restrictions and real consent doors. */
export async function channelStatusJourney(page:Page,info:TestInfo){
  const commerce=channelStateCommerce(),edge=await providerEdge(commerce);
  const site=await installation(edge,eventSigner(),{sms:true,commerce:true,providerKey:'synthetic-mango-2'});
  try{
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const initial=await site.control('/_golive/clock');
    const {now}=await site.control('/_golive/clock',{hold:true,
      advanceMs:(43200000-((initial.now+36000000)%86400000)+86400000)%86400000});
    edge.sms.setClock(now,true);
    await commerce.sync(site,cookie,now-60000);
    const contacts=[];
    for(const person of channelPeople){
      const found=await json(await site.call('/api/contacts/search?address='+encodeURIComponent(person.email),{cookie}),200);
      expect(found.contacts).toHaveLength(1);contacts.push({...person,id:found.contacts[0].id});
    }
    const detail=(index:number)=>site.call('/api/contacts/'+contacts[index].id,{cookie}).then(response=>json(response,200));
    const state=async(index:number,emailStatus:string,smsStatus:string)=>{
      const result=await detail(index);
      expect(result.contact).toMatchObject({id:contacts[index].id,emailStatus,smsStatus});
      expect(result.emails).toEqual([expect.objectContaining({email:contacts[index].email,channelStatus:emailStatus})]);
      expect(result.phones).toEqual([expect.objectContaining({phoneE164:contacts[index].phone,channelStatus:smsStatus})]);
      return result;
    };
    for(let index=0;index<contacts.length;index++){
      const result=await state(index,'non-subscribed','non-subscribed');
      expect(result.consent).toEqual([]);
    }
    // Store marketing flags are facts, not consent in Mango. Import only restrictions.
    const restrictions=[['non-subscribed','suppressed'],['non-subscribed','unsubscribed'],['unsubscribed','non-subscribed'],['suppressed','non-subscribed']];
    const csv=['Email Address,Phone Number,Email Marketing Status,SMS Marketing Status',
      ...contacts.slice(1).map((person,index)=>[person.email,person.phone,...restrictions[index]].join(','))].join('\n');
    const preview=await json(await site.call('/api/audience/import-preview',{method:'POST',cookie,
      body:{files:[{name:'synthetic-mango-channel-restrictions.csv',preset:'csv-non-subscribed',csv}]}}),200);
    let imported=await json(await site.call('/api/audience/imports',{method:'POST',cookie,body:{fingerprint:preview.fingerprint}}),200);
    while(['queued','applying'].includes(imported.job.state))imported=await json(await site.call('/api/audience/imports/'+imported.job.id+'/resume',{method:'POST',cookie,body:{}}),200);
    expect(imported.job.state).toBe('completed');
    for(const [index,pair]of restrictions.entries())await state(index+1,pair[0],pair[1]);

    const evidence=async(index:number,channel:string)=>(await detail(index)).consent.filter((item:{channel:string})=>item.channel===channel);
    for(const index of [1,2]){
      const opposite=await evidence(index,'sms');
      await availableTransport(site);
      await json(await site.call('/api/contacts/consent',{method:'POST',cookie,body:{...consent,
        contact:{email:contacts[index].email},occurredAt:new Date(now).toISOString()}}),201);
      await state(index,'pending',restrictions[index-1][1]);
      expect(await evidence(index,'sms')).toEqual(opposite);
      const sent=edge.sends.findLast(send=>send.to===contacts[index].email)!;
      const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(sent.body.content.find((part:{type:string})=>part.type==='text/plain').value)![0];
      if(index===2){
        expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
        await state(index,'subscribed','unsubscribed');
        expect(await evidence(index,'sms')).toEqual(opposite);
      }
      await site.control('/_golive/clock',{advanceMs:60000});
    }
    const policy=smsProgramme(now),disclosure=JSON.parse(smsDisclosure());
    for(const index of [3,4]){
      const opposite=await evidence(index,'email'),sent=edge.sms.sends.length;
      await json(await site.call('/api/contacts/consent',{method:'POST',cookie,body:{...consent,
        channel:'sms',permissionMethod:'in-person',affirmed:true,expressWrittenConsent:true,
        smsProgram:policy.programme,brandOrLegalSender:policy.brand,messageCategory:policy.category,
        frequencyDisclosure:policy.frequency,destinationJurisdiction:policy.jurisdiction,
        consentText:disclosure.text,consentVersion:disclosure.version,captureSource:'Market written SMS permission',
        timeZone:'Australia/Brisbane',locationSource:'operator-entry',locationRecordedAt:new Date(now).toISOString(),
        contact:{email:contacts[index].email,phone:contacts[index].phone},occurredAt:new Date(now).toISOString(),
      }}),201);
      await state(index,restrictions[index-1][0],'pending');
      expect(await evidence(index,'email')).toEqual(opposite);
      await site.control('/_golive/cron');
      await expect.poll(()=>edge.sms.sends.length,{timeout:60000,intervals:[250]}).toBe(sent+1);
      if(index===3){
        await confirmSmsReply(site,edge,sent);
        await state(index,'unsubscribed','subscribed');
        expect(await evidence(index,'email')).toEqual(opposite);
      }
      // Move beyond persisted provider pacing before issuing another service message.
      const clock=await site.control('/_golive/clock',{advanceMs:60000});edge.sms.setClock(clock.now,true);
    }
    const expected=[['non-subscribed','non-subscribed'],['pending','suppressed'],['subscribed','unsubscribed'],['unsubscribed','subscribed'],['suppressed','pending']];
    const snapshot=async()=>Promise.all(contacts.map(async(_,index)=>{
      const result=await state(index,expected[index][0],expected[index][1]);
      return {emailStatus:result.contact.emailStatus,smsStatus:result.contact.smsStatus,
        emailStatusAt:result.contact.emailStatusAt,smsStatusAt:result.contact.smsStatusAt,
        emails:result.emails,phones:result.phones,consent:result.consent,suppressions:result.suppressions};
    }));
    const beforeStore=await snapshot();
    const activity=await site.control('/_golive/clock',{advanceMs:60000});
    await commerce.sync(site,cookie,activity.now);
    await commerce.purchases(site,activity.now);
    expect(await snapshot()).toEqual(beforeStore);
    for(const person of contacts){
      const orders=await site.rows(`SELECT payload FROM source_records WHERE source_type='order' AND contact_id='${person.id}'`);
      expect(orders).toHaveLength(1);expect(JSON.parse(orders[0].payload)).toMatchObject({financialStatus:'PAID',customer:{email:person.email,phone:person.phone}});
      const result=await json(await site.call('/api/contacts/'+person.id,{cookie}),200);
      expect(result.timeline.some((entry:{kind:string})=>entry.kind==='order')).toBe(true);
    }
    console.log('PROBE CONT-002 1: native contact and destination reads after capture, confirmation and restrictive import -> all five states independently represented on email and SMS');
    console.log('PROBE CONT-002 3: consent on restricted opposite channels, customer sync and signed paid-order webhooks -> opposite state and evidence unchanged; commerce facts visible');

    const at=activity.now+3600000;
    const campaign=await draftCampaign(site,cookie,'Channel consent at the market',contacts.map(person=>person.email),new Date(at));
    await json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie,body:{
      smsBody:'Seedlings are ready at the market.',smsSender,
      steps:['email','sms'].map(channel=>({channel,timezone:'Australia/Brisbane',scheduledAt:new Date(at).toISOString(),
        sendByAt:new Date(at+7200000).toISOString(),whyThisTime:'Owner chose this time'})),
    }}),200);
    const checked=await json(await site.call('/api/campaigns/'+campaign.campaignId+'/checks',{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
    expect(checked).toMatchObject({candidateCount:5,eligibleCount:2});
    expect(checked.channelCounts).toEqual([
      {channel:'email',eligibleContactCount:1,recipientStepCount:1,fallbackContactCount:0},
      {channel:'sms',eligibleContactCount:1,recipientStepCount:1,fallbackContactCount:0},
    ]);
    expect([...checked.exclusions].sort((a,b)=>a.reason.localeCompare(b.reason))).toEqual(
      ['email-non-subscribed','email-pending','email-suppressed','email-unsubscribed','sms-non-subscribed','sms-pending','sms-suppressed','sms-unsubscribed'].map(reason=>({reason,count:1})));
    await approve(site,cookie,campaign);
    const recipients=()=>site.rows(`SELECT channel,destination,transport_disposition FROM recipient_steps WHERE campaign_id='${campaign.campaignId}' ORDER BY channel`);
    expect(await recipients()).toEqual([
      {channel:'email',destination:contacts[2].email,transport_disposition:'queued'},
      {channel:'sms',destination:contacts[3].phone,transport_disposition:'queued'},
    ]);
    await site.control('/_golive/clock',{advanceMs:at-activity.now+1});edge.sms.setClock(at+1,true);
    await site.control('/_golive/cron');
    await expect.poll(recipients,{timeout:60000,intervals:[500]}).toEqual([
      {channel:'email',destination:contacts[2].email,transport_disposition:'accepted'},
      {channel:'sms',destination:contacts[3].phone,transport_disposition:'accepted'},
    ]);
    expect(edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']).map(send=>send.to)).toEqual([contacts[2].email]);
    expect(edge.sms.sends.filter(send=>send.body.ignore_unsubscribes===false).map(send=>send.body.messages[0].to)).toEqual([contacts[3].phone.slice(1)]);
    console.log('PROBE CONT-002 2: mixed-channel checks, approval and native Queue dispatch over five state pairs -> only subscribed email and subscribed SMS handed to providers; all eight other channel states excluded');

    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:1000});
      for(const index of [1,2,3,4]){
        await openPage(page,site.runtime.url+'/app/audience/'+contacts[index].id);
        const tiles=page.locator('.contact-status-tile');
        await expect(tiles.nth(0).locator('.status-pill')).toHaveText(expected[index][0].replaceAll('-',' '),{ignoreCase:true});
        await expect(tiles.nth(1).locator('.status-pill')).toHaveText(expected[index][1].replaceAll('-',' '),{ignoreCase:true});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        await page.screenshot({path:info.outputPath(`channel-status-${index}-${width}.png`),fullPage:true});
      }
    }
    expect(edge.unexpected).toEqual([]);
  }finally{try{await site.runtime.close();}finally{await edge.close();}}
}

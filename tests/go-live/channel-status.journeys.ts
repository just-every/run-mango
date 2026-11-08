import {expect,test} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {approve,confirmedContact,consent,dispatch,draftCampaign,installation,json,sender} from './harness';
import {confirmSmsReply} from './sms-confirm-reply';
import {smsDisclosure,smsProgramme,smsSender} from './sms-bindings';

const address=(name:string)=>['synthetic-mango-status-'+name,'example.test'].join('@');
type Pair={email:string;sms:string};

/** Email and SMS permission are separate on every contact: each channel holds its own one of five states,
 * only subscribed channels reach a marketing send, and activity or consent on one channel leaves the other alone. */
test('[CONT-002] each channel holds its own state, only subscribed channels are sent to, and one channel never moves the other', async () => {
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer,{sms:true,providerKey:'synthetic-mango-4'});
  try {
    const owner=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie:owner,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const policy=smsProgramme(),disclosure=JSON.parse(smsDisclosure());
    // Brisbane noon keeps the real SMS quiet window open for the confirmation texts.
    const before=await site.control('/_golive/clock');
    const {now}=await site.control('/_golive/clock',{hold:true,advanceMs:(43200000-((before.now+36000000)%86400000)+86400000)%86400000});
    const smsConsent=(email:string,phone:string)=>({...consent,channel:'sms',permissionMethod:'in-person',affirmed:true,expressWrittenConsent:true,
      smsProgram:policy.programme,brandOrLegalSender:policy.brand,messageCategory:policy.category,frequencyDisclosure:policy.frequency,
      destinationJurisdiction:policy.jurisdiction,consentText:disclosure.text,consentVersion:disclosure.version,captureSource:'Market text signup',
      timeZone:'Australia/Brisbane',locationSource:'operator-entry',locationRecordedAt:new Date(now).toISOString(),
      contact:{email,phone},occurredAt:new Date(now).toISOString()});
    const detail=async(id:string):Promise<Pair>=>{const {contact}=await json(await site.call('/api/contacts/'+id,{cookie:owner}),200);return {email:contact.emailStatus,sms:contact.smsStatus};};
    const idOf=async(email:string)=>(await json(await site.call('/api/contacts/search?address='+encodeURIComponent(email),{cookie:owner}),200)).contacts[0].id as string;
    // The clock is held, so provider pacing opens only when the held clock moves past it.
    const pace=async()=>{
      const due=Number((await site.rows('SELECT max(next_at) AS due FROM provider_pacing'))[0]?.due??0),current=await site.control('/_golive/clock');
      if(due>=current.now)await site.control('/_golive/clock',{advanceMs:Math.ceil(due-current.now+1),hold:true});
    };
    const settle=async(count:number)=>{
      await site.control('/_golive/cron');
      await expect.poll(()=>edge.sms.sends.length,{timeout:60000,intervals:[250]}).toBe(count);
    };

    // c1: email pending (confirmation outstanding) beside SMS subscribed (confirmed by reply).
    const c1=address('one'),phone1='+61411111111';
    const first=await json(await site.call('/api/contacts/consent',{method:'POST',cookie:owner,body:{...consent,contact:{email:c1,displayName:'Reader one',phone:phone1},occurredAt:new Date(now).toISOString()}}),201);
    expect(first.contact).toMatchObject({emailStatus:'pending',smsStatus:'non-subscribed'});
    await json(await site.call('/api/contacts/consent',{method:'POST',cookie:owner,body:smsConsent(c1,phone1)}),201);
    await settle(1);await confirmSmsReply(site,edge,0);
    const id1=first.contact.id as string;
    expect(await detail(id1)).toEqual({email:'pending',sms:'subscribed'});

    // c2: email subscribed through its confirmation link beside SMS pending (confirmation text unanswered).
    const c2=address('two'),phone2='+61422222222';
    await pace();
    await confirmedContact(site,edge,owner,c2,'Reader two');
    const id2=await idOf(c2);
    await pace();
    await json(await site.call('/api/contacts/consent',{method:'POST',cookie:owner,body:smsConsent(c2,phone2)}),201);
    await settle(2);
    expect(await detail(id2)).toEqual({email:'subscribed',sms:'pending'});

    // c3 to c5: an import carries each remaining pairing, with a phone so SMS is a real destination.
    const [c3,c4,c5]=[address('three'),address('four'),address('five')];
    const file=(preset:string,email:string,phone:string,smsStatus:string)=>({name:preset+'.csv',preset,csv:`email,phone,sms_status\n${email},${phone},${smsStatus}`});
    const preview=await json(await site.call('/api/audience/import-preview',{method:'POST',cookie:owner,body:{files:[
      file('csv-non-subscribed',c3,'+61433333331','unsubscribed'),file('csv-unsubscribed',c4,'+61433333332','suppressed'),file('csv-cleaned',c5,'+61433333333','non-subscribed')]}}),200);
    let {job}=await json(await site.call('/api/audience/imports',{method:'POST',cookie:owner,body:{fingerprint:preview.fingerprint}}),200);
    for(let step=0;['queued','applying'].includes(job.state)&&step<10;step++)({job}=await json(await site.call(`/api/audience/imports/${job.id}/resume`,{method:'POST',cookie:owner,body:{}}),200));
    expect(job.state).toBe('completed');
    const ids={c1:id1,c2:id2,c3:await idOf(c3),c4:await idOf(c4),c5:await idOf(c5)};
    const states=async()=>Object.fromEntries(await Promise.all(Object.entries(ids).map(async([key,id])=>[key,await detail(id)]))) as Record<keyof typeof ids,Pair>;
    const expected:Record<keyof typeof ids,Pair>={c1:{email:'pending',sms:'subscribed'},c2:{email:'subscribed',sms:'pending'},
      c3:{email:'non-subscribed',sms:'unsubscribed'},c4:{email:'unsubscribed',sms:'suppressed'},c5:{email:'suppressed',sms:'non-subscribed'}};
    expect(await states()).toEqual(expected);

    // Marketing eligibility: one email step and one SMS step over all five people.
    const everyone=[c1,c2,c3,c4,c5];
    const campaign=await draftCampaign(site,owner,'Channel status letter',everyone,new Date(now+3600000));
    await json(await site.call('/api/campaign-revisions/'+campaign.revisionId,{method:'PATCH',cookie:owner,body:{
      smsBody:'Seedlings are ready at the market.',smsSender,
      steps:['email','sms'].map((channel,index)=>({channel,timezone:'UTC',scheduledAt:new Date(now+(index+1)*3600000).toISOString(),
        sendByAt:new Date(now+(index+3)*3600000).toISOString(),whyThisTime:'Owner chose this time'}))}}),200);
    const checked=await json(await site.call('/api/campaigns/'+campaign.campaignId+'/checks',{method:'POST',cookie:owner,body:{revisionId:campaign.revisionId}}),200);
    expect(checked).toMatchObject({candidateCount:5,eligibleCount:2});
    expect(checked.channelCounts.map((row:any)=>[row.channel,row.eligibleContactCount]).sort()).toEqual([['email',1],['sms',1]]);
    const reasons=Object.fromEntries(checked.exclusions.filter((row:any)=>row.reason!=='dormant').map((row:any)=>[row.reason,row.count]));
    expect(reasons).toEqual({'email-pending':1,'email-non-subscribed':1,'email-unsubscribed':1,'email-suppressed':1,
      'sms-pending':1,'sms-non-subscribed':1,'sms-unsubscribed':1,'sms-suppressed':1});
    await approve(site,owner,campaign);
    const emailsBefore=edge.sends.length,smsBefore=edge.sms.sends.length;
    const queued=await site.rows(`SELECT step_id,channel,destination FROM recipient_steps WHERE campaign_id='${campaign.campaignId}' ORDER BY channel`);
    expect(queued.map(row=>[row.channel,row.destination])).toEqual([['email',c2],['sms','+61411111111']]);
    const stepOf=(channel:string)=>queued.find(row=>row.channel===channel)!.step_id as string;
    await site.control('/_golive/clock',{advanceMs:3600000+60000,hold:true});
    const emailRows=await dispatch(site,campaign.campaignId,new Date(now+3600000),stepOf('email'));
    expect([emailRows.map(row=>row.email),edge.sends.slice(emailsBefore).map(send=>send.to),edge.sms.sends.length-smsBefore]).toEqual([[c2],[c2],0]);
    await pace();
    await site.control('/_golive/clock',{advanceMs:3600000,hold:true});
    const smsRows=await dispatch(site,campaign.campaignId,new Date(now+7200000),stepOf('sms'));
    expect([smsRows.map(row=>row.email),edge.sms.sends.slice(smsBefore).map(send=>send.body.messages[0].to),edge.sends.length-emailsBefore]).toEqual([['+61411111111'],['61411111111'],1]);

    // One channel at a time: each action moves only its own channel on its own contact.
    const current=structuredClone(expected);
    const only=async(who:keyof typeof ids,channel:keyof Pair,value:string)=>{
      current[who][channel]=value;
      expect(await states()).toEqual(current);
    };
    const confirmationLink=(email:string)=>{
      const message=edge.sends.findLast(send=>send.to===email&&send.body.subject==='Confirm your Mango Garden subscription')!;
      return /https:\/\/\S+\/consent\/confirm\/\S+/.exec(message.body.content.find((part:any)=>part.type==='text/plain').value)![0];
    };
    expect((await fetch(site.local(confirmationLink(c1)),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    await only('c1','email','subscribed');
    const stopClock=await site.control('/_golive/clock'),sent=edge.sms.sends[0];
    const stop=edge.sms.signed({type:'inbound',to:sent.body.messages[0].sender,sender:sent.body.messages[0].to,message:'STOP',
      received_at:new Date(stopClock.now).toISOString().slice(0,19).replace('T',' '),original_message_id:sent.messageId,original_custom_ref:sent.body.messages[0].custom_ref},stopClock.now);
    expect((await site.call('/webhooks/sms/mobile-message',{method:'POST',headers:stop.headers,raw:stop.body})).status).toBe(204);
    await only('c1','sms','unsubscribed');
    await confirmSmsReply(site,edge,1);
    await only('c2','sms','subscribed');
    await json(await site.call('/api/contacts/'+id2+'/opt-out',{method:'POST',cookie:owner,body:{channel:'email'}}),200);
    await only('c2','email','unsubscribed');
    const key=await json(await site.call('/api/settings/integrations',{method:'POST',cookie:owner,body:{name:'Store activity',scopes:['contacts:write','events:write']}}),201);
    const api=(path:string,body:unknown)=>site.call('/api/integrations/v1'+path,{method:path==='/contacts'?'PUT':'POST',headers:{Authorization:`Bearer ${key.token}`},body});
    await json(await api('/suppressions',{email:c3,reason:'Store reported a hard bounce',idempotencyKey:'channel-status:three'}),200);
    await only('c3','email','suppressed');
    // Store activity (a purchase, a profile refresh) is a fact about the person, never a consent on either channel.
    for(const [index,id] of Object.values(ids).entries())
      await json(await api('/events',{eventId:'channel-status-order-'+index,metric:'order',contactId:id,occurredAt:new Date(now-60000).toISOString(),valueMinor:2500,currency:'AUD',kind:'conversion'}),200);
    for(const email of everyone)await json(await api('/contacts',{email,segmentName:'Store buyers',subscribe:false}),200);
    expect(await states()).toEqual(current);
    expect(edge.unexpected).toEqual([]);
  } finally {await site.runtime.close();await edge.close();}
});

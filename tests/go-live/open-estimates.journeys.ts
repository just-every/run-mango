import {restoreOpenEstimates} from './open-estimates-restore';
import {expect,test} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {approve,confirmedContact,dispatch,draftCampaign,installation,json,sender} from './harness';

test('[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased',async({page})=>{
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const addresses=['open-a@example.test','open-b@example.test'];
    for(const email of addresses)await confirmedContact(site,edge,cookie,email,'Open estimate test');
    const readSettings=async()=>json(await site.call('/api/insights/open-tracking',{cookie}),200);
    expect(await readSettings()).toMatchObject({enabled:false,estimatedRecipients:0});
    expect((await site.call('/api/insights/open-tracking',{method:'PUT',body:{enabled:true}})).status).toBe(401);
    async function letter(name:string,emails:string[]) {
      const due=new Date(Date.now()+1000),campaign=await draftCampaign(site,cookie,name,emails,due);
      await approve(site,cookie,campaign);await dispatch(site,campaign.campaignId,due);
      return campaign;
    }
    const disabled=await letter('Default privacy',addresses.slice(0,1));
    const sends=()=>edge.sends.filter(send=>send.body.headers?.['List-Unsubscribe']);
    const html=(send:ReturnType<typeof sends>[number])=>String(send.body.content.find((part:any)=>part.type==='text/html').value);
    expect(html(sends()[0])).not.toContain('/o/');
    expect(await site.count('open_tracking_tokens')).toBe(0);
    await page.context().addCookies([{name:'operator_session_local',value:cookie.split('=')[1],url:site.runtime.url}]);
    await page.goto(site.runtime.url+'/app/insights');
    const toggle=page.getByRole('checkbox',{name:'Enable privacy-sensitive open estimates'});
    await expect(toggle).not.toBeChecked();await toggle.check();
    await expect.poll(async()=>(await readSettings()).enabled).toBe(true);
    await page.reload();await expect(toggle).toBeChecked();
    const enabled=await letter('Optional estimates',addresses);
    const enabledSends=addresses.map(email=>sends().slice(1).find(send=>send.to===email)!),pixels=enabledSends.map(send=>/src="([^"]+\/o\/[^\"]+)"/.exec(html(send))![1]);
    expect(pixels).toHaveLength(2);
    // Provider tracking remains off: the only opt-in pixel is Mango's revocable one.
    for(const send of enabledSends)expect(send.body.tracking_settings.open_tracking.enable).toBe(false);
    const result=async()=>json(await site.call(`/api/campaigns/${enabled.campaignId}/results`,{cookie}),200);
    const before=await result();
    const tampered=pixels[0].slice(0,-1)+(pixels[0].endsWith('a')?'b':'a');
    expect((await fetch(site.local(tampered))).status).toBe(404);
    const responses=await Promise.all(Array.from({length:3},()=>fetch(site.local(pixels[0]))));
    for(const response of responses) {expect(response.status).toBe(200);expect(response.headers.get('set-cookie')).toBeNull();expect(response.headers.get('cache-control')).toContain('no-store');}
    const after=await result();
    expect(after.engagement.opens).toMatchObject({enabled:true,estimatedRecipients:1,label:'Privacy-sensitive open estimates'});
    expect({...after,engagement:{...after.engagement,opens:undefined}}).toEqual({...before,engagement:{...before.engagement,opens:undefined}});
    await restoreOpenEstimates(site,cookie,edge,signer);
    await toggle.uncheck();await expect.poll(async()=>(await readSettings()).enabled).toBe(false);
    expect((await fetch(site.local(pixels[1]))).status).toBe(200);
    expect((await result()).engagement.opens.estimatedRecipients).toBe(1);
    await toggle.check();await expect.poll(async()=>(await readSettings()).enabled).toBe(true);
    expect((await fetch(site.local(pixels[1]))).status).toBe(200);
    expect((await result()).engagement.opens.estimatedRecipients).toBe(1);
    await toggle.uncheck();await expect.poll(async()=>(await readSettings()).enabled).toBe(false);
    await letter('Disabled again',addresses.slice(0,1));
    expect(html(sends().at(-1)!)).not.toContain('/o/');
    const contact=String((await site.rows(`SELECT id FROM contacts WHERE email='${addresses[0]}'`))[0].id);
    const deletion=await site.call(`/api/contacts/${contact}`,{method:'DELETE',cookie});
    expect([200,202]).toContain(deletion.status);
    let erased=await deletion.json() as {receipt:{reference:string;state:string}};
    const deadline=Date.now()+60000;
    while(erased.receipt.state==='pending') {
      expect(Date.now()).toBeLessThan(deadline);
      const response=await site.call(`/api/audience/erasures/${erased.receipt.reference}/resume`,{method:'POST',cookie,body:{}});
      expect([200,202]).toContain(response.status);erased=await response.json() as typeof erased;
    }
    expect(erased.receipt.state).toBe('complete');
    expect(await site.count('open_estimate_facts')).toBe(0);
    expect(await site.count('open_tracking_tokens')).toBe(1);
    expect((await fetch(site.local(pixels[0]))).status).toBe(200);
    expect(await site.count('open_estimate_facts')).toBe(0);
    expect((await json(await site.call(`/api/campaigns/${disabled.campaignId}/results`,{cookie}),200)).engagement.opens.estimatedRecipients).toBe(0);
    expect(edge.unexpected).toEqual([]);
  } finally {await page.close();await site.runtime.close();await edge.close();}
});

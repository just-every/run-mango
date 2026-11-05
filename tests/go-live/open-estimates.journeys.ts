import { openPage, reloadPage } from '../support/navigation';
import {restoreOpenEstimates} from './open-estimates-restore';
import {expect,test} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {approve,confirmedContact,dispatch,draftCampaign,installation,json,sender} from './harness';
import {png} from '../support/images';
import {readFile,writeFile} from 'node:fs/promises';

test('[RESULT-002][CONT-013] explicit open estimates are isolated, revocable, replay safe and erased',async({page},info)=>{
  const edge=await providerEdge(),signer=eventSigner(),site=await installation(edge,signer);
  try {
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    await site.control('/_golive/sender-evidence');
    const image=png(4,4,932),form=new FormData();
    form.set('file',new Blob([image],{type:'image/png'}),'synthetic-mango-932.png');
    const {asset}=await json(await site.call('/api/campaign-assets',{method:'POST',cookie,raw:form}),201);
    const addresses=['open-a@example.test','open-b@example.test'];
    const defaultAddress='open-default@example.test',disabledAgainAddress='open-disabled-again@example.test';
    // Each privacy state gets fresh confirmed recipients: Mango's unchanged
    // frequency protection excludes repeat email within the same day.
    for(const email of [defaultAddress,...addresses,disabledAgainAddress])await confirmedContact(site,edge,cookie,email,'Open estimate test');
    const readSettings=async()=>json(await site.call('/api/insights/open-tracking',{cookie}),200);
    expect(await readSettings()).toMatchObject({enabled:false,estimatedRecipients:0});
    expect((await site.call('/api/insights/open-tracking',{method:'PUT',body:{enabled:true}})).status).toBe(401);
    const dispatches:unknown[]=[];
    async function letter(name:string,emails:string[]) {
      const due=new Date(Date.now()+1000),campaign=await draftCampaign(site,cookie,name,emails,due);
      await json(await site.call(`/api/campaign-revisions/${campaign.revisionId}`,{method:'PATCH',cookie,body:{
        emailBody:`<p>The spring beds are in. Come and see us at the market.</p><img src="${asset.url}" alt="Synthetic garden" width="4" height="4" />`,
      }}),200);
      const review=await json(await site.call(`/api/campaigns/${campaign.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:campaign.revisionId}}),200);
      const start=edge.sends.length,approval=await approve(site,cookie,campaign);
      const recipients=await dispatch(site,campaign.campaignId,due);
      const sends=edge.sends.slice(start).filter(send=>send.body.headers?.['List-Unsubscribe']);
      dispatches.push({name,...campaign,review,approval,recipients,sends});
      await writeFile(info.outputPath('open-estimates-dispatches.json'),JSON.stringify(dispatches,null,2));
      expect(recipients.map(row=>({email:row.email,disposition:row.transport_disposition})))
        .toEqual([...emails].sort().map(email=>({email,disposition:'accepted'})));
      expect(sends.map(send=>send.to).sort()).toEqual([...emails].sort());
      return {...campaign,sends};
    }
    const disabled=await letter('Default privacy',[defaultAddress]);
    const html=(send:typeof disabled.sends[number])=>String(send.body.content.find((part:any)=>part.type==='text/html').value);
    const imageSources=(send:typeof disabled.sends[number])=>[...html(send).matchAll(/\bsrc="([^"]+)"/g)].map(match=>match[1]);
    expect(html(disabled.sends[0])).not.toContain('/o/');
    expect(imageSources(disabled.sends[0])).toEqual([asset.url]);
    async function ordinaryImage(campaignId:string) {
      const before=await json(await site.call(`/api/campaigns/${campaignId}/results`,{cookie}),200);
      const tokens=await site.rows('SELECT * FROM open_tracking_tokens ORDER BY token_digest');
      const facts=await site.rows('SELECT * FROM open_estimate_facts ORDER BY recipient_step_id');
      const response=await fetch(site.local(asset.url));
      expect(response.status).toBe(200);expect(response.headers.get('set-cookie')).toBeNull();
      expect(response.headers.get('content-type')).toBe('image/png');
      expect(new Uint8Array(await response.arrayBuffer())).toEqual(image);
      expect(await site.rows('SELECT * FROM open_tracking_tokens ORDER BY token_digest')).toEqual(tokens);
      expect(await site.rows('SELECT * FROM open_estimate_facts ORDER BY recipient_step_id')).toEqual(facts);
      expect(await json(await site.call(`/api/campaigns/${campaignId}/results`,{cookie}),200)).toEqual(before);
    }
    await ordinaryImage(disabled.campaignId);
    expect(await site.count('open_tracking_tokens')).toBe(0);
    await page.context().addCookies([{name:cookie.split('=')[0],value:cookie.split('=')[1],url:site.runtime.url}]);
    await openPage(page, site.runtime.url+'/app/insights');
    const toggle=page.getByRole('checkbox',{name:'Enable privacy-sensitive open estimates'});
    await expect(toggle).not.toBeChecked();await toggle.click();
    await expect.poll(async()=>(await readSettings()).enabled).toBe(true);
    await reloadPage(page);await expect(toggle).toBeChecked();
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await page.screenshot({path:info.outputPath(`open-estimates-enabled-${width}.png`),fullPage:true});
    }
    await page.setViewportSize({width:1440,height:1000});
    const enabled=await letter('Optional estimates',addresses);
    const enabledSends=addresses.map(email=>enabled.sends.find(send=>send.to===email)!);
    const pixels=enabledSends.map(send=>{
      const pixel=/src="([^"]+\/o\/[^\"]+)"/.exec(html(send));
      expect(pixel,`Open pixel in the accepted message to ${send.to}`).not.toBeNull();return pixel![1];
    });
    expect(pixels).toHaveLength(2);
    expect(new Set(pixels).size).toBe(2);
    for(let index=0;index<enabledSends.length;index++)expect(imageSources(enabledSends[index])).toEqual([asset.url,pixels[index]]);
    await ordinaryImage(enabled.campaignId);
    // Provider tracking remains off: the only opt-in pixel is Mango's revocable one.
    for(const send of enabledSends)expect(send.body.tracking_settings.open_tracking.enable).toBe(false);
    const result=async()=>json(await site.call(`/api/campaigns/${enabled.campaignId}/results`,{cookie}),200);
    const before=await result();
    const tampered=pixels[0].slice(0,-1)+(pixels[0].endsWith('a')?'b':'a');
    expect((await fetch(site.local(tampered))).status).toBe(404);
    const rateRows=()=>site.rows("SELECT key,window,count FROM oa_limits WHERE key LIKE 'open:%' ORDER BY key");
    const ratesBefore=await rateRows();
    const minute=async()=>Number((await site.rows("SELECT CAST(strftime('%s','now') AS INTEGER)/60 AS minute"))[0].minute);
    const minuteBefore=await minute();
    const requestMarkers=[201,202,203].map(value=>({
      ip:`192.0.2.${value}`,agent:`synthetic-mango-${value}-${crypto.randomUUID()}`,
      cookie:`synthetic-mango-${value}=${crypto.randomUUID()}`,
    }));
    const responses=await Promise.all(requestMarkers.map(marker=>fetch(site.local(pixels[0]),{headers:{
      'CF-Connecting-IP':marker.ip,'User-Agent':marker.agent,Cookie:marker.cookie,
    }})));
    for(const response of responses) {expect(response.status).toBe(200);expect(response.headers.get('set-cookie')).toBeNull();expect(response.headers.get('cache-control')).toContain('no-store');}
    const after=await result();
    expect(after.engagement.opens).toMatchObject({enabled:true,estimatedRecipients:1,label:'Privacy-sensitive open estimates'});
    expect({...after,engagement:{...after.engagement,opens:undefined}}).toEqual({...before,engagement:{...before.engagement,opens:undefined}});
    const minuteAfter=await minute();
    const newRates=(await rateRows()).filter(row=>!ratesBefore.some(before=>before.key===row.key));
    expect(newRates).toHaveLength(requestMarkers.length);
    for(const row of newRates) {
      expect(row.key).toMatch(/^open:[a-f0-9]{64}$/);expect(row.count).toBe(1);
      expect(row.window).toBeGreaterThanOrEqual(minuteBefore);expect(row.window).toBeLessThanOrEqual(minuteAfter);
    }
    const markers=requestMarkers.flatMap(marker=>[marker.ip,marker.agent,marker.cookie,...marker.cookie.split('=')]);
    // Inspect every persisted table, including audit and abuse accounting, so a
    // request header hidden in a JSON payload cannot pass by schema inspection.
    const tables=await site.rows("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name");
    expect(tables.length).toBeGreaterThan(0);
    for(const {name} of tables) {
      const stored=JSON.stringify(await site.rows(`SELECT * FROM "${String(name).replaceAll('"','""')}"`));
      for(const marker of markers)expect(stored,`Raw request marker persisted in ${name}`).not.toContain(marker);
    }
    const authenticated=JSON.stringify({results:after,settings:await readSettings(),
      insights:await json(await site.call('/api/insights',{cookie}),200)});
    for(const marker of markers)expect(authenticated,'Raw request marker exposed to the operator').not.toContain(marker);
    await writeFile(info.outputPath('open-estimates-privacy.json'),JSON.stringify({
      ordinaryImageUnchanged:true,estimatedRecipients:after.engagement.opens.estimatedRecipients,
      rawMarkersAbsent:true,checkedTables:tables.length,keyedMinuteCounters:newRates.length,
    },null,2));
    const limit=JSON.parse(await readFile('seed.json','utf8')).limits.publicRequestsPerMinutePerIp;
    const rateHeaders={'CF-Connecting-IP':'192.0.2.180'};
    const clock=await site.rows("SELECT CAST(strftime('%s','now') AS INTEGER)*1000 AS now");
    const leftInMinute=60_000-Number(clock[0].now)%60_000;
    // Start the burst with room before the real D1 clock rolls its window.
    if(leftInMinute<15_000)await new Promise(resolve=>setTimeout(resolve,leftInMinute));
    const admitted=await Promise.all(Array.from({length:limit},()=>fetch(site.local(pixels[0]),{headers:rateHeaders})));
    for(const response of admitted)expect(response.status).toBe(200);
    // A different token spends the same IP allowance. Invalid signatures are
    // also rejected by the limiter before token verification or fact writes.
    const limitedResults=[];
    for(const pixel of [pixels[1],tampered]) {
      const limited=await fetch(site.local(pixel),{headers:rateHeaders});
      limitedResults.push({status:limited.status,retryAfter:Number(limited.headers.get('retry-after'))});
    }
    const otherIpStatus=(await fetch(site.local(pixels[0]),{headers:{'CF-Connecting-IP':'192.0.2.181'}})).status;
    const estimatedRecipients=(await result()).engagement.opens.estimatedRecipients;
    await writeFile(info.outputPath('open-pixel-rate-limit.json'),JSON.stringify({admitted:limit,limitedResults,otherIpStatus,estimatedRecipients},null,2));
    for(const limited of limitedResults) {expect(limited.status).toBe(429);expect(limited.retryAfter).toBeGreaterThan(0);}
    expect(otherIpStatus).toBe(200);expect(estimatedRecipients).toBe(1);
    await restoreOpenEstimates(site,cookie,edge,signer);
    await toggle.click();await expect.poll(async()=>(await readSettings()).enabled).toBe(false);await expect(toggle).not.toBeChecked();
    expect((await fetch(site.local(pixels[1]))).status).toBe(200);
    expect((await result()).engagement.opens.estimatedRecipients).toBe(1);
    await toggle.click();await expect.poll(async()=>(await readSettings()).enabled).toBe(true);await expect(toggle).toBeChecked();
    expect((await fetch(site.local(pixels[1]))).status).toBe(200);
    expect((await result()).engagement.opens.estimatedRecipients).toBe(1);
    await toggle.click();await expect.poll(async()=>(await readSettings()).enabled).toBe(false);await expect(toggle).not.toBeChecked();
    const disabledAgain=await letter('Disabled again',[disabledAgainAddress]);
    expect(html(disabledAgain.sends[0])).not.toContain('/o/');
    expect(imageSources(disabledAgain.sends[0])).toEqual([asset.url]);
    await ordinaryImage(disabledAgain.campaignId);
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

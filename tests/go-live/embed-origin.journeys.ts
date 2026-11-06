import {createServer} from 'node:http';
import {writeFile} from 'node:fs/promises';
import {expect, test} from '@playwright/test';
import {providerEdge} from './edge';
import {eventSigner} from './sendgrid-events';
import {availableTransport, installation, json, sender} from './harness';

/** Real embedding documents: no interception or substitution of Mango's frame. */
async function embeddingOrigin(target:()=>string) {
  const server=createServer((_request,response)=>{
    response.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});
    response.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Newsletter embed</title><body style="margin:0"><iframe title="Newsletter" src="${target()}" style="width:100%;height:1100px;border:0"></iframe></body></html>`);
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  if(!address || typeof address==='string')throw new Error('Embedding origin did not start.');
  return {url:`http://127.0.0.1:${address.port}`,close:()=>new Promise<void>((resolve,reject)=>{
    server.closeAllConnections();server.close(error=>error?reject(error):resolve());
  })};
}

test('[FORM-001] configured origins admit signup while unlisted ancestors and removed permission refuse the real frame',async({page},info)=>{
  const edge=await providerEdge(),site=await installation(edge,eventSigner());
  const servers:Awaited<ReturnType<typeof embeddingOrigin>>[]=[];
  const observations:unknown[]=[];
  const refusals:string[]=[];
  let signupPosts=0;
  page.on('console',message=>{
    if(/frame-ancestors/i.test(message.text()))refusals.push(message.text());
  });
  page.on('request',request=>{
    if(request.url()===site.runtime.url+'/subscribe'&&request.method()==='POST')signupPosts++;
  });
  try {
    const cookie=await site.open();
    await json(await site.call('/api/settings/sender',{method:'PUT',cookie,body:sender}),200);
    const settings=await json(await site.call('/api/audience/signup',{cookie}),200);
    const saveOrigins=async(embedOrigins:string[])=>{
      await json(await site.call('/api/audience/signup',{method:'PUT',cookie,body:{frequencyDisclosure:settings.frequencyDisclosure,embedOrigins}}),200);
      expect((await json(await site.call('/api/audience/signup',{cookie}),200)).embedOrigins).toEqual(embedOrigins);
    };
    const allowed=await embeddingOrigin(()=>site.runtime.url+'/subscribe');servers.push(allowed);
    const unlisted=await embeddingOrigin(()=>site.runtime.url+'/subscribe');servers.push(unlisted);
    const outer=await embeddingOrigin(()=>allowed.url);servers.push(outer);
    const snapshot=async()=>({
      contacts:await site.count('contacts'),consent:await site.count('consent_evidence'),
      confirmations:await site.count('consent_confirmations'),requests:await site.count('audience_signup_requests'),
      mail:edge.sends.length,relayMail:edge.relaySends.length,signupPosts,
    });
    async function denied(label:string,width:number,url:string,nested=false,reload=false) {
      const before=await snapshot(),firstRefusal=refusals.length;
      const navigation=page.waitForResponse(response=>response.url()===site.runtime.url+'/subscribe'&&response.request().isNavigationRequest());
      if(reload)await page.reload();else await page.goto(url);
      // The server returns the actual document. Chromium refuses its rendering.
      expect((await navigation).status()).toBe(200);
      await expect.poll(()=>refusals.length).toBeGreaterThan(firstRefusal);
      const frame=nested?page.frameLocator('iframe').frameLocator('iframe'):page.frameLocator('iframe');
      await expect(frame.getByLabel('Email address')).toHaveCount(0);
      await expect(frame.getByRole('button',{name:'Request confirmation'})).toHaveCount(0);
      const after=await snapshot();
      expect(after).toEqual(before);
      const refusal=refusals.slice(firstRefusal).join('\n');
      expect(refusal).toMatch(/blocked|refused/i);
      observations.push({width,case:label,before,after,refusal});
      await page.screenshot({path:info.outputPath(`embed-${label}-${width}.png`),fullPage:true});
    }
    // The point explicitly requires every denied case on desktop and phone.
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      await saveOrigins([allowed.url]);
      await availableTransport(site);
      await page.context().setExtraHTTPHeaders({'CF-Connecting-IP':width===1440?'192.0.2.174':'192.0.2.175'});
      await page.goto(allowed.url);
      const frame=page.frameLocator('iframe');
      const email=`synthetic-mango-${width}${String.fromCharCode(64)}example.test`;
      await frame.getByLabel('Email address').fill(email);
      await frame.getByRole('checkbox').check();
      const submitted=page.waitForResponse(response=>response.url()===site.runtime.url+'/subscribe'&&response.request().method()==='POST');
      await frame.getByRole('button',{name:'Request confirmation'}).click();
      expect((await submitted).status()).toBe(202);
      await expect(frame.getByRole('status')).toContainText('Request received');
      const captured=await site.rows(`SELECT c.email_status,e.channel,e.capture_source,e.capture_method,e.confirmation_required,e.consent_text,
        f.confirmed_at FROM contacts c JOIN consent_evidence e ON e.contact_id=c.id
        JOIN consent_confirmations f ON f.consent_evidence_id=e.id WHERE c.email='${email}'`);
      expect(captured).toHaveLength(1);
      expect(captured[0]).toMatchObject({email_status:'pending',channel:'email',capture_source:site.runtime.url+'/subscribe',
        capture_method:'hosted-signup-form',confirmation_required:1,consent_text:settings.consentText,confirmed_at:null});
      expect(edge.sends.filter(send=>send.to===email)).toHaveLength(1);
      const message=edge.sends.find(send=>send.to===email)!;
      const confirmation=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(message.body.content.find((part:any)=>part.type==='text/plain').value);
      expect(confirmation).not.toBeNull();
      expect(new URL(confirmation![0]).origin).toBe(site.origin);
      observations.push({width,case:'allowed',captured,counts:await snapshot()});
      await page.screenshot({path:info.outputPath(`embed-allowed-${width}.png`),fullPage:true});
      await denied('unlisted',width,unlisted.url);
      await denied('outer-ancestor',width,outer.url,true);
      // First reload the known working frame with permission still present.
      await page.goto(allowed.url);
      await expect(frame.getByRole('button',{name:'Request confirmation'})).toBeEnabled();
      await saveOrigins([]);
      await denied('removed-origin',width,allowed.url,false,true);
    }
    expect(edge.unexpected).toEqual([]);
  } finally {
    await writeFile(info.outputPath('embed-origin-observations.json'),JSON.stringify(observations,null,2));
    await page.close();
    for(const server of servers.reverse())await server.close();
    await site.runtime.close();await edge.close();
  }
});

import {loadSignupDescription} from '../../src/core/features/audience/signup-routes';
// Isolated native Worker for FORM-009. Only the paid mail and challenge HTTP
// edges are doubled; product routing, sessions, D1, consent and SSR are real.
import {createFixturePlatform} from '../support/local-platform';
import {createApp,createAppServices} from '../../src/core/app/app';
import {dispatchDocuments} from '../../src/core/app/document-dispatch';
import {testIdentity} from '../support/test-identity';
import {createResendAdapter} from '../../src/core/platform/adapters/resend';
import type {LocalAppBindings} from '../support/fixture-app';

type Bindings=LocalAppBindings&{KIOSK_TEST_CHALLENGE?:string};
const transport=globalThis.fetch, usedTokens=new Set<string>();
let challengeConnected=true,clockOffset=0;
const realNow=Date.now;Date.now=()=>realNow()+clockOffset;
const messages:Array<{to:string;text:string}>=[];
globalThis.fetch=async(input,init)=>{
  const request=new Request(input,init),url=new URL(request.url);
  if(url.hostname==='challenges.cloudflare.com') {
    if(url.pathname!=='/turnstile/v0/siteverify'||request.method!=='POST')throw new Error('Unexpected challenge operation.');
    const form=new URLSearchParams(await request.text()),token=form.get('response')??'';
    const valid=form.get('secret')==='kiosk-test-secret'&&Boolean(form.get('remoteip'))&&/^kiosk-token-[\w-]+$/.test(token)&&!usedTokens.has(token);
    if(valid)usedTokens.add(token);
    return Response.json({success:valid,challenge_ts:new Date(realNow()).toISOString(),action:'newsletter-signup',hostname:'127.0.0.1'});
  }
  if(url.hostname==='api.resend.com') {
    if(url.pathname!=='/emails'||request.method!=='POST'||request.headers.get('Authorization')!=='Bearer kiosk-test-mail-key')throw new Error('Unexpected mail operation.');
    const body=await request.json() as {to:string[];text:string};
    if(body.to.length!==1||!body.to[0].endsWith('@example.test')||!body.text.includes('/consent/confirm/'))throw new Error('Unexpected confirmation envelope.');
    messages.push({to:body.to[0],text:body.text});
    return Response.json({id:crypto.randomUUID()});
  }
  if(url.hostname==='127.0.0.1'||url.hostname==='localhost')return transport(request);
  throw new Error('Unexpected kiosk fixture network request.');
};
export default {
  async fetch(request,bindings,context) {
    const platform=createFixturePlatform(bindings,bindings.LOCAL_BOOTSTRAP_TOKEN);
    platform.config.publicBaseUrl=new URL(new URL(request.url).origin);
    if(bindings.KIOSK_TEST_CHALLENGE==='1'&&challengeConnected)platform.config.signupTurnstile={siteKey:'kiosk-test-site',secretKey:'kiosk-test-secret'};
    platform.mailer=platform.confirmationMailer=createResendAdapter({apiKey:'kiosk-test-mail-key',webhookId:'kiosk-test-webhook',webhookSecret:'kiosk-test-webhook-secret'});
    const path=new URL(request.url).pathname;
    if(path.startsWith('/_kiosk/')) {
      if(request.headers.get('X-Test-Token')!==bindings.LOCAL_BOOTSTRAP_TOKEN)return new Response('Forbidden',{status:403});
      if(path==='/_kiosk/open') {
        const {id='kiosk-owner'}=await request.json() as {id?:string};
        await testIdentity(platform).importLocalDemoOperator({id,email:`${id}@example.test`,displayName:id},new Date());
        return Response.json(await testIdentity(platform).createTestSession(id));
      }
      if(path==='/_kiosk/captures') {
        const {entries}=await request.json() as {entries:Array<{email:string;ip:string;website?:string;token?:string}>};
        if(!Array.isArray(entries)||entries.length>10)return new Response('Bounded public-route batch required',{status:400});
        const description=await loadSignupDescription(platform),app=createApp(bindings,platform,undefined,true),statuses:number[]=[];
        // Two public route invocations at a time, with real D1, verification,
        // consent and delivery. Only the HTTP/provider boundary is a fixture.
        for(let index=0;index<entries.length;index+=2){
          statuses.push(...await Promise.all(entries.slice(index,index+2).map(async entry=>{
            const response=await app.fetch(new Request(new URL('/subscribe',request.url),{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':entry.ip},body:JSON.stringify({email:entry.email,consent:true,disclosure:description.disclosure,...(entry.website?{website:entry.website}:{}),...(entry.token?{'cf-turnstile-response':entry.token}:{})})}),bindings,context);
            return response.status;
          })));
        }
        return Response.json({statuses});
      }
      if(path==='/_kiosk/window') {
        const body=await request.json() as {kind:'minute'|'hour'};
        if(!['minute','hour'].includes(body.kind))return new Response('Invalid clock window',{status:400});
        await bindings.DB.prepare(body.kind==='minute'?"UPDATE oa_limits SET window=window-1 WHERE key IN ('signup-global-minute','signup-challenged-minute')":"UPDATE oa_limits SET window=window-1 WHERE key LIKE 'signup%' AND key NOT LIKE 'signup-challenge:%' AND key NOT LIKE 'signup-refusal-alert:%'").run();
        await bindings.DB.prepare(`UPDATE signup_allowance_levels SET effective_at=effective_at-? WHERE effective_at>CAST(strftime('%s','now') AS INTEGER)*1000`).bind(body.kind==='minute'?60000:3600000).run();
        return Response.json({advanced:true});
      }
      if(path==='/_kiosk/clock') {clockOffset+=(await request.json() as {advanceMs:number}).advanceMs;return Response.json({now:Date.now()});}
      if(path==='/_kiosk/challenge') {challengeConnected=(await request.json() as {connected:boolean}).connected;return Response.json({connected:challengeConnected});}
      if(path==='/_kiosk/messages')return Response.json(messages);
      // Prepare a real product link without sending a marketing campaign.
      if(path==='/_kiosk/unsubscribe') {
        const {contactId}=await request.json() as {contactId:string};
        const issued=await createAppServices(platform).audienceService.issueUnsubscribeToken(contactId,'email');
        return Response.json({url:new URL(`/unsubscribe/${issued.token}`,platform.config.publicBaseUrl).href});
      }
      // Provider facts enter through the same service the signed webhook uses;
      // this never writes a contact status or consent record directly.
      if(path==='/_kiosk/provider-fact') {
        const {email,kind}=await request.json() as {email:string;kind:'hard'|'complaint'};
        if(!email.endsWith('@example.test')||!['hard','complaint'].includes(kind))return new Response('Invalid fixture fact',{status:400});
        await createAppServices(platform).audienceService.recordBounce({destination:email,kind,occurredAt:new Date(),providerEventId:`kiosk:${crypto.randomUUID()}`});
        return Response.json({recorded:true});
      }
      if(path==='/_kiosk/rows') {
        const {sql}=await request.json() as {sql:string};
        if(!/^SELECT\s/i.test(sql))return new Response('Read only',{status:400});
        return Response.json((await bindings.DB.prepare(sql).all()).results);
      }
      return new Response('Not found',{status:404});
    }
    return dispatchDocuments(request,bindings,context,platform,createApp(bindings,platform,undefined,true));
  },
} satisfies ExportedHandler<Bindings>;

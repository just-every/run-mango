import {test,expect} from '@playwright/test';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {native} from '../approval-binding/native';
import {createApp} from '../../src/core/app/app';
import {createSendgridAdapter} from '../../src/core/platform/adapters/sendgrid';

test('SEND-006 CONT-006 signed existing-hook forwarding preserves bytes, rejects changed trust and deduplicates unmatched safety events',async()=>{
  const h=await native();try{
    const pair=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),other=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
    const key=pair.publicKey.export({type:'spki',format:'der'}).toString('base64');
    h.f.platform.mailer=createSendgridAdapter({apiKey:'unused-no-provider-requests',webhookPublicKey:key});
    const app=createApp(h.f.bindings,h.f.platform);
    const now=String(Math.floor(Date.now()/1000));
    const raw=Buffer.from('[\n { "event":"spamreport", "sg_event_id":"forwarded-original", "timestamp":'+now+', "email":"forwarded@example.test", "note":"Café 🥭" }\n]\n');
    const headers=(body:Uint8Array,timestamp=now,privateKey=pair.privateKey)=>({'Content-Type':'application/json','X-Twilio-Email-Event-Webhook-Timestamp':timestamp,'X-Twilio-Email-Event-Webhook-Signature':sign('sha256',Buffer.concat([Buffer.from(timestamp),Buffer.from(body)]),privateKey).toString('base64')});
    const signature=headers(raw);
    const post=(body:any,extra:Record<string,string>)=>app.fetch(new Request('https://mango.example.test/webhooks/mail/sendgrid',{method:'POST',headers:{Host:'mango.example.test',...extra},body,...(body instanceof ReadableStream?{duplex:'half'}:{})} as RequestInit),h.f.bindings);
    const count=async(table:string)=>(await h.f.db.prepare(`SELECT count(*) AS n FROM ${table}`).first<any>()).n;
    expect((await post(raw,signature)).status).toBe(204);
    expect(await count('provider_fact_inbox')).toBe(1);expect(await count('contact_suppressions')).toBe(1);expect(await count('delivery_facts')).toBe(0);
    expect((await post(raw,signature)).status).toBe(204);expect(await count('provider_fact_inbox')).toBe(1);expect(await count('contact_suppressions')).toBe(1);expect(await count('delivery_facts')).toBe(0);
    for(const [body,signed] of [
      [Buffer.from(JSON.stringify(JSON.parse(raw.toString()))),signature],
      [Buffer.from(raw.toString().replace('forwarded@example.test','tampered@example.test')),signature],
      [raw,headers(raw,now,other.privateKey)],
      [raw,headers(raw,String(Number(now)-600))],
      [Buffer.from([0xff,0xfe,0x7b]),headers(Buffer.from([0xff,0xfe,0x7b]))],
      [Buffer.from('--boundary\r\nContent-Disposition: form-data; name="email"\r\n\r\nmessage\r\n--boundary--'),headers(Buffer.from('--boundary\r\nContent-Disposition: form-data; name="email"\r\n\r\nmessage\r\n--boundary--'))],
    ] as [Buffer,Record<string,string>][])expect((await post(body,signed)).status).toBeGreaterThanOrEqual(400);
    let cancelled=false,chunks=0;
    const oversized=new ReadableStream({pull(controller){chunks++;controller.enqueue(new Uint8Array(1024*1024));},cancel(){cancelled=true;}});
    expect((await post(oversized,signature)).status).toBeGreaterThanOrEqual(400);expect(cancelled).toBe(true);expect(chunks).toBeLessThan(36);
    expect(await count('provider_fact_inbox')).toBe(1);expect(await count('contact_suppressions')).toBe(1);expect(await count('delivery_facts')).toBe(0);
    if(process.env.MANGO_CONTROLS_EVIDENCE){await mkdir(process.env.MANGO_CONTROLS_EVIDENCE,{recursive:true});await writeFile(join(process.env.MANGO_CONTROLS_EVIDENCE,'sendgrid-forwarding.json'),JSON.stringify({unchangedForwarding:204,replay:204,verifiedInboxFacts:1,suppressionFacts:1,unmatchedDeliveryFacts:0,rejected:['reserialized','tampered','wrong-key','stale','signed-invalid-UTF8','signed-multipart','oversized-stream'],streamCancelled:cancelled,liveProviderCalls:0},null,2));}
  }finally{await h.dispose();}
});

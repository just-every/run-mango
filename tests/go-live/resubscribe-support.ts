import {expect,type Page,type TestInfo} from '@playwright/test';
import {kioskInstallation} from './kiosk-harness';

export type ResubscribeSite=Awaited<ReturnType<typeof kioskInstallation>>;
type Message={to:string;text:string};

export async function responseJson(response:Response,status=200) {
  expect(response.status,await response.clone().text()).toBe(status);
  return response.json();
}

export function ownerRequest(site:ResubscribeSite,path:string,body?:unknown) {
  return fetch(site.runtime.url+path,{method:body===undefined?'GET':'POST',headers:{Cookie:site.cookie,Origin:site.runtime.url,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
}

export async function messagesFor(site:ResubscribeSite,email:string):Promise<Message[]> {
  return (await site.control('/_kiosk/messages') as Message[]).filter(message=>message.to===email);
}

export function confirmationLink(site:ResubscribeSite,message:Message) {
  const match=message.text.match(/https?:\/\/\S+\/consent\/confirm\/\S+/);
  expect(match,'The real confirmation mail includes its public link').not.toBeNull();
  const url=new URL(match![0]);
  expect(url.origin).toBe(site.runtime.url);
  return url.href;
}

export function confirm(link:string) {
  return fetch(link,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'});
}

export async function subscribedContact(site:ResubscribeSite,email:string) {
  const result=await responseJson(await ownerRequest(site,'/api/contacts/consent',{
    contact:{email,displayName:'Returning reader'},channel:'email',brandOrLegalSender:'Mango local',messageCategory:'newsletter',
    frequencyDisclosure:'Monthly newsletter',destinationJurisdiction:'AU',captureMethod:'operator-entry',captureSource:'Original affirmative signup',
    consentText:'Please send the newsletter.',consentVersion:'original-v1',occurredAt:new Date().toISOString(),
  }),201);
  const sent=await messagesFor(site,email);
  expect(sent).toHaveLength(1);
  expect((await confirm(confirmationLink(site,sent[0]))).status).toBe(200);
  return result.contact.id as string;
}

export async function importContacts(site:ResubscribeSite,emails:string[],preset:'csv-unsubscribed'|'csv-cleaned'|'csv-non-subscribed') {
  const preview=await responseJson(await ownerRequest(site,'/api/audience/import-preview',{
    files:[{name:`${preset}.csv`,preset,csv:`Email Address\n${emails.join('\n')}`}],
  }));
  let {job}=await responseJson(await ownerRequest(site,'/api/audience/imports',{fingerprint:preview.fingerprint}));
  for(let step=0;['queued','applying'].includes(job.state)&&step<10;step++) {
    ({job}=await responseJson(await ownerRequest(site,`/api/audience/imports/${job.id}/resume`,{})));
  }
  expect(job.state).toBe('completed');
}

export async function contactDetail(site:ResubscribeSite,id:string) {
  return responseJson(await ownerRequest(site,`/api/contacts/${id}`));
}

export async function growth(site:ResubscribeSite) {
  return responseJson(await ownerRequest(site,'/api/insights/list-growth'));
}

/** Both channel and exact address must retain their restrictive state. */
export async function expectEmailStatus(site:ResubscribeSite,email:string,status:string) {
  expect(await site.rows(`SELECT c.email_status,a.channel_status FROM contacts c JOIN contact_email_addresses a ON a.contact_id=c.id WHERE a.email='${email}'`))
    .toEqual([{email_status:status,channel_status:status}]);
}

export async function screenshots(page:Page,info:TestInfo,name:string) {
  for(const width of [1440]) {
    await page.setViewportSize({width,height:1000});
    await page.screenshot({path:info.outputPath(`${name}-${width}.png`),fullPage:true});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth),`${name} fits ${width}px`).toBeLessThanOrEqual(width);
  }
}

export async function publicCapture(site:ResubscribeSite,email:string,ip:string) {
  const description=await responseJson(await site.call('/subscribe/info'));
  return site.call('/subscribe',{email,consent:true,disclosure:description.disclosure,'cf-turnstile-response':`kiosk-token-${crypto.randomUUID()}`},{'CF-Connecting-IP':ip});
}

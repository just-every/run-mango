import {createHash} from 'node:crypto';
import {expect,type Page,type TestInfo} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {png,pngHeaderOnly} from '../support/images';
import {zip} from '../move-in/archive';
import {importArchive,postArchive,drive,consentEvidence} from '../move-in/support';
import {json,type Installation} from './harness';
import {openPage} from '../support/navigation';

export const imageNetwork:Record<string,{status?:number;location?:string;body?:Uint8Array;declaredBytes?:number}> = {
  'https://gallery.mailchimp.com/synthetic-mango-160.png': {status:200,body:png(4,4,160)},
  'https://gallery.mailchimp.com/synthetic-mango-161.png': {status:404},
  'https://gallery.mailchimp.com/synthetic-mango-162.png': {location:'https://private.example/image.png'},
};
Object.assign(imageNetwork, {
  'https://gallery.mailchimp.com/synthetic-mango-165.png': {status:200,body:new Uint8Array([0,1,2])},
  'https://gallery.mailchimp.com/synthetic-mango-166.png': {status:200,body:png(4097,2)},
  'https://gallery.mailchimp.com/synthetic-mango-167.png': {status:200,body:pngHeaderOnly(4,4)},
  'https://gallery.mailchimp.com/synthetic-mango-168.png': {status:200,declaredBytes:10_485_761},
});
export const imageHosts = ['gallery.mailchimp.com','mcusercontent.com','a.klaviyo.com','private.mcusercontent.com'];
const hash = (bytes:Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const image = (source:string) => `<a href="https://partner.example/offer"><img src="${source}" alt="Synthetic garden" width="4" height="4"></a>`;
export async function incumbentImageJourney(site:Installation,cookie:string,page:Page,info:TestInfo) {
  const gallery = [156,157,158].map(n=>({name:`gallery/synthetic-mango-${n}.png`,data:png(4,4,n)}));
  const sources = gallery.map(file=>'https://mcusercontent.com/account/'+file.name.split('/').at(-1));
  const body = '<p>synthetic-mango-159 gallery</p>'+sources.map(image).join('');
  const missing = '<p>synthetic-mango-161 missing</p>'+image('https://gallery.mailchimp.com/synthetic-mango-161.png');
  const fixture = zip([...gallery,...[165,166,167,168,169].map(n=>({name:`templates/synthetic-mango-${n}.html`,data:`<p>synthetic-mango-${n}</p>`+image(n===169?'https://private.mcusercontent.com/synthetic-mango-169.png':`https://gallery.mailchimp.com/synthetic-mango-${n}.png`)})),{name:'templates/synthetic-mango-159.html',data:body},
    {name:'emails.csv',data:'title,subject,send_time\nsynthetic-mango-159,Gallery history,2026-03-01T00:00:00Z'},
    {name:'campaigns_content/synthetic-mango-159.html',data:body},
    {name:'templates/synthetic-mango-160.html',data:'<p>synthetic-mango-160 network</p>'+image('https://gallery.mailchimp.com/synthetic-mango-160.png')},
    {name:'templates/synthetic-mango-161.html',data:missing},
    {name:'templates/synthetic-mango-162.html',data:'<p>synthetic-mango-162 redirect</p>'+image('https://gallery.mailchimp.com/synthetic-mango-162.png')},
  ]);
  const attemptsBefore = {...imageCalls};
  await postArchive(site,cookie,'/api/audience/archive-preview',fixture);
  expect(imageCalls).toEqual(attemptsBefore);
  const moved = await importArchive(site,cookie,fixture);
  const detail = await json(await site.call(`/api/audience/archives/${moved.archive.id}`,{cookie}),200);
  const template = (n:number)=>detail.content.find((row:any)=>row.source_path===`templates/synthetic-mango-${n}.html`);
  const start = async(n:number)=>{
    const started=await json(await site.call(`/api/campaign-templates/${template(n).id}/start`,{method:'POST',cookie}),201);
    return {...started,...await json(await site.call(`/api/campaigns/${started.campaignId}`,{cookie}),200)};
  };
  const saved = await start(159);
  let expected = body;
  for(const [index,file] of gallery.entries()) {
    const url=site.origin+'/media/'+hash(file.data);
    expected=expected.replace(sources[index],url);
    const response=await site.call('/media/'+hash(file.data));
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(file.data);
  }
  expect(saved.revision.emailBody.slice(0,expected.length)).toBe(expected);
  const history=detail.content.find((row:any)=>row.kind==='history');
  const copied=await json(await site.call(`/api/imported-history/${history.id}/copy`,{method:'POST',cookie}),201);
  const copiedDetail=await json(await site.call(`/api/campaigns/${copied.campaignId}`,{cookie}),200);
  expect(copiedDetail.revision.emailBody.slice(0,expected.length)).toBe(expected);
  expect(imageCalls['https://gallery.mailchimp.com/synthetic-mango-160.png']).toBe(1);
  expect(imageCalls['https://gallery.mailchimp.com/synthetic-mango-161.png']).toBe(1);
  const fetched=await start(160), remote=imageNetwork['https://gallery.mailchimp.com/synthetic-mango-160.png'].body!;
  expect(fetched.revision.emailBody).toContain(site.origin+'/media/'+hash(remote));
  expect(new Uint8Array(await (await site.call('/media/'+hash(remote))).arrayBuffer())).toEqual(remote);
  const failed=await start(161);
  expect(failed.revision.emailBody.slice(0,missing.length)).toBe(missing);
  expect(template(161).removed_json).toContain('HTTP 404');
  expect(template(162).removed_json).toContain('HTTP 302');
  for (const [n,reason] of [[165,'Unsupported image type'],[166,'pixel limits'],[167,'incomplete'],[168,'byte limit'],[169,'private-network']] as const) expect(template(n).removed_json).toContain(reason);
  expect(imageCalls['https://private.mcusercontent.com/synthetic-mango-169.png']).toBeUndefined();
  const report=async()=> (await site.call(`/api/audience/archives/${moved.archive.id}/report`,{cookie})).text();
  expect(await report()).toContain('synthetic-mango-161');
  expect(await report()).toContain('HTTP 404');
  expect(await report()).toContain('still on an incumbent host');
  const checks=await json(await site.call(`/api/campaigns/${saved.campaignId}/checks`,{method:'POST',cookie,body:{revisionId:saved.revisionId}}),200);
  expect(checks.checks.find((check:any)=>check.kind==='message.content')).toMatchObject({status:'passed'});
  await openPage(page,site.runtime.url+'/app/audience/import');
  const archivePanel=page.locator('.audience-import-job').filter({has:page.locator(`a[href="/api/audience/archives/${moved.archive.id}/report"]`)});
  await archivePanel.getByRole('button',{name:'Show imported history and templates',exact:true}).click();
  await archivePanel.locator('tr').filter({hasText:'synthetic-mango-161'}).locator('summary').click();
  for(const width of [1440,390]) {
    await page.setViewportSize({width,height:1000});
    await expect(page.getByText(/Image failed:.*synthetic-mango-161/)).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>window.__rerHydration?.count??0)).toBe(0);
    expect((await new AxeBuilder({page}).include('main').options({iframes:false}).analyze()).violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
    await page.screenshot({path:info.outputPath(`incumbent-image-reconciliation-${width}.png`),fullPage:true});
  }
  // Replace through CAMP-012's upload and the ordinary draft/template save doors.
  const replacement=png(4,4,163),form=new FormData();
  form.set('file',new Blob([replacement],{type:'image/png'}),'synthetic-mango-163.png');
  const uploaded=await json(await site.call('/api/campaign-assets',{method:'POST',cookie,raw:form}),201);
  await json(await site.call(`/api/campaign-revisions/${failed.revisionId}`,{method:'PATCH',cookie,body:{emailBody:missing.replace('https://gallery.mailchimp.com/synthetic-mango-161.png',uploaded.asset.url)}}),200);
  const templates=(await json(await site.call('/api/campaign-templates',{cookie}),200)).templates;
  const existing=templates.find((row:any)=>row.id===template(161).id);
  await json(await site.call('/api/campaign-templates',{method:'POST',cookie,body:{revisionId:failed.revisionId,name:existing.name,templateId:existing.id,updatedAt:Date.parse(existing.updatedAt)}}),201);
  expect((await json(await site.call(`/api/audience/archives/${moved.archive.id}`,{cookie}),200)).content.find((row:any)=>row.id===existing.id).removed_json).not.toContain('Image failed:');
  expect(await report()).not.toContain('HTTP 404');
  const source=await json(await site.call('/api/audience/import-source',{method:'POST',cookie,body:{provider:'klaviyo',endpoint:'https://a.klaviyo.com',key:'synthetic-mango-164-key'}}),200);
  const preview=await json(await site.call('/api/audience/import-preview',{method:'POST',cookie,body:{...source,consent:consentEvidence}}),200);
  let job=(await json(await site.call('/api/audience/imports',{method:'POST',cookie,body:{fingerprint:preview.fingerprint}}),200)).job;
  while(['queued','applying'].includes(job.state))job=(await json(await site.call(`/api/audience/imports/${job.id}/resume`,{method:'POST',cookie,body:{}}),200)).job;
  expect(job.state).toBe('completed');
  expect(await (await site.call(`/api/audience/imports/${job.id}/report`,{cookie})).text()).toContain('Image re-hosted:');
  expect(imageCalls['https://gallery.mailchimp.com/synthetic-mango-160.png']).toBe(2);
  const apiTemplate=(await json(await site.call('/api/campaign-templates',{cookie}),200)).templates.find((row:any)=>row.name==='synthetic-mango-164 API image');
  const apiStarted=await json(await site.call(`/api/campaign-templates/${apiTemplate.id}/start`,{method:'POST',cookie}),201);
  expect((await json(await site.call(`/api/campaigns/${apiStarted.campaignId}`,{cookie}),200)).revision.emailBody).toContain(site.origin+'/media/'+hash(remote));
  await drive(site,cookie,moved.archive.id,'undo');
  expect((await site.call('/media/'+hash(gallery[0].data))).status).toBe(200);
}

/** API fixtures use the real move-in reader, with only its HTTPS edge replaced. */
export async function imageApi(url:URL,request:import('node:http').IncomingMessage,response:import('node:http').ServerResponse) {
  if(url.hostname==='cloudflare-dns.com' && url.searchParams.get('name')==='private.mcusercontent.com') {
    response.writeHead(200,{'Content-Type':'application/dns-json'});response.end(JSON.stringify({Answer:[{data:'10.0.0.1'}]}));return true;
  }
  if(url.hostname!=='a.klaviyo.com')return false;
  expect(request.headers.authorization).toBe('Klaviyo-API-Key synthetic-mango-164-key');
  const path=url.pathname.replace('/api/','');
  const data=path==='profiles'?[{type:'profile',id:'synthetic-mango-164',attributes:{email:'synthetic-mango-164@example.test',properties:{},subscriptions:{email:{marketing:{consent:'UNSUBSCRIBED'}}}}}]
    :path==='templates'?[{type:'template',id:'synthetic-mango-164'}]
    :path==='templates/synthetic-mango-164'?{type:'template',id:'synthetic-mango-164',attributes:{name:'synthetic-mango-164 API image',html:'<p>synthetic-mango-164 API image</p>'+image('https://gallery.mailchimp.com/synthetic-mango-160.png')}}:[];
  response.writeHead(200,{'Content-Type':'application/json'});response.end(JSON.stringify({data,links:{next:null}}));return true;
}

export const imageCalls:Record<string,number> = {};
export async function imageBytes(url:URL,request:import('node:http').IncomingMessage,response:import('node:http').ServerResponse) {
  const fixture = imageNetwork[url.href as keyof typeof imageNetwork];
  if (!fixture || request.method !== 'GET') return false;
  imageCalls[url.href] = (imageCalls[url.href]??0)+1;
  const record = fixture as {status?:number;location?:string;body?:Uint8Array;declaredBytes?:number};
  response.writeHead(record.status ?? (record.location ? 302 : 200),record.location ? {Location:record.location} : {'Content-Type':'image/png',...(record.declaredBytes?{'Content-Length':String(record.declaredBytes)}:{})});
  response.end(record.body ? Buffer.from(record.body) : undefined); return true;
}

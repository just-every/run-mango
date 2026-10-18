import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {expect, type Page, type FrameLocator} from '@playwright/test';
import {availableTransport, json, type Installation} from './harness';
import type {providerEdge} from './edge';
import {openPage} from '../support/navigation';

type Edge = Awaited<ReturnType<typeof providerEdge>>;

/** The published iframe, served by a real allowed embedding origin. */
export async function publicFormCaptures(page:Page,site:Installation,edge:Edge,cookie:string) {
  const server=createServer((_request,response)=>{
    response.writeHead(200,{'Content-Type':'text/html'});
    response.end(`<!doctype html><html lang="en"><title>Newsletter signup</title><body><iframe title="Newsletter" src="${site.runtime.url}/subscribe" width="390" height="900"></iframe></body></html>`);
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  if(!address || typeof address==='string')throw new Error('Embed origin did not start.');
  const embedOrigin=`http://127.0.0.1:${address.port}`;
  const info=await json(await site.call('/api/audience/signup',{cookie}),200);
  await json(await site.call('/api/audience/signup',{method:'PUT',cookie,body:{frequencyDisclosure:info.frequencyDisclosure,embedOrigins:[embedOrigin]}}),200);
  await page.context().setExtraHTTPHeaders({'CF-Connecting-IP':'192.0.2.74'});
  async function submit(form:Page|FrameLocator,email:string) {
    await availableTransport(site);
    await form.getByLabel('Email address').fill(email);
    await form.getByRole('checkbox').check();
    const response=page.waitForResponse(result=>new URL(result.url()).pathname==='/subscribe'&&result.request().method()==='POST');
    await form.getByRole('button',{name:'Request confirmation'}).click();
    expect((await response).status()).toBe(202);
    const evidence=(await site.rows(`SELECT c.email_status,e.capture_source,e.capture_method,e.consent_version,e.consent_text
      FROM contacts c JOIN consent_evidence e ON e.contact_id=c.id WHERE c.email='${email}'`))[0];
    expect(evidence.email_status).toBe('pending');
    const message=edge.sends.findLast(send=>send.to===email)!;
    const link=/https:\/\/\S+\/consent\/confirm\/\S+/.exec(message.body.content.find((part:any)=>part.type==='text/plain').value)![0];
    expect((await fetch(site.local(link),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'confirm=true'})).status).toBe(200);
    return evidence;
  }
  try {
    await openPage(page,`${site.runtime.url}/subscribe`);
    const hosted=await submit(page,'hosted-growth@example.test');
    await page.goto(embedOrigin);
    const embedded=await submit(page.frameLocator('iframe'),'embed-growth@example.test');
    // Hosting and embedding use the same published capture point, not two forms.
    expect(embedded).toEqual(hosted);
    return hosted;
  } finally {
    await page.goto('about:blank');
    await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
    await page.context().setExtraHTTPHeaders({});
  }
}

/** Model a populated installation upgrading from before 0073. The real contact
 * writes above went through public routes. Only the reporting projection is
 * removed; retained evidence is dated into the prior installation period. */
export async function retainedHistoryUpgrade(site:Installation) {
  const objects=await site.rows("SELECT type,name FROM sqlite_master WHERE name GLOB 'list_growth_*' AND type IN ('trigger','table') ORDER BY CASE type WHEN 'trigger' THEN 0 ELSE 1 END");
  const drops=objects.map(row=>{
    if(!/^list_growth_[a-z_]+$/.test(row.name))throw new Error('Unexpected growth projection object.');
    return `DROP ${row.type.toUpperCase()} ${row.name};`;
  }).join('\n');
  const age=3*86400000;
  await site.runtime.sql(`${drops}
    UPDATE consent_evidence SET created_at=created_at-${age},occurred_at=occurred_at-${age},
      confirmed_at=CASE WHEN confirmed_at IS NULL THEN NULL ELSE confirmed_at-${age} END;
    -- Old incumbent dates must never backdate this installation's capture.
    UPDATE consent_evidence SET occurred_at=occurred_at-${90*86400000},confirmed_at=created_at-${30*86400000}
      WHERE destination='alice@example.test';`);
  const retained=await site.rows('SELECT * FROM consent_evidence ORDER BY id');
  await site.runtime.sql('\n'+await readFile('migrations/core/0073_list_growth.sql','utf8'));
  await site.runtime.sql('\n'+await readFile('migrations/core/0074_list_growth_retained_history.sql','utf8'));
  expect(await site.rows('SELECT * FROM consent_evidence ORDER BY id')).toEqual(retained);
  return {retained,from:new Date(Math.min(...retained.map(row=>Number(row.created_at)))).toISOString().slice(0,10),
    to:new Date(Math.max(...retained.map(row=>Math.max(Number(row.created_at),Number(row.confirmed_at??0))))).toISOString().slice(0,10)};
}

import {audienceSizeJourney} from './audience-size-journey';
import {flowTemplateJourney} from './flow-template-journey';
import {blockMobileControlsJourney,fullPromotionalEmailJourney} from './block-builder-journey';
import {mobilePresentationJourney} from './mobile-presentation-journey';
import { localSessionCookieName } from '../support/local-session';
import { test, expect } from '@playwright/test';
import { authoredBody } from '../../src/core/features/campaigns/authoring-content';
import { authoringRuntime } from './browser-runtime.mjs';

// The reported bypass (MSG-012) in all six spellings: a tag walker read each as closing the white span; mail
// clients read a comment or text and keep the span open over the claim.
const closeTags = ['</ span>', '< /span>', '<\t/span>', '<\n/span>', '</\tspan>', '</\nspan>'];

test('[BUILD-010][CAMP-022][MSG-009][MSG-012] saving stores the body as mail clients parse it, and approval judges that tree', async ({ request,page },info) => {
  test.setTimeout(600000);
  const runtime = await authoringRuntime({ suite: 'authoring-canonical-save', reuseEmptySchema: true });
  try {
    const open = await request.post(runtime.url + '/_authoring/open', { headers: { 'X-Test-Token': runtime.token } });
    expect(open.status()).toBe(200);
    const headers = { Cookie: `${localSessionCookieName(runtime.url)}=${(await open.json()).token}`, Origin: runtime.url };
    const created = await request.post(runtime.url + '/api/campaigns', { headers, data: {} });
    expect(created.status(), await created.text()).toBe(201);
    const { campaignId, revisionId } = await created.json();
    const save = async (emailBody: string) => {
      const saved = await request.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`, { headers, data: { emailBody } });
      expect(saved.status(), `${JSON.stringify(emailBody)}: ${await saved.text()}`).toBe(200);
      return (await (await request.get(`${runtime.url}/api/campaigns/${campaignId}`, { headers })).json()).revision.emailBody as string;
    };
    const blockers = async () => {
      const checks = await request.post(`${runtime.url}/api/campaigns/${campaignId}/checks`, { headers, data: { revisionId } });
      expect(checks.status()).toBe(200);
      return (await checks.json()).blockers.map((blocker: { kind: string }) => blocker.kind) as string[];
    };

    for (const close of closeTags) {
      const stored = await save(`<p style="color:#333333"><span style="color:#ffffff">${close}Salted claim</p>`);
      // Stored as parsed: the bogus close tag is the comment or text parsers make of it, and the white span closes last.
      expect(stored, JSON.stringify(close)).not.toContain(close);
      expect(stored, JSON.stringify(close)).toContain('Salted claim</span></p>');
      // Unambiguous: saving the stored body again stores the same bytes.
      expect(await save(authoredBody(stored))).toBe(stored);
      expect(await blockers(), JSON.stringify(close)).toContain('message.content');
      const approval = await request.post(`${runtime.url}/api/campaigns/${campaignId}/approve`, { headers, data: { revisionId, idempotencyKey: crypto.randomUUID() } });
      expect(approval.status(), JSON.stringify(close)).toBe(409);
    }

    // Normalised, never refused: parsers keep the first of two style attributes and ignore a cell outside a table
    // with its style, so the stored body is what every recipient sees, and the checker judges exactly that.
    const white = await save('<p style="color:#ffffff" style="color:#333333">Salted claim</p>');
    expect(white).not.toContain('#333333');
    expect(await blockers()).toContain('message.content');
    const visible = await save('<p style="color:#333333" style="display:none">Reviewed claim</p><td style="display:none">Reviewed cell</td>');
    expect(visible).not.toMatch(/display:none|<td/);
    expect(await blockers()).not.toContain('message.content');
    await mobilePresentationJourney(request,page,info,runtime.url,headers);
    await blockMobileControlsJourney(page,info,runtime,headers);
  } finally {
    await runtime.close();
  }
  console.log('Canonical proof: start full promotion');
  await fullPromotionalEmailJourney(page,info);
});

// Bodies whose first save once stored the managed footer where the next save moved it: markup a parser rebuilds
// differently from its serialisation (a MathML text integration point, raw text that becomes markup), a footer
// written with other quotes ahead of the content, and a footer inside raw text; and bodies a save once failed on
// (an SVG element named template) or grew on every save (a plaintext element inside SVG's own plaintext).
const unsettled = [
  { body: '<math><mtext><table><mglyph><style><li STYLE="color:#ffffff">', approvable: false, refused:true },
  { body: '<svg><template><p>Seasonal news</p></template></svg>', approvable: false },
  { body: '<svg><plaintext><desc><a href="https://shop.example.test/"><plaintext>Seasonal news', approvable: false },
  { body: `<hr><p>{{physical_address}}</p><p><a href='{{unsubscribe_url}}'>Unsubscribe</a></p><p>Seasonal news</p>`, approvable: true },
  { body: '<script><hr><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p></script><p>Seasonal news</p>', approvable: false },
];

test('[CAMP-022][MSG-009] a saved body saves to the same bytes, whether saved as stored or as the editor shows it', async ({ request,page },info) => {
  test.setTimeout(600000);
  const runtime = await authoringRuntime({ suite: 'authoring-canonical-save', reuseEmptySchema: true });
  try {
    const open = await request.post(runtime.url + '/_authoring/open', { headers: { 'X-Test-Token': runtime.token } });
    expect(open.status()).toBe(200);
    const headers = { Cookie: `${localSessionCookieName(runtime.url)}=${(await open.json()).token}`, Origin: runtime.url };
    const { campaignId, revisionId } = await (await request.post(runtime.url + '/api/campaigns', { headers, data: {} })).json();
    const save = async (emailBody: string) => {
      const saved = await request.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`, { headers, data: { emailBody } });
      expect(saved.status(), `${JSON.stringify(emailBody)}: ${await saved.text()}`).toBe(200);
      return (await (await request.get(`${runtime.url}/api/campaigns/${campaignId}`, { headers })).json()).revision.emailBody as string;
    };
    for (const { body, approvable,refused } of unsettled) {
      if(refused){const response=await request.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`,{headers,data:{emailBody:body}});expect(response.status()).toBe(400);expect((await response.json()).detail).toContain('style');continue;}
      const stored = await save(body);
      expect(await save(stored), body).toBe(stored);
      expect(await save(authoredBody(stored)), body).toBe(stored);
      const checks = await request.post(`${runtime.url}/api/campaigns/${campaignId}/checks`, { headers, data: { revisionId } });
      const blockers = (await checks.json()).blockers.map((blocker: { kind: string }) => blocker.kind) as string[];
      if (approvable) expect(blockers, body).not.toContain('message.content');
      else expect(blockers, body).toContain('message.content');
    }

    // Arrange an older draft directly in D1: a normal body save would already
    // canonicalize it and could not prove that editing another field upgrades it.
    const historical = await request.post(runtime.url + '/api/campaigns', { headers, data: {} });
    expect(historical.status()).toBe(201);
    const older = await historical.json();
    const raw = '<P>synthetic-mango-351 &amp; {{displayName | fallback:"Reader"}}<BR><A HREF=\'https://shop.example.test/season?x=1&amp;y=2\' HREF="https://ignored.example.test/">Season &amp; news</A></P><TABLE><TR><TD>Cell <B>offer</TD></TR></TABLE><NOSCRIPT><P>Fallback <A HREF=https://shop.example.test/fallback>Visit</A></P></NOSCRIPT>';
    // These expectations specify the recipient tree independently of Mango's
    // parser, text derivation and footer helpers, including scripting-off content.
    const expectedBody = '<p>synthetic-mango-351 &amp; {{displayName | fallback:"Reader"}}<br><a href="https://shop.example.test/season?x=1&amp;y=2">Season &amp; news</a></p><table><tbody><tr><td>Cell <b>offer</b></td></tr></tbody></table><noscript><p>Fallback <a href="https://shop.example.test/fallback">Visit</a></p></noscript><p><a href="https://shop.example.test/retained?campaign=351&amp;part=2">Retained destination</a></p><hr><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>';
    const expectedText = 'synthetic-mango-351 & {{displayName | fallback:"Reader"}}\nSeason & news (https://shop.example.test/season?x=1&y=2)\nCell offer\nFallback Visit (https://shop.example.test/fallback)\nRetained destination (https://shop.example.test/retained?campaign=351&part=2)\n\n{{physical_address}}\nUnsubscribe ({{unsubscribe_url}})';
    const expectedLinks = [
      {sequence:1,label:'Season & news',destinationUrl:'https://shop.example.test/season?x=1&y=2'},
      {sequence:2,label:'Visit',destinationUrl:'https://shop.example.test/fallback'},
      {sequence:3,label:'Retained destination',destinationUrl:'https://shop.example.test/retained?campaign=351&part=2'},
    ];
    const quoted = (value:string) => "'" + value.replaceAll("'", "''") + "'";
    await runtime.sql(`UPDATE campaign_revisions SET email_body=${quoted(raw)},email_text='synthetic-mango-351 stale text' WHERE id=${quoted(older.revisionId)}`);
    await runtime.sql(`INSERT INTO campaign_revision_links (id,revision_id,sequence,label,destination_url,created_at,updated_at) VALUES ('synthetic-mango-351',${quoted(older.revisionId)},1,'Retained destination','https://shop.example.test/retained?campaign=351&part=2',1,1)`);
    const readOlder = async () => {
      const response = await request.get(`${runtime.url}/api/campaigns/${older.campaignId}`, {headers});
      expect(response.status()).toBe(200);
      return response.json();
    };
    expect((await readOlder()).revision).toMatchObject({emailBody:raw,emailText:'synthetic-mango-351 stale text'});
    const assertOlder = async (name:string,emailSubject:string) => {
      const detail = await readOlder();
      expect(detail.campaign).toMatchObject({state:'draft',activeRevisionId:older.revisionId});
      expect(detail.revision).toMatchObject({name,emailSubject,state:'draft',emailBody:expectedBody,emailText:expectedText,approvedAt:null,approvedByOperatorId:null,contentDigest:null});
      expect(detail.links.map(({sequence,label,destinationUrl}:{sequence:number;label:string;destinationUrl:string}) => ({sequence,label,destinationUrl}))).toEqual(expectedLinks);
      expect(await runtime.sql(`SELECT email_body,email_text FROM campaign_revisions WHERE id=${quoted(older.revisionId)}`)).toEqual([{email_body:expectedBody,email_text:expectedText}]);
      expect(await runtime.sql(`SELECT sequence,label,destination_url AS destinationUrl FROM campaign_revision_links WHERE revision_id=${quoted(older.revisionId)} ORDER BY sequence`)).toEqual(expectedLinks);
      const state = await request.get(runtime.url + '/_authoring/state', {headers:{'X-Test-Token':runtime.token}});
      expect(state.status()).toBe(200);
      expect(await state.json()).toEqual({jobs:[],recipients:[],approvals:[]});
    };
    const beforeOlder = await readOlder();
    const renamed = await request.patch(`${runtime.url}/api/campaign-revisions/${older.revisionId}`, {headers,data:{name:'synthetic-mango-351 renamed'}});
    expect(renamed.status(),await renamed.text()).toBe(200);
    await assertOlder('synthetic-mango-351 renamed',beforeOlder.revision.emailSubject);
    console.log('PROBE CAMP-022 acceptance-6 older draft: name-only native PATCH -> canonical persisted body, independently expected text and three retained destinations; no approval, recipients or jobs');
    const resubjected = await request.patch(`${runtime.url}/api/campaign-revisions/${older.revisionId}`, {headers,data:{emailSubject:'synthetic-mango-351 subject'}});
    expect(resubjected.status(),await resubjected.text()).toBe(200);
    await assertOlder('synthetic-mango-351 renamed','synthetic-mango-351 subject');
    await assertOlder('synthetic-mango-351 renamed','synthetic-mango-351 subject');
    console.log('PROBE CAMP-022 acceptance-6 same parse: subject-only native PATCH and repeated authenticated GET -> identical HTML and text bytes, decoded destinations and no sending authority');

    await save('<p>synthetic-mango-125 library copy</p>');
    const named=await request.patch(`${runtime.url}/api/campaign-revisions/${revisionId}`,{headers,data:{name:'synthetic-mango-125',emailSubject:'Synthetic library copy',preheader:'Synthetic flow copy'}});expect(named.status()).toBe(200);
    const template=await request.post(runtime.url+'/api/campaign-templates',{headers,data:{revisionId,name:'synthetic-mango-125-template'}});expect(template.status()).toBe(201);
    const cookie=headers.Cookie.split('=');await page.context().addCookies([{name:cookie[0],value:cookie.slice(1).join('='),url:runtime.url}]);
    await flowTemplateJourney(page,info,runtime.url,headers);
  } finally {
    await runtime.close();
  }
  await audienceSizeJourney(page,info);
});

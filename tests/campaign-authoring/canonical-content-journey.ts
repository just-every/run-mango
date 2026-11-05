import {expect, type APIRequestContext} from '@playwright/test';

const footer = '<hr><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>';
const footerText = '{{physical_address}}\nUnsubscribe ({{unsubscribe_url}})';

/** Native creates, saves and checks, with recipient bytes specified independently of product helpers. */
export async function canonicalContentJourney(request: APIRequestContext, runtime: {
  url: string; token: string; sql: (query: string) => Promise<unknown>;
}, headers: Record<string, string>) {
  const composition = {
    name: 'synthetic-mango-411', emailSubject: 'Synthetic garden letter',
    emailBody: '<P title=\'Keep &amp; "quotes"\' style="color:#333333;font-size:16px">synthetic-mango-411 {{displayName | fallback:"Reader"}}<BR><A HREF=https://shop.example.test/offer?x=1&amp;y=2>Garden &amp; news</A></P>',
    emailText: 'synthetic-mango-411 stale supplied text', preheader: 'Garden news',
    senderName: 'Synthetic garden', fromEmail: ['offers','example.test'].join('@'),
    replyToEmail: ['reply','example.test'].join('@'), physicalAddress: '1 Synthetic Street',
    messageCategory: 'newsletter',
    inclusionRuleJson: JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'emailStatus',comparator:'eq',value:'subscribed'}]}),
    steps: [{channel:'email',timezone:'Australia/Brisbane',scheduledAt:'2031-06-07T00:00:00.000Z',sendByAt:'2031-06-07T13:59:00.000Z',whyThisTime:'Operator selected'}],
  };
  const expected = '<p title="Keep &amp; &quot;quotes&quot;" style="color:#333333;font-size:16px">synthetic-mango-411 {{displayName | fallback:"Reader"}}<br><a href="https://shop.example.test/offer?x=1&amp;y=2">Garden &amp; news</a></p>' + footer;
  const expectedText = 'synthetic-mango-411 {{displayName | fallback:"Reader"}}\nGarden & news (https://shop.example.test/offer?x=1&y=2)\n\n' + footerText;
  const created = await request.post(runtime.url + '/api/campaigns', {headers,data:{composition}});
  expect(created.status(), await created.text()).toBe(201);
  const {campaignId,revisionId} = await created.json();
  const read = async () => {
    const response = await request.get(runtime.url + '/api/campaigns/' + campaignId, {headers});
    expect(response.status()).toBe(200);
    return response.json();
  };
  const patch = (emailBody: string) => request.patch(runtime.url + '/api/campaign-revisions/' + revisionId, {headers,data:{emailBody}});
  const assertBytes = async (emailBody: string, emailText: string) => {
    const detail = await read();
    expect(detail.revision).toMatchObject({state:'draft',emailBody,emailText,approvedAt:null,approvedByOperatorId:null,contentDigest:null});
    expect(await runtime.sql("SELECT email_body,email_text FROM campaign_revisions WHERE id='" + revisionId + "'"))
      .toEqual([{email_body:emailBody,email_text:emailText}]);
    return detail;
  };
  const save = async (body: string, emailBody: string, emailText: string) => {
    const response = await patch(body);
    expect(response.status(), await response.text()).toBe(200);
    return assertBytes(emailBody,emailText);
  };
  const checks = async () => {
    const response = await request.post(runtime.url + '/api/campaigns/' + campaignId + '/checks', {headers,data:{revisionId}});
    expect(response.status()).toBe(200);
    return response.json();
  };
  const refuseApproval = async () => {
    expect((await checks()).blockers.map((row: {kind:string}) => row.kind)).toContain('message.content');
    const response = await request.post(runtime.url + '/api/campaigns/' + campaignId + '/approve', {headers,data:{revisionId,idempotencyKey:crypto.randomUUID()}});
    expect(response.status()).toBe(409);
  };

  // Creation ignores the supplied stale text and keeps title, inline style and token bytes.
  const initial = await assertBytes(expected,expectedText);
  expect(initial.links.map((link: {destinationUrl:string}) => link.destinationUrl)).toEqual(['https://shop.example.test/offer?x=1&y=2']);
  expect((await checks()).blockers.map((row: {kind:string}) => row.kind)).not.toContain('message.content');
  await save(expected,expected,expectedText);
  await save(expected+footer,expected,expectedText);
  await save(expected.slice(0,-footer.length),expected,expectedText);
  console.log('PROBE CAMP-022 acceptance-1: explicit native create and repeat saves -> one postal and unsubscribe footer, exact independent HTML and destination-bearing text');
  console.log('PROBE CAMP-022 acceptance-3: noncanonical case, quotes and unquoted destination -> accepted save preserving kept title, inline style and personalization token');

  // Scripting off parses noscript children as markup and drops end-tag attributes.
  const fallback = '<NOSCRIPT><P>synthetic-mango-412 <A HREF=https://shop.example.test/fallback>Visit &amp; read</A></P></NOSCRIPT><P>Visible</P ignored="lost">';
  const fallbackBody = '<noscript><p>synthetic-mango-412 <a href="https://shop.example.test/fallback">Visit &amp; read</a></p></noscript><p>Visible</p>' + footer;
  const fallbackText = 'synthetic-mango-412 Visit & read (https://shop.example.test/fallback)\nVisible\n\n' + footerText;
  const fallbackDetail = await save(fallback,fallbackBody,fallbackText);
  expect(fallbackDetail.links.map((link: {destinationUrl:string}) => link.destinationUrl)).toEqual(['https://shop.example.test/fallback']);
  await save(fallbackBody,fallbackBody,fallbackText);
  await refuseApproval(); // noscript is retained for the checker, never silently repaired.
  console.log('PROBE CAMP-022 acceptance-2: native PATCH of noscript content -> scripting-off child tree and text, byte-identical resave');
  console.log('PROBE CAMP-022 acceptance-4: native PATCH of end-tag attributes -> discarded attributes absent from persisted recipient tree');

  const refused = '<p style="display:none">synthetic-mango-413 {{displayName | fallback:"Reader"}}</p><!--synthetic-mango-413 retained comment--><script>syntheticMango413()</script>';
  const refusedText = 'synthetic-mango-413 {{displayName | fallback:"Reader"}}\nsyntheticMango413()\n' + footerText;
  await save(refused,refused+footer,refusedText);
  await refuseApproval();
  await assertBytes(refused+footer,refusedText);
  console.log('PROBE CAMP-022 acceptance-3 refusal: native save and approval -> comment, script and hiding declaration retained exactly, message.content blocks approval');

  // Each control keeps its significant leading newline on every stored and editor-form save.
  for (const tag of ['pre','textarea','listing']) {
    const body = '<p>synthetic-mango-414</p><' + tag + '>\n\nLine one\nLine two</' + tag + '>';
    const text = 'synthetic-mango-414\n\nLine one\nLine two\n' + footerText;
    await save(body,body+footer,text);
    await save(body+footer,body+footer,text);
    await save(body,body+footer,text);
    await refuseApproval();
  }
  const plaintext = '<p>synthetic-mango-415</p><plaintext>Offer &amp; <a href="https://shop.example.test/plain">Visit';
  const plaintextText = 'synthetic-mango-415\nOffer &amp; <a href="https://shop.example.test/plain">Visit';
  await save(plaintext,plaintext,plaintextText);
  await save(plaintext,plaintext,plaintextText);
  await refuseApproval();
  console.log('PROBE CAMP-022 acceptance-5 stability: native saves of preformatted controls and unclosed plaintext -> stable leading newlines and text, no footer growth or movement, approval refused');

  // Each nested integration point exposes another raw-text layer on a later parse.
  // This real input needs more than sixteen rounds; the parser itself is never replaced.
  const layer = '<math><mtext><table><mglyph><xmp>', offer = '<li title="synthetic-mango-416">Offer';
  const settledBody = '<math><mtext><mglyph><xmp></xmp></mglyph><li title="synthetic-mango-416">Offer<table></table></li></mtext></math>' + footer;
  await save(layer+offer,settledBody,'Offer\n\n'+footerText);
  await save(settledBody,settledBody,'Offer\n\n'+footerText);
  const unstable = layer.repeat(16) + offer;
  // Refusal must preserve a populated revision, including its previously saved destination.
  await save(expected,expected,expectedText);
  await checks();
  const before = await read();
  const persisted = await runtime.sql("SELECT * FROM campaign_revisions WHERE id='" + revisionId + "'");
  const links = await runtime.sql("SELECT * FROM campaign_revision_links WHERE revision_id='" + revisionId + "'");
  const counts = await runtime.sql('SELECT (SELECT count(*) FROM campaigns) AS campaigns,(SELECT count(*) FROM campaign_revisions) AS revisions,(SELECT count(*) FROM campaign_steps) AS steps,(SELECT count(*) FROM campaign_revision_links) AS links');
  for (const response of [
    await patch(unstable),
    await request.post(runtime.url + '/api/campaigns', {headers,data:{composition:{...composition,emailBody:unstable}}}),
  ]) {
    expect(response.status(), await response.text()).toBe(400);
    expect(await response.json()).toMatchObject({error:'invalid_email_body',detail:'This email body reads differently every time it is parsed. Rewrite it as plain email markup.'});
  }
  expect(await read()).toEqual(before);
  expect(await runtime.sql("SELECT * FROM campaign_revisions WHERE id='" + revisionId + "'")).toEqual(persisted);
  expect(await runtime.sql("SELECT * FROM campaign_revision_links WHERE revision_id='" + revisionId + "'")).toEqual(links);
  expect(await runtime.sql('SELECT (SELECT count(*) FROM campaigns) AS campaigns,(SELECT count(*) FROM campaign_revisions) AS revisions,(SELECT count(*) FROM campaign_steps) AS steps,(SELECT count(*) FROM campaign_revision_links) AS links')).toEqual(counts);
  const state = await request.get(runtime.url + '/_authoring/state', {headers:{'X-Test-Token':runtime.token}});
  expect(state.status()).toBe(200);
  expect(await state.json()).toEqual({jobs:[],recipients:[],approvals:[]});
  console.log('PROBE CAMP-022 acceptance-5 bound: native create and PATCH of sixteen nested raw-text layers -> invalid_email_body, unchanged draft bytes, links, counts and sending authority');
}

import {expect, test} from '@playwright/test';
import {authoringRuntime} from './browser-runtime.mjs';
import {localSessionCookieName} from '../support/local-session';

const address = (name: string) => [name, 'example.test'].join('@');

test('[CAMP-018] duplicated email drafts retain saved content and ordered settings without acquiring send authority', async ({request}) => {
  test.setTimeout(240000);
  const runtime = await authoringRuntime({suite:'campaign-duplicate-settings'});
  try {
    const open = await request.post(runtime.url + '/_authoring/open', {headers:{'X-Test-Token':runtime.token}});
    expect(open.status()).toBe(200);
    const headers = {Cookie:`${localSessionCookieName(runtime.url)}=${(await open.json()).token}`, Origin:runtime.url};
    const created = await request.post(runtime.url + '/api/campaigns', {headers, data:{}});
    expect(created.status(), await created.text()).toBe(201);
    const source = await created.json();
    const inclusion = {version:1, operator:'all', predicates:[
      {sourceType:'contact', field:'emailStatus', comparator:'eq', value:'subscribed'},
    ], groups:[{operator:'any', predicates:[
      {sourceType:'contact', field:'displayName', comparator:'contains', value:'synthetic-mango-482'},
      {sourceType:'contact', field:'displayName', comparator:'contains', value:'synthetic-mango-483'},
    ]}]};
    const exclusions = [{version:1, reason:'synthetic-mango-484 hold', predicate:{
      sourceType:'contact', field:'email', comparator:'eq', value:address('synthetic-mango-484'),
    }}];
    const body = '<h2>synthetic-mango-480 &amp; summer</h2><p>Read <a href="https://shop.example.test/synthetic-mango-481">the summer letter</a>.</p>';
    const expectedBody = body + '<hr><p>{{physical_address}}</p><p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>';
    const expectedText = 'synthetic-mango-480 & summer\nRead the summer letter (https://shop.example.test/synthetic-mango-481).\n\n{{physical_address}}\nUnsubscribe ({{unsubscribe_url}})';
    const fields = {
      emailSubject:'synthetic-mango-485 summer subject',
      preheader:'synthetic-mango-486 chosen preview',
      senderName:'synthetic-mango-487 editorial desk',
      fromEmail:address('synthetic-mango-488'),
      replyToEmail:address('synthetic-mango-489'),
      physicalAddress:'490 Synthetic Lane, Melbourne VIC 3000',
      messageCategory:'synthetic-mango-491 newsletter',
      inclusionRuleJson:JSON.stringify(inclusion), exclusionRulesJson:JSON.stringify(exclusions),
      trackingEnabled:true,
    };
    const steps = [
      {channel:'email', timezone:'Australia/Sydney', whyThisTime:'synthetic-mango-492 first edition', scheduledAt:'2034-06-12T01:00:00.000Z', sendByAt:'2034-06-12T13:59:00.000Z'},
      {channel:'email', timezone:'Asia/Kathmandu', whyThisTime:'synthetic-mango-493 second edition', scheduledAt:'2034-06-14T04:15:00.000Z', sendByAt:'2034-06-14T18:14:00.000Z'},
    ];
    const settings = steps.map(({channel, timezone, whyThisTime}) => ({channel, timezone, whyThisTime}));
    const saved = await request.patch(`${runtime.url}/api/campaign-revisions/${source.revisionId}`, {headers, data:{
      name:'synthetic-mango-494 source', ...fields, emailBody:body,
      emailText:'synthetic-mango-495 caller text must be derived from the saved body', steps,
    }});
    expect(saved.status(), await saved.text()).toBe(200);
    const read = async (campaignId: string) => {
      const response = await request.get(`${runtime.url}/api/campaigns/${campaignId}`, {headers});
      expect(response.status(), await response.text()).toBe(200);
      return response.json();
    };
    const original = await read(source.campaignId);
    expect(original.revision).toMatchObject({...fields, emailBody:expectedBody, emailText:expectedText});
    expect(original.steps.map(({channel, timezone, whyThisTime, scheduledAt, sendByAt}: typeof steps[number]) =>
      ({channel, timezone, whyThisTime, scheduledAt, sendByAt}))).toEqual(steps);
    const originalRows = await runtime.sql(`SELECT * FROM campaign_revisions WHERE id='${source.revisionId}'`);
    const originalSteps = await runtime.sql(`SELECT * FROM campaign_steps WHERE revision_id='${source.revisionId}' ORDER BY sequence`);
    const authority = async () => {
      const response = await request.get(runtime.url + '/_authoring/state', {headers:{'X-Test-Token':runtime.token}});
      expect(response.status()).toBe(200);
      return response.json();
    };
    expect(await authority()).toEqual({jobs:[], recipients:[], approvals:[]});
    const duplicate = async (campaignId: string) => {
      const response = await request.post(`${runtime.url}/api/campaigns/${campaignId}/duplicate`, {headers, data:{}});
      expect(response.status(), await response.text()).toBe(201);
      return response.json();
    };
    const copy = await duplicate(source.campaignId);
    // Duplicating the unscheduled copy must also preserve the stored settings,
    // rather than reading only the source's scheduled step rows.
    const reopenedCopy = await duplicate(copy.campaignId);
    expect(new Set([source.campaignId, copy.campaignId, reopenedCopy.campaignId]).size).toBe(3);
    expect(new Set([source.revisionId, copy.revisionId, reopenedCopy.revisionId]).size).toBe(3);
    for (const draft of [copy, reopenedCopy]) {
      for (let readNumber = 0; readNumber < 2; readNumber++) {
        const detail = await read(draft.campaignId);
        const reviewResponse = await request.get(`${runtime.url}/api/campaigns/${draft.campaignId}/review`, {headers});
        expect(reviewResponse.status(), await reviewResponse.text()).toBe(200);
        const review = await reviewResponse.json();
        for (const result of [detail, review]) {
          expect(result.campaign).toMatchObject({id:draft.campaignId, state:'draft', activeRevisionId:draft.revisionId});
          expect(result.revision).toMatchObject({...fields, id:draft.revisionId, campaignId:draft.campaignId,
            state:'draft', approvedAt:null, approvedByOperatorId:null, emailBody:expectedBody, emailText:expectedText, stepSettings:settings});
          expect(result.revision.emailBody).toBe(original.revision.emailBody);
          expect(result.revision.emailText).toBe(original.revision.emailText);
          expect(result.steps).toEqual([]);
        }
      }
      const [row] = await runtime.sql(`SELECT * FROM campaign_revisions WHERE id='${draft.revisionId}'`);
      expect(row).toMatchObject({campaign_id:draft.campaignId, state:'draft',
        email_subject:fields.emailSubject, preheader:fields.preheader, sender_name:fields.senderName,
        from_email:fields.fromEmail, reply_to_email:fields.replyToEmail, physical_address:fields.physicalAddress,
        message_category:fields.messageCategory, inclusion_rule_json:fields.inclusionRuleJson,
        exclusion_rules_json:fields.exclusionRulesJson, tracking_enabled:1,
        email_body:expectedBody, email_text:expectedText, approved_at:null, approved_by_operator_id:null});
      const pending = await runtime.sql(`SELECT settings_json FROM campaign_draft_step_settings WHERE revision_id='${draft.revisionId}'`);
      expect(pending).toHaveLength(1);
      expect(JSON.parse(pending[0].settings_json)).toEqual(settings);
      expect(await runtime.sql(`SELECT * FROM campaign_steps WHERE revision_id='${draft.revisionId}'`)).toEqual([]);
    }
    expect(await authority()).toEqual({jobs:[], recipients:[], approvals:[]});
    expect(await runtime.sql(`SELECT * FROM campaign_revisions WHERE id='${source.revisionId}'`)).toEqual(originalRows);
    expect(await runtime.sql(`SELECT * FROM campaign_steps WHERE revision_id='${source.revisionId}' ORDER BY sequence`)).toEqual(originalSteps);
    console.log('PROBE CAMP-018 acceptance-2: native save, duplicate, duplicate again and repeated detail and review reads -> exact chosen email fields, canonical body and derived text, ordered unscheduled email settings, three independent drafts and unchanged source; zero approvals, recipients or jobs.');
  } finally {
    await runtime.close();
  }
});

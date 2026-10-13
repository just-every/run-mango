import {renderMessageContent} from '../../src/core/features/campaigns/message-content';
import {test,expect} from '@playwright/test';
import {normalizeAuthoredContent,managedFooter} from '../../src/core/features/campaigns/authoring-content';
import {draftCompositionSchema} from '../../src/core/features/campaigns/draft-composition';
import {createDraftSchema} from '../../src/core/features/campaigns/create-draft';

test('[CAMP-002] incomplete draft and managed footer normalization preserve authored HTML, links and idempotence',()=>{
  expect(createDraftSchema.safeParse({}).success).toBe(true);
  expect(createDraftSchema.safeParse({composition:{inclusionRuleJson:'bad'}}).success).toBe(false);
  expect(draftCompositionSchema.safeParse({exclusionRulesJson:'{}'}).success).toBe(false);
  const html='<h2>Hello</h2><p><strong>Garden news</strong> <a href="https://example.test/path?a=1&amp;b=2">Read more</a></p><img src="https://example.test/image.png" width="200" height="100" alt="Garden">';
  const normalized=normalizeAuthoredContent({emailBody:html});
  expect(normalized.emailBody).toBe(html+managedFooter);
  expect(normalized.emailText).toContain('Read more (https://example.test/path?a=1&b=2)');
  expect(normalized.emailText).toContain('{{physical_address}}');
  expect(normalized.emailText).toContain('{{unsubscribe_url}}');
  expect(normalized.links).toEqual([{label:'Read more',destinationUrl:'https://example.test/path?a=1&b=2'}]);
  expect(normalizeAuthoredContent(normalized)).toEqual(normalized);
  const legacy={emailBody:'<p>Hello</p><p>{{physical_address}}</p><a href="{{unsubscribe_url}}">Opt out</a>'};
  expect(normalizeAuthoredContent(legacy).emailBody).toBe(legacy.emailBody);
});

test('[CAMP-006] local scheduling resolves in store zone, defaults to local day end, and rejects gaps and folds including non-hour transitions',()=>{
  const parse=(timezone:string,localScheduledAt:string)=>draftCompositionSchema.safeParse({steps:[{channel:'email',timezone,localScheduledAt,whyThisTime:'Selected'}]});
  for(const [zone,local] of [['America/New_York','2031-03-09T02:30'],['America/New_York','2031-11-02T01:30'],['Australia/Lord_Howe','2031-10-05T02:15'],['Australia/Lord_Howe','2031-04-06T01:45'],['Pacific/Apia','2011-12-30T12:00']])expect(parse(zone,local).success,zone+local).toBe(false);
  const valid=parse('Asia/Kathmandu','2031-04-07T10:00');expect(valid.success).toBe(true);
  if(valid.success){expect(valid.data.steps![0].scheduledAt).toBe('2031-04-07T04:15:00.000Z');expect(valid.data.steps![0].sendByAt).toBe('2031-04-07T18:14:00.000Z');}
  expect(parse('+05:30','2031-04-07T10:00').success).toBe(false);
  expect(parse('Not/A_Zone','2031-04-07T10:00').success).toBe(false);
  expect(draftCompositionSchema.safeParse({steps:[{channel:'email',timezone:'America/New_York',scheduledAt:'2031-11-02T05:30:00.000Z',sendByAt:'2031-11-02T22:00:00.000Z',whyThisTime:'Explicit legacy instant'}]}).success).toBe(true);
  expect(draftCompositionSchema.safeParse({steps:[{channel:'email',timezone:'Asia/Kathmandu',localScheduledAt:'2031-04-07T10:00',scheduledAt:'2031-04-07T05:00:00.000Z',whyThisTime:'Mismatch'}]}).success).toBe(false);
});

test('[CAMP-003] generated plain text preserves opaque fallback markup, ampersands and quotes',()=>{
  const token=`{{displayName | fallback: '<strong>Friend & "guest"</strong>'}}`;
  const normalized=normalizeAuthoredContent({emailBody:`<p>Hello ${token}</p>`});
  expect(normalized.emailText).toContain(token);
  expect(normalized.links).toEqual([]);
  const rendered=renderMessageContent({emailSubject:'Hello',preheader:'',smsBody:'',physicalAddress:'1 Test St',emailBody:normalized.emailBody!,emailText:normalized.emailText!},{unsubscribeUrl:'https://example.test/unsubscribe'});
  expect(rendered.html).toContain('Hello &lt;strong&gt;Friend &amp; &quot;guest&quot;&lt;/strong&gt;');
  expect(rendered.text).toContain('Hello <strong>Friend & "guest"</strong>');
  const embedded=normalizeAuthoredContent({emailBody:`<p>{{name | fallback: '<a href="https://example.test/inside">Friend</a>'}}</p>`});
  expect(embedded.links).toEqual([]);expect(embedded.emailText).toContain('<a href="https://example.test/inside">Friend</a>');
});

test('[CAMP-002][CAMP-003] empty contains and in authoring conditions remain incomplete, never a broad audience',()=>{
  for(const [comparator,value] of [['contains',''],['in',['']],['in',[]]]) {
    const inclusionRuleJson=JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator,value}]});
    expect(createDraftSchema.safeParse({composition:{inclusionRuleJson}}).success).toBe(false);
  }
});

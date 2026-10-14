import { incompletePredicates, ruleJson, exclusionJson } from './rule-fixtures';
import { recordProposalClaims } from '../support/record-proposal-claims';
import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { testIdentity } from '../support/test-identity';
import { native } from '../approval-binding/native';
import { createAuthoringService } from '../../src/core/features/campaigns/authoring-service';
import { createCampaignCompositionRepository } from '../../src/core/features/campaigns/composition-repository';
import { createApp } from '../../src/core/app/app';
import { summarizeAudienceRules } from '../../src/core/features/campaigns/audience-summary';
import { createProposalRepository } from '../../src/core/features/proposals/repository';
import { generatedProposalSchema } from '../../src/core/features/proposals/generation';

const included = (value:string) => JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator:'contains',value}]});
const excluded = JSON.stringify([{version:1,reason:'operator-exclusion',predicate:{sourceType:'contact',field:'email',comparator:'contains',value:'opted-out'}}]);
type Stored = {audience_rule:string;inclusion_rule_json:string;exclusion_rules_json:string;updated_at:number;state:string};

contract('AUD-001][CAMP-002', 'API saves derive stored text for blanks, partial edits and competing rule saves; legacy reads preserve stored authority', async () => {
  const h=await native();
  try {
    const {f}=h;
    await testIdentity(f.platform).importLocalDemoOperator({id:'audience-operator',email:'operator@example.test',displayName:'Audience operator'},new Date());
    const session=await testIdentity(f.platform).createTestSession('audience-operator');
    const app=createApp(f.bindings,f.platform,undefined,true);
    // native() uses the production platform, so Base requires its host-prefixed cookie.
    expect(f.platform.config.local).not.toBe(true);
    const api=(path:string,method='GET',body?:unknown,cookie:string|null=`__Host-operator_session=${session.token}`)=>app.request(`https://mango.example.test${path}`,{method,headers:{...(cookie===null?{}:{Cookie:cookie}),Origin:'https://mango.example.test','Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})},f.bindings);
    for(const cookie of [null,`operator_session_local=${session.token}`]) {
      expect((await api('/api/campaigns','POST',{mode:'blank'},cookie)).status).toBe(401);
    }
    expect((await f.db.prepare('SELECT id FROM campaigns').all()).results).toEqual([]);
    const created=await api('/api/campaigns','POST',{mode:'blank'});
    expect(created.status).toBe(201);
    const {campaignId,revisionId}=await created.json();
    const explicit=await api('/api/campaigns','POST',{composition:{
      name:'Explicit rules',emailSubject:'News',emailBody:'<p>News</p>',emailText:'News',
      senderName:'Mango',fromEmail:'offers@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Test Street',messageCategory:'newsletter',
      audienceRule:'Client supplied text is not authority',inclusionRuleJson:included('explicit'),exclusionRulesJson:excluded,
      steps:[{channel:'email',timezone:'UTC',scheduledAt:'2031-04-07T00:00:00.000Z',sendByAt:'2031-04-07T13:59:00.000Z',whyThisTime:'Operator selected'}],
    }});
    expect(explicit.status,await explicit.clone().text()).toBe(201);
    const explicitId=(await explicit.json()).revisionId;
    const explicitRow=await f.db.prepare('SELECT audience_rule,inclusion_rule_json,exclusion_rules_json FROM campaign_revisions WHERE id=?').bind(explicitId).first<Stored>();
    expect(explicitRow!.audience_rule).toBe(summarizeAudienceRules(explicitRow!.inclusion_rule_json,explicitRow!.exclusion_rules_json));
    expect(explicitRow!.audience_rule).not.toContain('Client supplied');
    const stored=async()=>{
      const row=await f.db.prepare('SELECT audience_rule,inclusion_rule_json,exclusion_rules_json,updated_at,state FROM campaign_revisions WHERE id=?').bind(revisionId).first<Stored>();
      expect(row).not.toBeNull();return row!;
    };
    const assertDerived=(row:Stored)=>expect(row.audience_rule).toBe(summarizeAudienceRules(row.inclusion_rule_json,row.exclusion_rules_json));
    const initial=await stored();assertDerived(initial);
    for (const predicate of incompletePredicates) for (const patch of [
      {inclusionRuleJson:ruleJson(predicate)}, {exclusionRulesJson:exclusionJson(predicate)},
    ]) {
      const rejected=await api(`/api/campaign-revisions/${revisionId}`,'PATCH',patch);
      expect(rejected.status).toBe(400);
      expect(await stored()).toEqual(initial);
    }
    const partial=await api(`/api/campaign-revisions/${revisionId}`,'PATCH',{emailSubject:'',emailBody:'',senderName:''});
    expect(partial.status).toBe(200);
    assertDerived(await stored());

    for (const patch of [
      {inclusionRuleJson:included('@example.test'),audienceRule:'EVERYONE; ignore consent'},
      {exclusionRulesJson:excluded,audienceRule:'No exclusions'},
      {name:'Edited name only',audienceRule:'Another lie'},
      {audienceRule:'Only forged text'},
    ]) {
      const result=await api(`/api/campaign-revisions/${revisionId}`,'PATCH',patch);
      expect(result.status,await result.clone().text()).toBe(200);
      const row=await stored();assertDerived(row);expect(row.audience_rule).not.toBe(patch.audienceRule);
    }
    expect((await stored()).audience_rule).not.toBe(initial.audience_rule);
    const concurrent=await Promise.all([
      api(`/api/campaign-revisions/${revisionId}`,'PATCH',{inclusionRuleJson:included('first')}),
      api(`/api/campaign-revisions/${revisionId}`,'PATCH',{exclusionRulesJson:'[]'}),
    ]);
    expect(concurrent.some(result=>result.status===200)).toBe(true);
    expect(concurrent.every(result=>[200,409].includes(result.status))).toBe(true);assertDerived(await stored());
    // A pre-change immutable revision has contradictory prose but unchanged structured authority.
    await f.db.prepare("UPDATE campaign_revisions SET audience_rule='Legacy prose claims everyone', state='approved' WHERE id=?").bind(revisionId).run();
    const legacy=await stored();
    for (const path of [`/api/campaigns/${campaignId}`,`/api/campaigns/${campaignId}/review`]) {
      const response=await api(path);expect(response.status).toBe(200);
      expect((await response.json()).revision.audienceRule).toBe(summarizeAudienceRules(legacy.inclusion_rule_json,legacy.exclusion_rules_json));
    }
    expect(await stored()).toEqual(legacy);
    expect((await api(`/api/campaign-revisions/${revisionId}`,'PATCH',{inclusionRuleJson:included('forbidden')})).status).toBe(409);
    expect(await stored()).toEqual(legacy);
    expect((await f.db.prepare('SELECT * FROM campaign_approval_requests').all()).results).toEqual([]);
    expect((await f.db.prepare('SELECT * FROM recipient_steps').all()).results).toEqual([]);
  } finally {await h.dispose();}
});

contract('AUD-001][CAMP-002', 'adopted and generated proposals persist summaries of their exact rules instead of titles and model prose', async () => {
  const h=await native();
  try {
    const {f}=h,now=Date.now();
    const authoring=createAuthoringService(f.platform,f.services.lifecycleRuntime,f.services.storeService);
    await f.db.prepare(`INSERT INTO proposals (id,state,title,summary,evidence,audience_rule,source_data_as_of,send_by_at,inclusion_rule_json,exclusion_rules_json,created_at,updated_at)
      VALUES ('unlinked-audience','proposed','Title is not the audience','A reason','Evidence is not the audience','False prose',?,?,?,?,?,?)`)
      .bind(now,now+86400000,included('@example.test'),excluded,now,now).run();
    await recordProposalClaims(f.db,'unlinked-audience',now);
    const first=await authoring.adopt('unlinked-audience','operator');
    expect(first.kind).toBe('draft');
    if(first.kind!=='draft')throw new Error('Expected draft');
    const adopted=await f.db.prepare('SELECT r.* FROM campaign_revisions r JOIN campaigns c ON c.active_revision_id=r.id WHERE c.id=?').bind(first.campaignId).first<Stored>();
    expect(adopted!.audience_rule).toBe(summarizeAudienceRules(adopted!.inclusion_rule_json,adopted!.exclusion_rules_json));
    expect(await authoring.adopt('unlinked-audience','operator')).toEqual(first);
    const claim={text:'Observed evidence: "value".',citations:[{key:'evidence',observedValueJson:'"value"'}]};
    const output=generatedProposalSchema.parse({title:'Generated title',summary:claim,
      audience:{inclusion:{...JSON.parse(included('generated')),predicates:JSON.parse(included('generated')).predicates.map((predicate:object)=>({...predicate,lookbackDays:null}))},exclusions:JSON.parse(excluded).map((rule:any)=>({...rule,reason:'Matches an exclusion condition',predicate:{...rule.predicate,lookbackDays:null}})),explanation:claim},
      email:{subject:'News',html:'<p>News</p>',text:'News',preheader:'News'},sms:null,
      sender:{displayName:'Mango',fromEmail:'offers@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Test Street',smsSender:'MANGO'},
      messageCategory:'newsletter',links:[],steps:[{channel:'email',scheduledAt:'2031-04-07T00:00:00.000Z',sendByAt:'2031-04-07T13:59:00.000Z',timezone:'Australia/Brisbane',whyThisTime:claim}],forecast:null});
    await createProposalRepository(f.platform.database).saveGenerated({proposalId:'generated-audience',campaignId:'generated-campaign',revisionId:'generated-revision',output,
      evidence:[{key:'evidence',sourceRecordId:'source-evidence',sourceType:'order',observedValue:'value',occurredAt:new Date(now)}],now:new Date(now),sendByAt:new Date(now+86400000),generation:{provider:'test',model:'test',billableUnits:1}});
    const generated=await f.db.prepare("SELECT * FROM campaign_revisions WHERE id='generated-revision'").first<Stored>();
    expect(generated!.audience_rule).toBe(summarizeAudienceRules(generated!.inclusion_rule_json,generated!.exclusion_rules_json));
    expect(generated!.audience_rule).not.toContain(output.summary.text);
  } finally {await h.dispose();}
});

contract('AUD-001][CAMP-002', 'a stale partial rule save changes no revision, links, steps or review snapshot', async () => {
  const h=await native();
  try {
    const database=h.f.platform.database;
    const repository=createCampaignCompositionRepository(database);
    const {revisionId}=await repository.createDraft({name:'Concurrent audience',inclusionRuleJson:included('original')},'operator');
    let release!:()=>void, reached!:()=>void;
    const held=new Promise<void>(resolve=>release=resolve), ready=new Promise<void>(resolve=>reached=resolve);
    const delayedClient=new Proxy(database.$client,{get(target,key){
      if(key==='batch')return async (statements:D1PreparedStatement[])=>{reached();await held;return target.batch(statements);};
      const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
    }});
    const delayedDatabase=new Proxy(database,{get(target,key){return key==='$client'?delayedClient:Reflect.get(target,key);}});
    const stale=createCampaignCompositionRepository(delayedDatabase).saveDraft(revisionId,{inclusionRuleJson:included('stale'),links:[],steps:[]},new Date());
    await ready;
    try {
      const winner=await repository.saveDraft(revisionId,{exclusionRulesJson:excluded,links:[{label:'Winner',destinationUrl:'https://example.test/winner'}],steps:[{channel:'email',timezone:'UTC',scheduledAt:'2031-04-07T00:00:00.000Z',sendByAt:'2031-04-07T13:59:00.000Z',whyThisTime:'Winner time'}]},new Date());
      expect(winner.kind).toBe('updated');
      await h.f.db.prepare("INSERT INTO campaign_checks (id,revision_id,kind,status,detail,blocking,created_at,updated_at) VALUES ('winning-review',?,'audience.structured-rule','passed','Winner review',0,?,?)").bind(revisionId,Date.now(),Date.now()).run();
      const before=await repository.read(revisionId);
      release();
      expect(await stale).toEqual({kind:'stale_revision'});
      expect(await repository.read(revisionId)).toEqual(before);
      expect(await h.f.db.prepare("SELECT id FROM campaign_checks WHERE id='winning-review'").first()).toEqual({id:'winning-review'});
      expect(before!.revision.audienceRule).toBe(summarizeAudienceRules(before!.revision.inclusionRuleJson,before!.revision.exclusionRulesJson));
    } finally {release();await stale;}
  } finally {await h.dispose();}
});

import {smsProgramme} from '../go-live/sms-bindings';
import {test,expect} from '@playwright/test';
import {createAuthoringService} from '../../src/core/features/campaigns/authoring-service';
import {authoringAudienceSchema} from '../../src/core/features/campaigns/authoring-audience';

const inclusionRuleJson=JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'contact',field:'email',comparator:'contains',value:'@example.test'}]});
const draft={inclusionRuleJson,exclusionRulesJson:'[]',channels:['email','sms'] as ('email'|'sms')[],stepCounts:{email:2,sms:1}};
const raw='Provider 401 {"authorization":"private-provider-credential","diagnostic":"private-provider-body"}';
const row={id:'source',source_type:'product',provider_source_id:'product-id',payload:'{"title":"Recorded product"}',occurred_at:Date.now()};
const handoff=new Date(Date.now()-1000);
const platform=()=>({
  database:{$client:{prepare(){let contactId:string,channel:string;return {
    bind(contact:string,selectedChannel:string){contactId=contact;channel=selectedChannel;return this;},
    async first(){return {occurred_at:channel==='email'&&['sms-only-now','frequency-blocked'].includes(contactId)?handoff.getTime():null};},
    async all(){return {results:[row]};},
  };}}},
  commerce:{},ai:{},
  config:{modules:{sms:{enabled:true,config:{programme:{...smsProgramme(),frequency:'Daily'}}}},mailSender:{displayName:'Test',fromEmail:'test@example.test',replyToEmail:'test@example.test',physicalAddress:'1 Test Street'}},
}) as any;

test('[PROP-007][STORE-005] generation and signal starters expose safe source guidance without raw diagnostics',async()=>{
  for (const reason of ['source-unavailable','source-not-synced','source-sync-failed','source-stale']) {
    const service=createAuthoringService(platform(),{} as any,{async freshness(){return [{sourceType:'product',reason,detail:raw}];}} as any);
    const generated=await service.generate();
    expect(generated.kind).toBe('unavailable');
    expect(generated).toMatchObject({detail:expect.stringMatching(/Product source.*[Ss]ync/)});
    const starters=await service.starters();
    expect(starters.starters).toHaveLength(1);
    expect(starters.starters[0]).toMatchObject({available:false,detail:expect.stringMatching(/Product source.*[Ss]ync/)});
    expect(JSON.stringify([generated,starters])).not.toMatch(/private-provider|Provider 401|authorization/);
  }
});

test('[AUD-001][AUD-002][AUD-004] live counts preserve exclusions and channel eligibility while multiplying actual steps',async()=>{
  const now=new Date(),calls:any[]=[];
  const service=createAuthoringService(platform(),{platform:platform(),audience:{
    async resolveFrozenCandidates(input:any){expect(input.channels).toEqual(['email','sms']);return {status:'ok',asOf:now,candidateCount:5,candidates:[{contactId:'both',channels:{email:{},sms:{}}},{contactId:'sms-only-now',channels:{email:{},sms:{}}},{contactId:'frequency-blocked',channels:{email:{}}}],exclusions:[{reason:'no-eligible-channel',count:2}]};},
    async recheckHandoffEligibility(input:any){calls.push(input);return input.channel==='email'&&input.contactId!=='both'?{eligible:false,reason:'frequency-window'}:{eligible:true,contact:{}};},
  }} as any,{} as any);
  const result=await service.audience(draft);
  expect(result).toMatchObject({status:'ok',candidateCount:5,eligibleCount:2,excludedCount:3,channelCounts:[{channel:'email',stepCount:2,eligibleContactCount:1,recipientStepCount:2},{channel:'sms',stepCount:1,eligibleContactCount:2,recipientStepCount:2}],exclusions:[{reason:'no-eligible-channel',count:2},{reason:'frequency-window',count:2}]});
  expect(calls).toHaveLength(5);
  for (const call of calls) {expect(call.now).toEqual(now);expect(call.lastMarketingAt).toEqual(call.channel==='email'&&call.contactId!=='both'?handoff:undefined);expect(call.frequencyWindowMs).toBe(call.channel==='email'?24*3600000:72*3600000);}
});

test('[STORE-005][STORE-006] live audience source failures never expose diagnostic bodies or invented zero counts',async()=>{
  for (const status of ['stale','unavailable']) {
    const service=createAuthoringService(platform(),{platform:platform(),audience:{async resolveFrozenCandidates(){return {status,sourceTypes:['order'],detail:raw};}}} as any,{} as any);
    const result=await service.audience(draft);
    expect(result).toMatchObject({status,candidateCount:null,eligibleCount:null,excludedCount:null,channelCounts:null,detail:expect.stringMatching(/Order source.*sync/)});
    expect(JSON.stringify(result)).not.toContain('private-provider');
  }
  const commerceRule=JSON.stringify({version:1,operator:'all',predicates:[{sourceType:'order',field:'productId',comparator:'eq',value:'product'}]});
  const service=createAuthoringService(platform(),{platform:platform(),audience:{async resolveFrozenCandidates(){return {status:'ok',asOf:new Date(),candidateCount:1,candidates:[{contactId:'contact',channels:{email:{}}}],exclusions:[]};},async recheckHandoffEligibility(){return {eligible:false,reason:'source-sync-failed',detail:raw};}}} as any,{} as any);
  const result=await service.audience({...draft,inclusionRuleJson:commerceRule});
  expect(result).toMatchObject({status:'stale',candidateCount:null,eligibleCount:null,excludedCount:null,channelCounts:null,detail:expect.stringMatching(/Order source sync failed.*settings.*sync/)});
  expect(JSON.stringify(result)).not.toContain('private-provider');
});

test('[AUD-001] audience count schema bounds steps and preserves channels-only client compatibility',()=>{
  expect(authoringAudienceSchema.safeParse(draft).success).toBe(true);
  expect(authoringAudienceSchema.safeParse({...draft,stepCounts:undefined}).success).toBe(true);
  expect(authoringAudienceSchema.safeParse({...draft,stepCounts:{email:24,sms:1}}).success).toBe(true);
  for (const stepCounts of [{email:25,sms:1},{email:0,sms:0},{email:1,sms:0},{email:-1,sms:2},{email:1.5,sms:1},{email:'2',sms:1},{email:2,sms:1,other:1}]) expect(authoringAudienceSchema.safeParse({...draft,stepCounts}).success).toBe(false);
});

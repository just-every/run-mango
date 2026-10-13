import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { native, rows } from '../approval-binding/native';
import { draft } from '../sender-verification/test-runtime';
import { createCampaignCompositionRepository } from '../../src/core/features/campaigns/composition-repository';
import { createAuthoringService } from '../../src/core/features/campaigns/authoring-service';
import { createProposalRepository } from '../../src/core/features/proposals/repository';
import { createProposalService } from '../../src/core/features/proposals/service';
import { adoptProposal } from '../../src/core/features/campaigns/adopt-proposal';
import { summarizeAudienceRules } from '../../src/core/features/campaigns/audience-summary';
import { generatedProposalSchema } from '../../src/core/features/proposals/generation';
import { incompletePredicates, subscribed, ruleJson, exclusionJson, generatedOutput } from './rule-fixtures';

contract('AUD-001][CAMP-002', 'approval blocks incomplete legacy rules and preserves exact raw approval authority through derived reads', async () => {
  const h=await native(), {f}=h;
  try {
    await f.prove();
    const campaign=await draft(f);
    for (const predicate of incompletePredicates) for (const exclusion of [false,true]) {
      await f.db.prepare('UPDATE campaign_revisions SET inclusion_rule_json=?,exclusion_rules_json=? WHERE id=?')
        .bind(exclusion?ruleJson(subscribed):ruleJson(predicate),exclusion?exclusionJson(predicate):'[]',campaign.revisionId).run();
      const revisions=await rows(f.db,'campaign_revisions'), jobs=f.jobs.length;
      const preview=await f.lifecycle.approval.preview(campaign);
      expect(preview.kind).toBe('preview');
      if(preview.kind!=='preview')throw new Error('Expected preview');
      expect(preview.sourceStatus).toBe('unavailable');
      expect(preview.candidateCount).toBeNull();
      const result=await f.lifecycle.approval.approve(campaign);
      expect(result.kind).toBe('blocked');
      if(result.kind!=='blocked')throw new Error('Expected blocked approval');
      expect(result.blockers).toEqual(expect.arrayContaining([expect.objectContaining({kind:'audience.structured-rule',blocking:true})]));
      expect(await rows(f.db,'campaign_revisions')).toBe(revisions);
      expect(await rows(f.db,'campaign_approval_requests')).toBe('[]');
      expect(await rows(f.db,'recipient_steps')).toBe('[]');
      expect(f.jobs).toHaveLength(jobs);
    }
    await f.db.prepare("UPDATE campaign_revisions SET inclusion_rule_json=?,exclusion_rules_json='[]',audience_rule='Legacy prose claims everyone' WHERE id=?")
      .bind(ruleJson(subscribed),campaign.revisionId).run();
    const result=await f.lifecycle.approval.approve(campaign);
    expect(result.kind).toBe('approved');
    if(result.kind!=='approved')throw new Error('Expected valid approval');
    const revisions=await rows(f.db,'campaign_revisions'), approvals=await rows(f.db,'campaign_approval_requests');
    const rawBefore=await f.lifecycle.repository.readRevisionSnapshot(campaign.campaignId,campaign.revisionId);
    expect(rawBefore!.revision.audienceRule).toBe('Legacy prose claims everyone');
    const projected=await createCampaignCompositionRepository(f.platform.database).read(campaign.revisionId);
    expect(projected!.revision.audienceRule).toBe(summarizeAudienceRules(ruleJson(subscribed),'[]'));
    expect(await f.lifecycle.repository.readRevisionSnapshot(campaign.campaignId,campaign.revisionId)).toEqual(rawBefore);
    expect(await f.lifecycle.repository.approvedRevision(campaign.campaignId,campaign.revisionId)).toBe(result.revisionDigest);
    expect(await f.lifecycle.repository.hasSenderApprovalAuthority(campaign.campaignId,campaign.revisionId)).toBe(true);
    expect(await f.lifecycle.approval.approve(campaign)).toEqual({kind:'approved',revisionDigest:result.revisionDigest,idempotent:true});
    expect(await rows(f.db,'campaign_revisions')).toBe(revisions);
    expect(await rows(f.db,'campaign_approval_requests')).toBe(approvals);
  } finally {await h.dispose();}
});

contract('AUD-001][CAMP-002', 'native proposal adoption and generation reject incomplete rules without creating campaigns', async () => {
  const h=await native(), {f}=h;
  try {
    const authoring=createAuthoringService(f.platform,f.services.lifecycleRuntime,f.services.storeService);
    const repository=createProposalRepository(f.platform.database), now=new Date();
    const evidence=[{key:'evidence',sourceRecordId:'source-evidence',sourceType:'order',observedValue:'value',occurredAt:now}];
    for (const [index,predicate] of incompletePredicates.entries()) for (const exclusion of [false,true]) {
      const id=`incomplete-${index}-${exclusion}`;
      const inclusion=exclusion?ruleJson(subscribed):ruleJson(predicate), exclusions=exclusion?exclusionJson(predicate):'[]';
      await f.db.prepare(`INSERT INTO proposals (id,state,title,summary,evidence,audience_rule,source_data_as_of,send_by_at,inclusion_rule_json,exclusion_rules_json,created_at,updated_at)
        VALUES (?,'proposed','Incomplete audience','Reason','Evidence','Plausible prose',?,?,?,?,?,?)`)
        .bind(id,now.getTime(),now.getTime()+86400000,inclusion,exclusions,now.getTime(),now.getTime()).run();
      expect((await authoring.adopt(id,'operator')).kind).toBe('unavailable');
      expect(await f.db.prepare('SELECT campaign_id FROM proposals WHERE id=?').bind(id).first()).toEqual({campaign_id:null});
      const output=generatedProposalSchema.parse(generatedOutput());
      output.audience.inclusion=JSON.parse(inclusion);output.audience.exclusions=JSON.parse(exclusions);
      await expect(repository.saveGenerated({proposalId:`direct-${id}`,campaignId:`campaign-${id}`,revisionId:`revision-${id}`,output,evidence,now,sendByAt:new Date(now.getTime()+86400000),generation:{provider:'test',model:'test',billableUnits:1}})).rejects.toThrow();
      // The test adapter supplies invalid model output; production validation and D1 remain real.
      const service=createProposalService(repository,{async generateGroundedJson(){return {output,provider:'openai',model:'test',billableUnits:1};}});
      const generated=await service.generate({evidence,configuredKnowledge:[],now,sendByAt:new Date(now.getTime()+86400000)});
      expect(generated).toMatchObject({kind:'failed',error:'invalid_ai_output'});
      expect(await f.db.prepare('SELECT state,generation_error,campaign_id FROM proposals WHERE id=?').bind(generated.proposalId).first())
        .toEqual({state:'failed',generation_error:'invalid_ai_output',campaign_id:null});
    }
    expect(await rows(f.db,'campaigns')).toBe('[]');
    expect(await rows(f.db,'campaign_revisions')).toBe('[]');
    expect(await rows(f.db,'campaign_approval_requests')).toBe('[]');
    expect(await rows(f.db,'recipient_steps')).toBe('[]');
  } finally {await h.dispose();}
});

contract('AUD-001][CAMP-002', 'proposal adoption fences a rule change between validation and its transaction', async () => {
  const h=await native(), {f}=h;
  try {
    const now=Date.now();
    await f.db.prepare(`INSERT INTO proposals (id,state,title,summary,evidence,audience_rule,source_data_as_of,send_by_at,inclusion_rule_json,exclusion_rules_json,created_at,updated_at)
      VALUES ('racing-proposal','proposed','A title','A reason','Evidence','Old prose',?,?,?,'[]',?,?)`)
      .bind(now,now+86400000,ruleJson(subscribed),now,now).run();
    const database=f.platform.database;
    const client=new Proxy(database.$client,{get(target,key){
      if(key==='batch')return async (statements:D1PreparedStatement[])=>{
        await target.prepare('UPDATE proposals SET inclusion_rule_json=? WHERE id=?').bind(ruleJson(incompletePredicates[0]),'racing-proposal').run();
        return target.batch(statements);
      };
      const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
    }});
    const racedDatabase=new Proxy(database,{get(target,key){return key==='$client'?client:Reflect.get(target,key);}});
    expect((await adoptProposal(racedDatabase,'racing-proposal','operator',{senderName:'Mango',fromEmail:'offers@example.test',replyToEmail:'reply@example.test',physicalAddress:'1 Test Street'})).kind).toBe('unavailable');
    expect(await f.db.prepare("SELECT campaign_id,inclusion_rule_json FROM proposals WHERE id='racing-proposal'").first())
      .toEqual({campaign_id:null,inclusion_rule_json:ruleJson(incompletePredicates[0])});
    for (const table of ['campaigns','campaign_revisions','campaign_steps','campaign_state_transitions']) expect(await rows(f.db,table)).toBe('[]');
  } finally {await h.dispose();}
});

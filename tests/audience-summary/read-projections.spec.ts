import { expect } from '@playwright/test';
import { contract } from '../contract.js';
import { native, rows } from '../approval-binding/native';
import { draft } from '../sender-verification/test-runtime';
import { summarizeAudienceRules } from '../../src/core/features/campaigns/audience-summary';
import { createAuthoringService } from '../../src/core/features/campaigns/authoring-service';
import { ruleJson, subscribed, exclusionJson } from './rule-fixtures';

contract('AUD-001][CAMP-002', 'campaign lists expose invalid legacy defaults and preserve approval authority through derived reads', async () => {
  const h = await native(), {f} = h;
  try {
    await f.prove();
    const campaign = await draft(f);
    const now = Date.now();
    await f.db.prepare("INSERT INTO campaigns (id,state,created_at,updated_at) VALUES ('no-revision','draft',?,?)").bind(now,now).run();
    const included = ruleJson(subscribed);
    const excluded = exclusionJson({sourceType:'contact',field:'email',comparator:'contains',value:'excluded'});
    for (const [inclusion, exclusions] of [['','[]'], ['{','[]'], [included,'']]) {
      await f.db.prepare("UPDATE campaign_revisions SET audience_rule='Legacy prose claims everyone',inclusion_rule_json=?,exclusion_rules_json=? WHERE id=?")
        .bind(inclusion, exclusions, campaign.revisionId).run();
      const before = await rows(f.db, 'campaign_revisions');
      const jobs = f.jobs.length;
      const list = await f.services.campaignService.listCampaigns();
      expect(list.campaigns.find(row => row.id === 'no-revision')!.audienceSummary).toBe('');
      expect(list.campaigns.find(row => row.id === campaign.campaignId)!.audienceSummary)
        .toBe('Audience rules are invalid. Review the conditions before approval.');
      const approval = await f.lifecycle.approval.approve(campaign);
      expect(approval.kind).toBe('blocked');
      if (approval.kind !== 'blocked') throw new Error('Expected invalid rules to block approval');
      expect(approval.blockers).toEqual(expect.arrayContaining([expect.objectContaining({kind:'audience.structured-rule',blocking:true})]));
      expect(await rows(f.db,'campaign_revisions')).toBe(before);
      expect(await rows(f.db,'campaign_approval_requests')).toBe('[]');
      expect(await rows(f.db,'recipient_steps')).toBe('[]');
      expect(f.jobs).toHaveLength(jobs);
    }
    await f.db.prepare('UPDATE campaign_revisions SET inclusion_rule_json=?,exclusion_rules_json=? WHERE id=?')
      .bind(included, excluded, campaign.revisionId).run();
    const approved = await f.lifecycle.approval.approve(campaign);
    expect(approved.kind).toBe('approved');
    if (approved.kind !== 'approved') throw new Error('Expected valid rules to approve');
    const before = await rows(f.db,'campaign_revisions'), approvals = await rows(f.db,'campaign_approval_requests');
    const snapshotTables = ['campaign_audiences', 'campaign_audience_channel_counts', 'recipient_steps'];
    const snapshots = await Promise.all(snapshotTables.map(table => rows(f.db,table)));
    const list = await f.services.campaignService.listCampaigns();
    expect(list.campaigns.find(row => row.id === campaign.campaignId)!.audienceSummary).toBe(summarizeAudienceRules(included,excluded));
    expect(await f.lifecycle.repository.approvedRevision(campaign.campaignId,campaign.revisionId)).toBe(approved.revisionDigest);
    expect(await f.lifecycle.approval.approve(campaign)).toEqual({kind:'approved',revisionDigest:approved.revisionDigest,idempotent:true});
    expect(await rows(f.db,'campaign_revisions')).toBe(before);
    expect(await rows(f.db,'campaign_approval_requests')).toBe(approvals);
    expect(await Promise.all(snapshotTables.map(table => rows(f.db,table)))).toEqual(snapshots);
  } finally { await h.dispose(); }
});

contract('AUD-001][CAMP-002', 'Decision Desk and proposal detail project stored rules without rewriting legacy proposals', async () => {
  const h = await native(), {f} = h;
  try {
    const now = Date.now();
    // Omitting structured columns exercises the original migration's empty-string default.
    await f.db.prepare(`INSERT INTO proposals (id,state,title,summary,evidence,audience_rule,source_data_as_of,send_by_at,created_at,updated_at)
      VALUES ('legacy-proposal','proposed','Title','Reason','Evidence','Everyone',?,?,?,?)`).bind(now,now+86400000,now,now).run();
    await f.db.prepare(`INSERT INTO proposal_audiences VALUES ('proposal-snapshot','legacy-proposal',?,3,1,2,?,?)`).bind(now,now,now).run();
    await f.db.prepare(`INSERT INTO proposal_audience_channel_counts VALUES ('proposal-count','proposal-snapshot','email',2,?,?)`).bind(now,now).run();
    await f.db.prepare(`INSERT INTO proposal_steps VALUES ('proposal-step','legacy-proposal',1,'email',?,'UTC',?,?,?)`).bind(now+3600000,now+86400000,now,now).run();
    await f.db.prepare(`INSERT INTO proposal_exclusions VALUES ('proposal-exclusion','legacy-proposal','unsubscribed',1,?,?)`).bind(now,now).run();
    const snapshotTables = ['proposal_audiences','proposal_audience_channel_counts','proposal_steps','proposal_exclusions'];
    const snapshots = await Promise.all(snapshotTables.map(table => rows(f.db,table)));
    const included = ruleJson(subscribed), excluded = exclusionJson({sourceType:'contact',field:'email',comparator:'contains',value:'excluded'});
    for (const rules of [null, {included,excluded}]) {
      if (rules) await f.db.prepare('UPDATE proposals SET inclusion_rule_json=?,exclusion_rules_json=? WHERE id=?')
        .bind(rules.included,rules.excluded,'legacy-proposal').run();
      const before = await rows(f.db,'proposals');
      const detail = await f.services.campaignService.proposalDetail('legacy-proposal');
      const desk = await f.services.campaignService.decisionDesk();
      for (const entry of [detail, desk.proposals.find(entry => entry.proposal.id === 'legacy-proposal')]) {
        expect(entry!.proposal.audienceRule).toBe(summarizeAudienceRules(rules?.included ?? '',rules?.excluded ?? '[]'));
        expect(entry!.proposal.inclusionRuleJson).toBe(rules?.included ?? '');
        expect(entry!.proposal.exclusionRulesJson).toBe(rules?.excluded ?? '[]');
        expect(entry!.audience).toMatchObject({candidateCount:3,excludedCount:1,eligibleCount:2});
        expect(entry!.audienceChannelCounts).toEqual([expect.objectContaining({channel:'email',recipientStepCount:2})]);
        expect(entry!.exclusions).toEqual([expect.objectContaining({reason:'unsubscribed',count:1})]);
      }
      if (!rules) {
        const authoring = createAuthoringService(f.platform,f.services.lifecycleRuntime,f.services.storeService);
        expect((await authoring.adopt('legacy-proposal','operator')).kind).toBe('unavailable');
      }
      expect(await rows(f.db,'proposals')).toBe(before);
      expect(await rows(f.db,'campaigns')).toBe('[]');
      expect(await rows(f.db,'campaign_approval_requests')).toBe('[]');
      expect(await Promise.all(snapshotTables.map(table => rows(f.db,table)))).toEqual(snapshots);
    }
  } finally { await h.dispose(); }
});

contract('AUD-001][CAMP-002', 'proposal adoption rejects empty stored exclusions without changing any authority or snapshot', async () => {
  const h = await native(), {f} = h;
  try {
    const now = Date.now();
    await f.db.prepare(`INSERT INTO proposals (id,state,title,summary,evidence,audience_rule,inclusion_rule_json,exclusion_rules_json,source_data_as_of,send_by_at,created_at,updated_at)
      VALUES ('empty-exclusions','proposed','Title','Reason','Evidence','Plausible prose',?,'',?,?,?,?)`)
      .bind(ruleJson(subscribed),now,now+86400000,now,now).run();
    const tables = ['proposals','proposal_audiences','proposal_audience_channel_counts','campaigns','campaign_revisions','campaign_steps','campaign_state_transitions','campaign_approval_requests','recipient_steps'];
    const before = await Promise.all(tables.map(table => rows(f.db,table)));
    const authoring = createAuthoringService(f.platform,f.services.lifecycleRuntime,f.services.storeService);
    expect((await authoring.adopt('empty-exclusions','operator')).kind).toBe('unavailable');
    expect(await Promise.all(tables.map(table => rows(f.db,table)))).toEqual(before);
    expect(f.jobs).toHaveLength(0);
  } finally { await h.dispose(); }
});

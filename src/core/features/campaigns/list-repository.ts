import type { Database } from '@/core/platform/db/client';
import { campaignStates, type CampaignFilters } from './result-model';

type ListRow = {
  id:string; proposalId:string|null; state:string; activeRevisionId:string|null; cancelledAt:number|null;
  createdAt:number; updatedAt:number; name:string|null; inclusionRuleJson:string|null; exclusionRulesJson:string|null;
  channels:string; nextScheduledAt:number|null; lastOutcomeAt:number|null; lastOutcome:string|null; lastSkipReason:string|null;
};
export function createCampaignListRepository(database: Database) {
  return async (filters: CampaignFilters = {}, now = new Date()) => {
    const rows = await database.$client.prepare(`SELECT c.id, c.proposal_id proposalId, c.state,
      c.active_revision_id activeRevisionId, c.cancelled_at cancelledAt, c.created_at createdAt, c.updated_at updatedAt,
      v.name, v.inclusion_rule_json inclusionRuleJson, v.exclusion_rules_json exclusionRulesJson,
      COALESCE((SELECT group_concat(DISTINCT s.channel) FROM campaign_steps s WHERE s.revision_id = c.active_revision_id), (SELECT group_concat(DISTINCT json_extract(j.value,'$.channel')) FROM campaign_draft_step_settings p,json_each(p.settings_json) j WHERE p.revision_id=c.active_revision_id), '') channels,
      (SELECT MIN(s.scheduled_at) FROM campaign_steps s WHERE s.revision_id = c.active_revision_id
        AND s.send_by_at > ? AND c.state IN ('scheduled','dispatching','paused')
        AND ((NOT EXISTS (SELECT 1 FROM step_dispatches d WHERE d.step_id=s.id AND d.revision_id=s.revision_id)
          AND NOT EXISTS (SELECT 1 FROM recipient_steps r WHERE r.campaign_id=c.id AND r.revision_id=s.revision_id AND r.step_id=s.id))
          OR EXISTS (SELECT 1 FROM recipient_steps r WHERE r.campaign_id=c.id AND r.revision_id=s.revision_id AND r.step_id=s.id
            AND r.transport_disposition='queued' AND r.handoff_started_at IS NULL AND r.send_by_at > ?))) nextScheduledAt,
      (SELECT MAX(r.updated_at) FROM recipient_steps r WHERE r.campaign_id = c.id AND r.revision_id = c.active_revision_id
        AND r.transport_disposition <> 'queued') lastOutcomeAt
      , (SELECT r.transport_disposition FROM recipient_steps r WHERE r.campaign_id = c.id AND r.revision_id = c.active_revision_id
        AND r.transport_disposition <> 'queued' ORDER BY r.updated_at DESC, r.id DESC LIMIT 1) lastOutcome
      , (SELECT r.skip_reason FROM recipient_steps r WHERE r.campaign_id = c.id AND r.revision_id = c.active_revision_id
        AND r.transport_disposition <> 'queued' ORDER BY r.updated_at DESC, r.id DESC LIMIT 1) lastSkipReason
      FROM campaigns c LEFT JOIN campaign_revisions v ON v.id = c.active_revision_id ORDER BY c.updated_at DESC, c.id`)
      .bind(now.getTime(), now.getTime()).all<ListRow>();
    // The collection is deliberately unpaged: facets and combined filters cover every persisted campaign.
    const all = rows.results.map(row => ({...row, channels:row.channels ? row.channels.split(',').sort() as ('email'|'sms')[] : [],
      createdAt:new Date(row.createdAt).toISOString(), updatedAt:new Date(row.updatedAt).toISOString(),
      cancelledAt:row.cancelledAt === null ? null : new Date(row.cancelledAt).toISOString(),
      nextScheduledAt:row.nextScheduledAt === null ? null : new Date(row.nextScheduledAt).toISOString(),
      lastOutcomeAt:row.lastOutcomeAt === null ? null : new Date(row.lastOutcomeAt).toISOString(),
    }));
    const matchesState = (row:typeof all[number]) => !filters.state || row.state === filters.state;
    const matchesChannel = (row:typeof all[number]) => !filters.channel || row.channels.includes(filters.channel);
    return { campaigns:all.filter(row => matchesState(row) && matchesChannel(row)), total:all.length,
      counts:{ allStates:all.filter(matchesChannel).length, allChannels:all.filter(matchesState).length,
        states:Object.fromEntries(campaignStates.map(state => [state, all.filter(row => matchesChannel(row) && row.state === state).length])),
        channels:{email:all.filter(row => matchesState(row) && row.channels.includes('email')).length,
          sms:all.filter(row => matchesState(row) && row.channels.includes('sms')).length} },
    };
  };
}

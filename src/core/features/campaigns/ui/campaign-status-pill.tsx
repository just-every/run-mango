import { campaignStateLabel } from '../result-model';
import type { CampaignResults } from '../result-model';

export function CampaignStatusPill({ state, results, lastOutcome }: { state: string; results?: CampaignResults; lastOutcome?: string | null }) {
  const sent = results?.steps.some(step => step.state === 'Sent') ?? ['handed-off', 'accepted', 'delivered', 'bounced'].includes(lastOutcome ?? '');
  return <span className={`status-pill status-pill--${state}`}>{state === 'completed' && sent ? 'Sent' : campaignStateLabel(state)}</span>;
}

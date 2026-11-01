import { Link } from '@tanstack/react-router';
import { titleCase } from '@/core/app/client/lib/format';
import type { CampaignListEntry, SourceSync } from '@/core/app/client/lib/types';
import { SignupRefusalAlert } from '@/core/features/audience/ui/signup-refusal-report';
import { usePermissions } from '@/core/features/auth/ui/permissions';
import { SenderRenewalCard } from '@/core/features/sender-verification/ui/renewal-card';
import { SendingConnectionAlert } from '@/core/features/sending/alert';
import { pausedCampaigns } from './desk-work-model';
import type { SourceCapabilities } from './source-freshness';

function PausedLine({ campaigns }: { campaigns: CampaignListEntry[] }) {
  const paused = pausedCampaigns(campaigns);
  if (!paused.length) return null;
  const [first] = paused;
  return <section className="notice-warning desk-attention__line" aria-label="Paused campaigns">
    <div className="desk-attention__row">
      <span>{paused.length === 1 ? `${first.name ?? 'Untitled campaign'} is paused.` : `${paused.length} campaigns are paused.`}</span>
      <span className="desk-attention__actions">
        {paused.length === 1
          ? <Link className="text-link" to="/app/campaigns/$id" params={{ id: first.id }} aria-label={`Review ${first.name ?? 'Untitled campaign'}`}>Review</Link>
          : <Link className="text-link" to="/app/campaigns" search={{ state: 'paused' }} aria-label="Review paused campaigns">Review</Link>}
      </span>
    </div>
  </section>;
}

function StoreSyncLine({ sources, capabilities }: { sources: SourceSync[]; capabilities: SourceCapabilities }) {
  const { can } = usePermissions();
  const unavailable = new Set(capabilities.filter(capability => !capability.available).map(capability => capability.sourceType));
  const failed = sources.filter(source => source.lastError !== null && !unavailable.has(source.sourceType)).map(source => titleCase(source.sourceType));
  if (!failed.length) return null;
  const named = failed.length === 1 ? failed[0] : failed.length === 2 ? `${failed[0]} and ${failed[1]}` : `${failed[0]} and ${failed.length - 1} more`;
  return <div className="inline-error desk-attention__line" role="alert" aria-label="Store sync">
    <div className="desk-attention__row">
      <span>Store sync failed: {named}.</span>
      {can('integration.manage') ? <span className="desk-attention__actions"><Link className="text-link" to="/app/store">Manage sync</Link></span> : null}
    </div>
  </div>;
}

/** Urgent facts, one line each and only when they hold, above the work: nothing renders when nothing is urgent. */
export function DeskAttention({ campaigns, sources, capabilities, store }: { campaigns?: CampaignListEntry[]; sources?: SourceSync[]; capabilities: SourceCapabilities; store: boolean }) {
  return <div className="desk-attention">
    <SendingConnectionAlert />
    <SenderRenewalCard />
    {campaigns ? <PausedLine campaigns={campaigns} /> : null}
    {store && sources ? <StoreSyncLine sources={sources} capabilities={capabilities} /> : null}
    <SignupRefusalAlert />
  </div>;
}

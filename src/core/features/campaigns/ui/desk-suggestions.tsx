import type { DecisionDesk } from '@/core/app/client/lib/types';
import { capabilityName, capabilityNextStep } from '@/core/app/client/ui/product-copy';
import { ProposalDetail } from './proposal-detail';
import { ProposalQueue } from './proposal-queue';

/** Suggestions, below the work: today's queue and detail, or one quiet line when AI is on and there are none. */
export function DeskSuggestions({ desk, ai, selectedId, onSelect, onDismiss }: {
  desk: DecisionDesk; ai: boolean; selectedId?: string; onSelect: (id: string) => void; onDismiss: () => void;
}) {
  const entry = desk.proposals.find(candidate => candidate.proposal.id === selectedId);
  if (entry && selectedId) {
    return <section className="desk-suggestions" aria-label="Suggestions">
      <div className="decision-desk__proposals">
        <ProposalQueue proposals={desk.proposals} selectedId={selectedId} onSelect={onSelect} />
        <ProposalDetail key={entry.proposal.id} entry={entry} onDismiss={onDismiss} />
      </div>
    </section>;
  }
  if (!ai) return null;
  const missing = desk.sourceStatus.providers.filter(provider => !provider.configured);
  return <section className="desk-suggestions" aria-label="Suggestions">
    <p className="desk-suggestions__line" role="status">No suggestions right now.</p>
    {missing.length ? <ul className="capability-list">
      {missing.map(provider => <li key={provider.id}><strong>{capabilityName(provider.adapter)}:</strong> {capabilityNextStep(provider.adapter)}</li>)}
    </ul> : null}
  </section>;
}

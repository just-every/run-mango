import type { ProposalEntry } from '@/core/app/client/lib/types';

export function ProposalQueue({
  proposals,
  selectedId,
  onSelect,
}: {
  proposals: ProposalEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="proposal-queue panel" aria-labelledby="proposal-queue-title">
      <p className="eyebrow">Proposals</p>
      <h2 id="proposal-queue-title">Campaign suggestions</h2>
      <p className="muted-copy">Policy proposal.selection.v1: expected revenue first when own history and currency are comparable, then earliest send-by.</p>
      <div className="proposal-queue__items">
        {proposals.map((entry, index) => {
          const selected = entry.proposal.id === selectedId;
          return (
            <button
              className={selected ? 'proposal-queue__item is-selected' : 'proposal-queue__item'}
              data-proposal-id={entry.proposal.id}
              key={entry.proposal.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect(entry.proposal.id)}
            >
              <span>#{index+1} {entry.proposal.title}</span>
              <small>{entry.forecast?.status==='available'?`${entry.forecast.currency} ${((entry.forecast.valueMinor??0)/100).toFixed(2)} expected`:'Insufficient attribution history'}</small>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

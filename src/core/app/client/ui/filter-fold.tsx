import { useId, useState, type ReactNode } from 'react';

export type AppliedFilter = {key: string; label: string};

/** Filters fold behind one control; what is applied stays visible as chips, each one removable. */
export function FilterFold({applied, onRemove, children}: {applied: AppliedFilter[]; onRemove: (key: string) => void; children: (close: () => void) => ReactNode}) {
  const [open, setOpen] = useState(false), id = useId();
  return <div className="filter-fold">
    <div className="filter-fold__bar">
      <button type="button" className="secondary-action filter-fold__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>Filters{applied.length ? <span className="filter-fold__count">{applied.length}</span> : null}</button>
      {applied.length ? <ul className="filter-chips" aria-label="Applied filters">{applied.map(filter => <li key={filter.key} className="filter-chip">{filter.label}<button type="button" aria-label={`Remove filter ${filter.label}`} onClick={() => onRemove(filter.key)}>×</button></li>)}</ul> : null}
    </div>
    <div id={id} className="filter-fold__panel" hidden={!open}>{children(() => setOpen(false))}</div>
  </div>;
}

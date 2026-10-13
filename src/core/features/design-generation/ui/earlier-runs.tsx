import { useState, type ReactNode } from 'react';
import { designsOnOffer, type DesignJobView } from '../model';

/** Earlier runs whose paid designs are still on offer (DESIGN-002), under the latest run. A new run never sets them
 * aside: they stay in view with their own Use this design buttons, and the operator may fold them away. */
export function EarlierRuns({ runs, children }: { runs: DesignJobView[]; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const designs = runs.reduce((count, run) => count + designsOnOffer(run).length, 0);
  return <details className="design-earlier" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>Earlier designs <span className="muted-copy">({designs} from {runs.length === 1 ? 'an earlier run' : `${runs.length} earlier runs`})</span></summary>
    <div className="design-earlier__runs">{children}</div>
  </details>;
}

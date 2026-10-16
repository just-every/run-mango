import { useCallback, useContext, useEffect, useState } from 'react';
import { ResourceSnapshot } from '@/core/app/client/lib/resource-snapshot';
import { requestJson } from '@/core/app/client/lib/api';
import { designsOnOffer, workingStates, type DesignGenerationStatus, type DesignJobView } from '../model';

const pollMs = 3000;
const open = (job?: DesignJobView): job is DesignJobView => Boolean(job && !['applied', 'discarded'].includes(job.state));

/** The draft's design runs, read from Mango and re-read while Mango waits on 12ui, so runs survive a reload and their
 * candidates appear as they land. `runs` is the latest run (while it is open) and then every earlier run whose paid
 * designs are still on offer, newest first. */
export function useDesignStatus(campaignId: string) {
  const snapshot = useContext(ResourceSnapshot);
  const initial = snapshot[`/api/campaigns/${encodeURIComponent(campaignId)}/design-jobs`] as DesignGenerationStatus | undefined;
  const [status, setStatus] = useState<DesignGenerationStatus | undefined>(initial);
  const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    try {
      const response = await requestJson<DesignGenerationStatus>(`/api/campaigns/${encodeURIComponent(campaignId)}/design-jobs`);
      if (response.status >= 400) throw new Error();
      setStatus(response.data); setError(undefined);
    } catch { setError('Mango could not read this draft\'s design runs. Reload the page to try again.'); }
  }, [campaignId]);
  useEffect(() => { if (initial) setStatus(initial); else void load(); }, [load, initial]);
  const runs = [status?.job, ...status?.earlier ?? []].filter(open);
  const working = runs.some(run => workingStates.includes(run.state));
  useEffect(() => {
    if (!working) return;
    const timer = setInterval(() => void load(), pollMs);
    return () => clearInterval(timer);
  }, [working, load]);
  /** Shows a run as an operator's request left it; a run Mango just started becomes the latest, and the one it
   * follows stays on offer with the earlier runs. */
  const setJob = (job: DesignJobView) => setStatus(current => {
    if (!current) return current;
    if (!current.job || current.job.id === job.id) return { ...current, job };
    if (current.earlier?.some(run => run.id === job.id)) return { ...current, earlier: current.earlier.map(run => run.id === job.id ? job : run) };
    return { ...current, job, earlier: [current.job, ...current.earlier ?? []].filter(run => designsOnOffer(run).length > 0) };
  });
  return { enabled: Boolean(status?.enabled), runs, working, error, reload: load, setJob };
}

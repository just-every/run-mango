import { useState } from 'react';

import type { ImportJob } from './audience-import-types';

type AudienceImportJobsProps = {
  jobs: ImportJob[];
  loading: boolean;
  error?: string;
  busyJobId?: string;
  onRefresh: () => void;
  onResume: (id: string) => void;
  onUndo: (id: string) => void;
  onAbandon: (id: string) => void;
};

function canResume(job: ImportJob) {
  return ['queued', 'applying', 'failed', 'undoing', 'rolling_back'].includes(job.state);
}

function canUndo(job: ImportJob) {
  return job.state === 'completed';
}

// A stopped import can be abandoned until its rollback starts; a large import's pages reverse
// through undo, so its recorded abandonment names those states.
function canAbandon(job: ImportJob) {
  return ['queued', 'applying', 'failed'].includes(job.state) && !job.abandonedAt;
}

function stateLabel(job: ImportJob) {
  if (job.abandonedAt || job.state === 'rolling_back' || job.state === 'rolled_back') return ['undone', 'rolled_back'].includes(job.state) ? 'abandoned' : 'abandoning';
  return job.state.replaceAll('_', ' ');
}

function actionLabel(job: ImportJob) {
  if (stateLabel(job) === 'abandoning') return 'Continue abandoning';
  return job.state === 'undoing' ? 'Continue undo' : job.state === 'failed' ? 'Retry incomplete import' : 'Resume import';
}

const rowCount = (count = 0) => `${count} row${count === 1 ? '' : 's'}`;

/** What Abandon did: its counts once it finished, and "Rolling back…" only while it is still rolling back. */
export function abandonOutcome(job: ImportJob) {
  return ['undone', 'rolled_back'].includes(job.state)
    ? `${rowCount(job.rolledBack)} rolled back, ${job.kept ?? 0} kept because people changed them. Opt-outs and suppressions stay.`
    : `Rolling back… ${rowCount(job.rolledBack)} rolled back so far. Continue abandoning to roll back the rest.`;
}

export const abandonNotice = (job: ImportJob) => ['undone', 'rolled_back'].includes(job.state) ? `Import abandoned: ${abandonOutcome(job)}` : abandonOutcome(job);

const dateTime = (value: number) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value);

export function AudienceImportJobs({ jobs, loading, error, busyJobId, onRefresh, onResume, onUndo, onAbandon }: AudienceImportJobsProps) {
  const [confirming, setConfirming] = useState<{ id: string; action: 'undo' | 'abandon' }>();

  return (
    <section className="panel audience-import-jobs" aria-labelledby="import-jobs-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Saved import activity</p>
          <h2 id="import-jobs-title">Imports</h2>
        </div>
        <button className="secondary-action" type="button" onClick={onRefresh} disabled={loading || Boolean(busyJobId)}>
          {loading ? 'Refreshing…' : 'Refresh imports'}
        </button>
      </div>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      {loading && !jobs.length ? <p className="muted-copy">Loading saved imports…</p> : null}
      {!loading && !jobs.length && !error ? <p className="muted-copy">No imports have been recorded for this audience.</p> : null}
      <ul className="audience-import-job-list">
        {jobs.map((job) => {
          const progress = job.total > 0 ? Math.min(job.checkpoint, job.total) : 0;
          const confirmingAction = confirming?.id === job.id ? confirming.action : undefined;
          const busy = busyJobId === job.id;
          const label = stateLabel(job);
          return (
            <li className="audience-import-job" key={job.id}>
              <div className="audience-import-job__heading">
                <div>
                  <span className={`audience-import-status audience-import-status--${job.state === 'completed' ? 'good' : job.state === 'failed' ? 'alert' : job.state === 'undone' || job.state === 'rolled_back' ? 'neutral' : 'pending'}`}>{label}</span>
                  <code>{job.id}</code>
                </div>
                <strong>{progress} of {job.total} rows</strong>
              </div>
              <progress max={job.total || 1} value={progress} aria-label={`Import ${job.id}: ${progress} of ${job.total} rows`} />
              {job.error ? <p className="inline-error" role="alert">{job.error}</p> : null}
              {job.abandonedAt ? <p className="muted-copy">{label === 'abandoned' ? 'Abandoned' : 'Abandon started'} {dateTime(job.abandonedAt)}{job.abandonedBy ? ` by ${job.abandonedBy}` : ''}. {abandonOutcome(job)}</p> : null}
              {confirmingAction === 'undo' ? (
                <div className="audience-import-undo-confirm notice-warning" role="group" aria-label={`Confirm undo for import ${job.id}`}>
                  <p>Undo this import now? If a contact changed afterward, the server will keep that change and explain the conflict. Later opt-outs and suppressions remain intact.</p>
                  <button className="danger-action" type="button" onClick={() => { setConfirming(undefined); onUndo(job.id); }} disabled={busy}>Confirm undo</button>
                  <button className="secondary-action" type="button" onClick={() => setConfirming(undefined)} disabled={busy}>Keep import</button>
                </div>
              ) : confirmingAction === 'abandon' ? (
                <div className="audience-import-undo-confirm notice-warning" role="group" aria-label={`Confirm abandon for import ${job.id}`}>
                  <p>Abandon this unfinished import? Mango rolls back the {progress} rows it wrote: contacts it created are removed and contacts that were already here get their earlier details back. A contact a person changed since is kept as it is now. Opt-outs and suppressions stay.</p>
                  <button className="danger-action" type="button" onClick={() => { setConfirming(undefined); onAbandon(job.id); }} disabled={busy}>Confirm abandon</button>
                  <button className="secondary-action" type="button" onClick={() => setConfirming(undefined)} disabled={busy}>Keep import</button>
                </div>
              ) : (
                <div className="audience-import-job__actions">
                  {canResume(job) ? <button className="secondary-action" type="button" onClick={() => onResume(job.id)} disabled={Boolean(busyJobId)}>{busy ? 'Working…' : actionLabel(job)}</button> : null}
                  {canUndo(job) ? <button className="danger-action--line" type="button" onClick={() => setConfirming({ id: job.id, action: 'undo' })} disabled={Boolean(busyJobId)}>Undo import</button> : null}
                  {canAbandon(job) ? <button className="danger-action--line" type="button" onClick={() => setConfirming({ id: job.id, action: 'abandon' })} disabled={Boolean(busyJobId)}>Abandon import</button> : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

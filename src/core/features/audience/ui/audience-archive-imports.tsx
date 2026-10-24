import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { requestJson } from '@/core/app/client/lib/api';
import type { ArchiveContentRow, ArchiveImport } from './archive-client';

type Props = { archives: ArchiveImport[]; busyId?: string; actionsBusy?: boolean; onUndo: (id: string) => void; onContinue: (id: string) => void };
const tone = (state: ArchiveImport['state']) => state === 'applied' ? 'good' : state === 'undone' ? 'neutral' : 'pending';

function ArchiveContent({ archive }: { archive: ArchiveImport }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ArchiveContentRow[]>();
  const [error, setError] = useState<string>();
  const [copying, setCopying] = useState<string>();
  const load = async () => {
    const response = await requestJson<{ content?: ArchiveContentRow[] }>(`/api/audience/archives/${encodeURIComponent(archive.id)}`);
    if (response.status >= 300 || !response.data.content) { setError('The imported history could not be loaded.'); return; }
    setRows(response.data.content);
  };
  const copy = async (id: string) => {
    setCopying(id); setError(undefined);
    const response = await requestJson<{ campaignId?: string; detail?: string }>(`/api/imported-history/${encodeURIComponent(id)}/copy`, { method: 'POST' });
    setCopying(undefined);
    if (response.status >= 300 || !response.data.campaignId) { setError(response.data.detail ?? 'The draft could not be created.'); return; }
    await navigate({ to: '/app/campaigns/$id', params: { id: response.data.campaignId } });
  };
  if (!rows) return <button className="secondary-action" type="button" onClick={() => void load()}>Show imported history and templates</button>;
  return (
    <div className="table-scroll audience-import-table-scroll" tabIndex={0} role="region" aria-label={`Imported history and templates from ${archive.name}`}>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      <table className="responsive-table audience-import-table">
        <caption className="visually-hidden">Imported history records are read-only source records; templates start independent drafts</caption>
        <thead><tr><th scope="col">Record</th><th scope="col">Sent (as the source states it)</th><th scope="col">State</th><th scope="col">Action</th></tr></thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              <td data-label="Record"><strong>{row.title}</strong><small>{row.kind === 'history' ? `Imported history · ${row.subject || 'No subject stated'}` : row.campaign_id ? 'Imported draft' : 'Library template'}</small>
                {JSON.parse(row.merge_tags_json).length ? <small>Unrecognised merge tags: {(JSON.parse(row.merge_tags_json) as string[]).join(', ')}</small> : null}</td>
              <td data-label="Sent">{row.kind === 'history' ? row.sent_at_source || 'Not stated' : '—'}</td>
              <td data-label="State"><span className={`audience-import-status audience-import-status--${row.state === 'imported' ? 'good' : 'neutral'}`}>{row.state}</span>{row.outcome ? <small>{row.outcome}</small> : null}</td>
              <td data-label="Action">
                {row.kind === 'history' && row.state === 'imported' ? <button className="secondary-action" type="button" disabled={Boolean(copying)} onClick={() => void copy(row.id)}>{copying === row.id ? 'Copying…' : 'Copy into a new draft'}</button> : null}
                {row.kind === 'draft' && !row.campaign_id && !row.outcome && row.state === 'imported' ? <p>Available in the template library under New campaign.</p> : null}
                {row.kind === 'draft' && row.campaign_id && row.state !== 'removed' ? <a className="secondary-action" href={`/app/campaigns/${row.campaign_id}`}>Open draft</a> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Each archive move-in: progress, its reconciliation report, imported history and undo. */
export function AudienceArchiveImports({ archives, busyId, actionsBusy = false, onUndo, onContinue }: Props) {
  const [confirming, setConfirming] = useState<string>();
  if (!archives.length) return null;
  return (
    <section className="panel audience-import-jobs" aria-labelledby="archive-imports-title">
      <div className="section-heading"><div><p className="eyebrow">Account exports</p><h2 id="archive-imports-title">Archive imports</h2></div></div>
      <ul className="audience-import-job-list">
        {archives.map(archive => {
          const contacts = archive.progress.audience;
          const done = archive.progress.contentDone + (contacts ? Math.min(contacts.checkpoint, contacts.total) : 0);
          const total = archive.progress.contentTotal + (contacts?.total ?? 0);
          const busy = busyId === archive.id;
          return (
            <li className="audience-import-job" key={archive.id}>
              <div className="audience-import-job__heading">
                <div><span className={`audience-import-status audience-import-status--${tone(archive.state)}`}>{archive.state}</span><strong>{archive.name}</strong></div>
                <span>{done} of {total} records</span>
              </div>
              {archive.state === 'applying' || archive.state === 'undoing' ? <progress max={total || 1} value={done} aria-label={`Archive ${archive.name}: ${done} of ${total}`} /> : null}
              {archive.summary.engagement?<p>Imported engagement: {archive.summary.engagement.imported} imported, {archive.summary.engagement.dropped} dropped. Opens are estimates.</p>:null}
              {archive.undo ? <p className="muted-copy">Undo removed {archive.undo.contacts.removed} unchanged contacts and kept {archive.undo.contacts.kept.length}; opt-outs and suppressions stay. The report lists every kept contact and template with its reason.</p> : null}
              {confirming === archive.id ? (
                <div className="audience-import-undo-confirm notice-warning" role="group" aria-label={`Confirm undo for ${archive.name}`}>
                  <p>Undo this import? Unchanged imported contacts, templates and history records are removed. Anything edited, unsubscribed, suppressed, scheduled or sent since is kept and listed. Opt-outs, suppressions and send history are never erased.</p>
                  <button className="danger-action" type="button" disabled={actionsBusy} onClick={() => { setConfirming(undefined); onUndo(archive.id); }}>Confirm undo</button>
                  <button className="secondary-action" type="button" disabled={actionsBusy} onClick={() => setConfirming(undefined)}>Keep import</button>
                </div>
              ) : (
                <div className="audience-import-job__actions">
                  <a className="secondary-action" href={`/api/audience/archives/${encodeURIComponent(archive.id)}/report`} download>Download reconciliation report</a>
                  {archive.state === 'applying' || archive.state === 'undoing' ? <button className="secondary-action" type="button" disabled={actionsBusy} onClick={() => onContinue(archive.id)}>{busy ? 'Working…' : archive.state === 'undoing' ? 'Continue undo' : 'Continue import'}</button> : null}
                  {archive.state === 'applied' ? <button className="danger-action--line" type="button" disabled={actionsBusy} onClick={() => setConfirming(archive.id)}>Undo this import</button> : null}
                </div>
              )}
              {archive.state !== 'applying' ? <ArchiveContent archive={archive} key={`${archive.id}:${archive.state}`} /> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

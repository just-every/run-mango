import { useEffect, useState } from 'react';

import type { ImportPreview } from './audience-import-types';

const pageSize = 25;

function count(value: number) {
  return new Intl.NumberFormat().format(value);
}

// The ledger's tones: yes is leaf, a person's own opt-out is the quiet stopped tone, and a suppression or a rejected
// row is the alarm.
function statusClass(value: string) {
  if (value === 'subscribed' || value === 'created' || value === 'updated') return 'good';
  if (value === 'suppressed' || value === 'rejected') return 'alert';
  return 'neutral';
}

function titleCase(value: string) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const reviewedFields = [
  ['email', 'Email address'],
  ['phone', 'E.164 phone'], ['sms_status', 'SMS status'], ['sms_occurred_at', 'SMS original opt-in'], ['sms_confirmed_at', 'SMS confirmation'], ['sms_program', 'SMS programme'], ['sms_frequency', 'SMS frequency'], ['sms_jurisdiction', 'SMS jurisdiction'],
  ['status', 'Marketing status'],
  ['occurred_at', 'Original opt-in time'],
  ['confirmed_at', 'Confirmation time'],
  ['capture_ip', 'Opt-in IP'],
  ['confirmation_ip', 'Confirmation IP'],
] as const;

export function AudienceImportPreview({ preview, isCurrent }: { preview: ImportPreview; isCurrent: boolean }) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(preview.rows.length / pageSize));
  const visibleRows = preview.rows.slice(page * pageSize, (page + 1) * pageSize);

  useEffect(() => setPage(0), [preview.fingerprint]);

  return (
    <section className="audience-import-review" aria-labelledby="import-preview-title">
      <div className="panel audience-import-panel">
        <div className="audience-import-section-title">
          <span aria-hidden="true">4</span>
          <div>
            <p className="eyebrow">Review before applying</p>
            <h2 id="import-preview-title">Preview totals</h2>
          </div>
        </div>
        {!isCurrent ? <p className="unsaved-notice" role="status">This preview is out of date. Review the changed fields again before starting the import.</p> : null}
        {preview.warnings.length ? (
          <div className="audience-import-warnings notice-warning" role="status" aria-label="Import warnings">
            <p className="eyebrow">Review warnings</p>
            <ul>{preview.warnings.map((warning, index) => <li key={`${index}:${warning}`}>{warning}</li>)}</ul>
          </div>
        ) : null}
        <dl className="audience-import-stats">
          <div><dt>Created</dt><dd>{count(preview.counts.created)}</dd></div>
          <div><dt>Updated</dt><dd>{count(preview.counts.updated)}</dd></div>
          <div className={preview.counts.rejected ? 'audience-import-stat--alert' : undefined}><dt>Rejected</dt><dd>{count(preview.counts.rejected)}</dd></div>
          <div><dt>Unsubscribed</dt><dd>{count(preview.counts.unsubscribed)}</dd></div>
          <div className={preview.counts.suppressed ? 'audience-import-stat--alert' : undefined}><dt>Suppressed</dt><dd>{count(preview.counts.suppressed)}</dd></div>
        </dl>
        <section className="audience-import-mapped-review" aria-labelledby="mapped-source-title">
          <div>
            <p className="eyebrow">Consent and status fields</p>
            <h3 id="mapped-source-title">Mapped source columns</h3>
          </div>
          {preview.columns.map((column) => (
            <article className="audience-import-mapped-file" key={column.name}>
              <h4>{column.name}</h4>
              <dl>
                {reviewedFields.map(([field, label]) => (
                  <div key={field}>
                    <dt>{label}</dt>
                    <dd>{column.mapping[field] || 'Not mapped'}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </section>
        <div className="table-scroll audience-import-table-scroll" tabIndex={0} role="region" aria-label="CSV preview rows">
          <table className="responsive-table audience-import-table">
            <caption className="visually-hidden">Contact consent and status results from the CSV preview</caption>
            <thead>
              <tr>
                <th scope="col">File and row</th>
                <th scope="col">Contact</th>
                <th scope="col">Consent status</th>
                <th scope="col">Reason and warnings</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const status = row.reason ? 'rejected' : row.status;
                return (
                  <tr key={`${row.file}:${row.row}`}>
                    <td data-label="File and row"><span className="audience-import-row-file">{row.file}</span><small>Row {row.row}</small></td>
                    <td data-label="Contact">{row.optOut ? <><strong>Opt-out only</strong><small>No contact holds this address</small></> : <><strong>{row.displayName || row.email || row.phone}</strong><small>{[row.email,row.phone].filter(Boolean).join(' · ') || 'No valid destination'}</small></>}</td>
                    <td data-label="Consent status"><span className={`audience-import-status audience-import-status--${statusClass(status)}`}>{titleCase(status)}{row.phone ? ` · SMS: ${titleCase(row.smsStatus)}` : ''}</span></td>
                    <td data-label="Reason and warnings">
                      {row.reason ? <p className="audience-import-row-reason">{row.reason}</p> : null}
                      {row.warnings.length ? <ul className="audience-import-row-warnings">{row.warnings.map((warning, index) => <li key={`${index}:${warning}`}>{warning}</li>)}</ul> : null}
                      {!row.reason && !row.warnings.length ? <span className="muted-copy">No row warnings</span> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="audience-import-pagination">
          <p className="quiet-caption" aria-live="polite">
            {preview.rows.length ? `Showing rows ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, preview.rows.length)} of ${count(preview.rows.length)}.` : 'The preview contains no rows.'}
          </p>
          {pageCount > 1 ? (
            <div>
              <button className="secondary-action" type="button" onClick={() => setPage((current) => current - 1)} disabled={page === 0}>Previous rows</button>
              <span>Page {page + 1} of {pageCount}</span>
              <button className="secondary-action" type="button" onClick={() => setPage((current) => current + 1)} disabled={page + 1 >= pageCount}>Next rows</button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

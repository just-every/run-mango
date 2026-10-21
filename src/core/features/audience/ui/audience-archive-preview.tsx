import type { ArchivePreview } from './archive-client';

const count = (value: number) => new Intl.NumberFormat().format(value);
const plural = (value: number, one: string, many: string) => `${count(value)} ${value === 1 ? one : many}`;
const size = (bytes: number) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** The whole-archive dry run: per-file outcomes, content findings and what stays raw. Nothing is written. */
export function AudienceArchivePreview({ preview, isCurrent }: { preview: ArchivePreview; isCurrent: boolean }) {
  const { summary } = preview;
  const history = summary.records.filter(record => record.kind === 'history'), drafts = summary.records.filter(record => record.kind === 'draft');
  return (
    <section className="audience-import-review" aria-labelledby="archive-preview-title">
      <div className="panel audience-import-panel">
        <div className="audience-import-section-title">
          <span aria-hidden="true">3</span>
          <div>
            <p className="eyebrow">Review before applying</p>
            <h2 id="archive-preview-title">Whole-archive preview</h2>
          </div>
        </div>
        {!isCurrent ? <p className="unsaved-notice" role="status">This preview is out of date. Preview the archive again before importing it.</p> : null}
        {preview.alreadyImported ? <p className="action-notice" role="status">This archive was already imported with the same consent evidence. Importing it again changes nothing.</p> : null}
        <p className="muted-copy">{summary.archive.name}: {count(summary.archive.entries)} files, {size(summary.archive.size)}, SHA-256 <code>{summary.archive.sha256.slice(0, 16)}…</code>. Preview has written nothing.</p>

        <div className="table-scroll audience-import-table-scroll" tabIndex={0} role="region" aria-label="Audience files in the archive">
          <table className="responsive-table audience-import-table">
            <caption className="visually-hidden">Outcome of every audience file</caption>
            <thead><tr><th scope="col">Audience file</th><th scope="col">Rows</th><th scope="col">Created / updated</th><th scope="col">Duplicates</th><th scope="col">Rejected</th><th scope="col">Consent and status</th></tr></thead>
            <tbody>
              {summary.audience.map(file => (
                <tr key={file.path}>
                  <td data-label="Audience file"><span className="audience-import-row-file">{file.path}</span><small>Treated as {file.status}</small></td>
                  <td data-label="Rows">{count(file.rows)}</td>
                  <td data-label="Created / updated">{count(file.created)} / {count(file.updated)}</td>
                  <td data-label="Duplicates">{count(file.duplicatesWithin)} in this file, {count(file.duplicatesAcross)} across files</td>
                  <td data-label="Rejected">
                    {count(file.rejected)}
                    {file.error ? <p className="audience-import-row-reason">{file.error}</p> : null}
                    {file.rejectedRows.length ? <ul className="audience-import-row-warnings">{file.rejectedRows.slice(0, 5).map(item => <li key={item.row}>Row {item.row}: {item.reason}</li>)}</ul> : null}
                  </td>
                  <td data-label="Consent and status">
                    <small>{count(file.outcomes.subscribed)} subscribed, {count(file.unknownConsent)} unknown consent (imported as non-subscribed), {count(file.outcomes.unsubscribed)} unsubscribed, {count(file.outcomes.suppressed)} cleaned</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {summary.content.length ? (
          <div className="table-scroll audience-import-table-scroll" tabIndex={0} role="region" aria-label="Emails and templates in the archive">
            <table className="responsive-table audience-import-table">
              <caption className="visually-hidden">Emails become read-only imported history; templates become draft starters</caption>
              <thead><tr><th scope="col">Content file</th><th scope="col">Rows</th><th scope="col">Becomes</th><th scope="col">Duplicates</th><th scope="col">Rejected</th></tr></thead>
              <tbody>
                {summary.content.map(file => (
                  <tr key={file.path}>
                    <td data-label="Content file"><span className="audience-import-row-file">{file.path}</span></td>
                    <td data-label="Rows">{count(file.rows)}</td>
                    <td data-label="Becomes">{file.kind === 'emails' ? plural(file.created, 'imported history record', 'imported history records') : plural(file.created, 'draft starter', 'draft starters')}</td>
                    <td data-label="Duplicates">{count(file.duplicates)}</td>
                    <td data-label="Rejected">{count(file.rejected)}{file.rejectedRows.length ? <ul className="audience-import-row-warnings">{file.rejectedRows.map(item => <li key={item.row}>{item.reason}</li>)}</ul> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {[...history, ...drafts].some(record => record.removed.length || record.flagged.length || record.mergeTags.length) ? (
          <div className="audience-import-warnings notice-warning" role="status" aria-label="Content changes">
            <p className="eyebrow">Content changes and unrecognised merge tags</p>
            <ul>
              {[...history, ...drafts].filter(record => record.removed.length || record.flagged.length || record.mergeTags.length).map(record => (
                <li key={record.ordinal}>
                  <strong>{record.title}</strong>
                  {record.removed.length ? <> Removed: {record.removed.join('; ')}.</> : null}
                  {record.flagged.length ? <> Still blocked by the HTML policy: {record.flagged.join(' ')}</> : null}
                  {record.mergeTags.length ? <> Merge tags left as written; approval stays blocked until you replace them: {record.mergeTags.join(', ')}.</> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {summary.engagement?<div className="audience-import-mapped-review"><h3>Imported engagement</h3><p>{count(summary.engagement.imported)} imported, {count(summary.engagement.dropped)} dropped of {count(summary.engagement.rows)} rows. Opens are estimates; only clicks count as engagement.</p>{Object.entries(summary.engagement.reasons).map(([reason,total])=><p key={reason}>{reason}: {count(total)}</p>)}</div>:null}
        <section className="audience-import-mapped-review" aria-labelledby="archive-kept-title">
          <div>
            <p className="eyebrow">Never imported</p>
            <h3 id="archive-kept-title">Kept as raw source, not imported</h3>
          </div>
          <p className="muted-copy">Reports and “sent” figures stay source records only: they create no delivery, campaign or revenue numbers in Mango.</p>
          <dl className="audience-import-stats">
            {summary.kept.map(kind => <div key={kind.kind}><dt>{kind.label}</dt><dd>{plural(kind.files, 'file', 'files')}</dd></div>)}
          </dl>
        </section>
      </div>
    </section>
  );
}

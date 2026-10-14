import { useState } from 'react';

/** Only a successful CSV becomes a download; refusal stays visible on Audience. */
export function AudienceExport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function download() {
    setBusy(true); setError(undefined);
    try {
      const response = await fetch('/api/audience/export', { credentials: 'same-origin' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { detail?: string };
        setError(result.detail ?? 'The contacts CSV could not be created. No file was downloaded.');
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = 'audience.csv';
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('The contacts CSV could not be downloaded. Try again when the connection is available.');
    } finally { setBusy(false); }
  }
  return <div className={error ? 'audience-export audience-export--error' : 'audience-export'}>
    <button className="secondary-action" type="button" disabled={busy} onClick={() => void download()}>{busy ? 'Preparing CSV…' : 'Download contacts CSV'}</button>
    {error ? <div className="notice-warning audience-export__notice" role="alert"><p>{error}</p><a href="/docs/backup-and-export#export-and-restore-a-local-copy">Local backup and restore instructions</a></div> : null}
  </div>;
}

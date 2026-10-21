import { useState } from 'react';
import { Can } from '@/core/features/auth/ui/permissions';

export function CampaignExport() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  async function download() {
    setBusy(true); setError(undefined);
    try {
      const response = await fetch('/api/campaigns/export', { credentials: 'same-origin' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { detail?: string };
        setError(result.detail ?? 'The campaigns CSV could not be created. No file was downloaded.');
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.download = 'campaigns.csv';
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('The campaigns CSV could not be downloaded. Try again when the connection is available.');
    } finally { setBusy(false); }
  }
  return <Can permission="audience.export"><div className={error ? 'audience-export audience-export--error' : 'audience-export'}>
    <button className="secondary-action" type="button" disabled={busy} onClick={() => void download()}>{busy ? 'Preparing CSV…' : 'Export campaigns CSV'}</button>
    {error ? <div className="notice-warning audience-export__notice" role="alert"><p>{error}</p><a href="/docs/backup-and-export#export-and-restore-a-local-copy">Local backup and restore instructions</a></div> : null}
  </div></Can>;
}

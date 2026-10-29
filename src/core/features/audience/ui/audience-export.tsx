import {Can} from '@/core/features/auth/ui/permissions';
import { useState } from 'react';
import { useMenuNotice } from '@/core/app/client/ui/action-menu';

/** A refused export stays in the page's action menu, with the way to take a local copy instead. */
export function ExportRefusal({message}: {message: string}) {
  return <div className="notice-warning audience-export__notice" role="alert"><p>{message}</p><a href="/docs/backup-and-export#export-and-restore-a-local-copy">Local backup and restore instructions</a></div>;
}

/** Only a successful CSV becomes a download; refusal stays visible on Audience. */
function AudienceExportContent() {
  const [busy, setBusy] = useState(false);
  const report = useMenuNotice();
  const setError = (message?: string) => report(message ? <ExportRefusal message={message} /> : null);
  async function download() {
    setBusy(true); setError();
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
  return <button className="secondary-action" type="button" disabled={busy} onClick={() => void download()}>{busy ? 'Preparing CSV…' : 'Download contacts CSV'}</button>;
}

export function AudienceExport() {return <Can permission="audience.export"><AudienceExportContent/></Can>;}

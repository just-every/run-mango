import { useState } from 'react';
import { Can } from '@/core/features/auth/ui/permissions';
import { ExportRefusal } from '@/core/features/audience/ui/audience-export';
import { useMenuNotice } from '@/core/app/client/ui/action-menu';

export function CampaignExport() {
  const [busy, setBusy] = useState(false);
  const report = useMenuNotice();
  const setError = (message?: string) => report(message ? <ExportRefusal message={message} /> : null);
  async function download() {
    setBusy(true); setError();
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
  return <Can permission="audience.export"><button className="secondary-action" type="button" disabled={busy} onClick={() => void download()}>{busy ? 'Preparing CSV…' : 'Export campaigns CSV'}</button></Can>;
}

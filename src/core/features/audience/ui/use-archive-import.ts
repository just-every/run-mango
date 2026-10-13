import { useState } from 'react';

import { requestJson } from '@/core/app/client/lib/api';
import { useResource } from '@/core/app/client/lib/use-resource';
import { archiveActive, postArchive, type ArchiveImport, type ArchivePreview } from './archive-client';
import type { ImportConsent } from './audience-import-types';

type Messages = { setError: (value?: string) => void; setNotice: (value?: string) => void };
const message = (data: { detail?: string; error?: string }, fallback: string) => data.detail?.trim() || data.error?.replaceAll('_', ' ') || fallback;

/** Preview, import and undo of one account export; each step after the first is a bounded `continue`. */
export function useArchiveImport({ setError, setNotice }: Messages) {
  const archives = useResource<{ archives: ArchiveImport[] }>('/api/audience/archives');
  const [archive, setArchive] = useState<File>();
  const [preview, setPreview] = useState<ArchivePreview>();
  const [current, setCurrent] = useState(false);
  const [busy, setBusy] = useState<'preview' | 'start'>();
  const [busyId, setBusyId] = useState<string>();

  const drive = async (id: string, first: 'continue' | 'undo') => {
    setBusyId(id);
    try {
      let action = first;
      for (;;) {
        const response = await requestJson<{ archive?: ArchiveImport; detail?: string; error?: string }>(`/api/audience/archives/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
        if (response.status >= 300 || !response.data.archive) { setError(message(response.data, 'The archive step could not be completed. Continue it again from Archive imports.')); break; }
        const next = response.data.archive;
        const contacts = next.progress.audience;
        setNotice(archiveActive(next)
          ? `${next.state === 'undoing' ? 'Undoing' : 'Importing'} ${next.name}: ${next.progress.contentDone} of ${next.progress.contentTotal} history and draft records${contacts ? `, ${Math.min(contacts.checkpoint, contacts.total)} of ${contacts.total} contacts` : ''}.`
          : next.state === 'applied' ? `${next.name} is imported. Download the reconciliation report to check every row.` : `${next.name} is undone. The report lists what was removed and what was kept.`);
        if (!archiveActive(next)) break;
        action = 'continue';
      }
    } finally {
      setBusyId(undefined);
      await archives.reload();
    }
  };

  return {
    archives, archive, preview, current, busy, busyId,
    choose(file?: File) { setArchive(file); setPreview(undefined); setCurrent(false); },
    stale() { setCurrent(false); },
    async review(consent: ImportConsent) {
      if (!archive || busy) return;
      setBusy('preview'); setError(undefined); setNotice(undefined);
      try {
        const response = await postArchive<ArchivePreview>('/api/audience/archive-preview', archive, consent);
        if (response.status >= 300 || !response.data.fingerprint) { setCurrent(false); setError(message(response.data, 'The archive could not be reviewed.')); return; }
        setPreview(response.data); setCurrent(true);
        setNotice('Preview ready. Nothing has been imported or saved yet.');
      } catch { setCurrent(false); setError('The archive could not be read. Choose it again and retry.'); }
      finally { setBusy(undefined); }
    },
    async start(consent: ImportConsent) {
      if (!archive || !preview || !current || busy) return;
      setBusy('start'); setError(undefined); setNotice(undefined);
      try {
        const response = await postArchive<{ archive?: ArchiveImport; repeated?: boolean }>('/api/audience/archives', archive, consent, preview.fingerprint);
        if (response.status >= 300 || !response.data.archive) { if (response.status === 409) setCurrent(false); setError(message(response.data, 'The archive could not be imported. Preview it again before retrying.')); return; }
        if (response.data.repeated) { setNotice('This archive was already imported; nothing changed.'); await archives.reload(); return; }
        await drive(response.data.archive.id, 'continue');
      } catch { setError('The import result could not be confirmed. Check Archive imports before trying again.'); }
      finally { setBusy(undefined); }
    },
    undo: (id: string) => drive(id, 'undo'),
    resume: (id: string) => drive(id, 'continue'),
  };
}

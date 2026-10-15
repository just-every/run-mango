import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import type { SenderStatus } from '@/core/features/settings/types';

/** Mango's own receiving mailbox: one check to the signed-in operator, confirmed from that inbox. */
export function InboxCheck({ status, operatorEmail }: { status: SenderStatus; operatorEmail: string }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string }>();
  const confirmed = status.validation.ready;
  const send = async () => {
    setBusy(true); setNotice(undefined);
    try {
      const response = await requestJson<{ sentTo?: string; detail?: string }>('/api/settings/sender/confirmation', { method: 'POST', body: '{}' });
      setNotice(response.status === 202
        ? { kind: 'success', text: `Check sent to ${response.data.sentTo}. Open it and press “Yes, it reached my inbox”, then press Check again here.` }
        : { kind: 'error', text: response.data.detail ?? 'The check was not sent. Try again.' });
    } catch { setNotice({ kind: 'error', text: 'The result could not be confirmed. Press Check again before sending another.' }); }
    finally { setBusy(false); }
  };
  return (
    <div className="settings-validation settings-inbox-check" aria-labelledby="inbox-check-title">
      <p className="eyebrow">Inbox check</p>
      <h3 id="inbox-check-title">{confirmed ? 'Your sender is confirmed' : 'Confirm your sender from your inbox'}</h3>
      {status.canSendCheck ? <>
        <p>Mango sends one email from {status.identity.fromEmail} through your mail provider to {operatorEmail}. Open it and press <strong>Yes, it reached my inbox</strong>. Approval then works for 30 days, or until your provider or DNS records change.</p>
        <button type="button" className={confirmed ? 'secondary-action' : 'primary-action'} disabled={busy} onClick={() => void send()}>
          {busy ? 'Sending…' : confirmed ? 'Send a new check' : `Send the check to ${operatorEmail}`}
        </button>
      </> : <p>Finish the From domain’s authentication with your mail provider first. When Provider domain and DNS records both pass, you can send the check here.</p>}
      {notice ? <p className={notice.kind === 'success' ? 'action-notice' : 'inline-error'} role={notice.kind === 'success' ? 'status' : 'alert'}>{notice.text}</p> : null}
    </div>
  );
}

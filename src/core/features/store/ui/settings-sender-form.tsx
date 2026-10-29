import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { mapFieldErrors, type FieldErrors } from '@/core/app/client/ui/field-errors';
import { senderIdentitySchema, type SenderIdentity } from '@/core/features/settings/sender-validation';

const fields = [['displayName', 'Business display name', 'text', 200], ['fromEmail', 'From email', 'email', 254], ['replyToEmail', 'Reply-to email', 'email', 254]] as const;
/** `first` is first-run setup: nothing exists yet, so it asks the four fields and carries no explanation. */
export function SettingsSenderForm({identity, saved, first = false}: {identity: SenderIdentity; saved: () => Promise<unknown>; first?: boolean}) {
  const [draft, setDraft] = useState(identity), [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>(), [notice, setNotice] = useState<string>(), [errors, setErrors] = useState<FieldErrors>({});
  const check = (field: keyof SenderIdentity) => {const parsed = senderIdentitySchema.shape[field].safeParse(draft[field]); return parsed.success ? undefined : parsed.error.issues[0].message;};
  async function submit() {
    if (busy) return;
    setError(undefined); setNotice(undefined); setBusy(true);
    try {
      const response = await requestJson<{fields?: unknown}>('/api/settings/sender', {method: 'PUT', body: JSON.stringify(draft)});
      if (response.status === 401) {window.location.assign('/signin?reason=session-ended'); return;}
      if (response.status >= 400) {setErrors(mapFieldErrors(response.data.fields, [...fields.map(([key]) => key), 'physicalAddress'])); setError(response.status === 403 ? 'This request was denied. Refresh and sign in again.' : 'Sender details could not be saved. Check every field and try again.'); return;}
      setNotice(first ? 'Saved.' : 'Sender details saved. Changed details require a fresh sender check and updated campaign review.'); await saved();
    } catch {setError('Sender details could not be saved. Check your connection and try again.');}
    finally {setBusy(false);}
  }
  return <ValidationForm className="settings-sender-form" onValidSubmit={() => void submit()} serverErrors={errors} summary={!first} aria-busy={busy}>
    {first ? null : <p className="settings-sender-form__intro">Required for every email. Use your business identity and a complete physical postal address; Mango includes it in the managed footer.</p>}
    <fieldset disabled={busy}><legend className="sr-only">Business sender details</legend>
      {fields.map(([key, label, type, maxLength]) => <label key={key} className={`settings-field settings-field--${key}`} htmlFor={`sender-${key}`}>{label}<Field name={key} label={label} required validate={() => check(key)}><input id={`sender-${key}`} type={type} maxLength={maxLength} value={draft[key]} onChange={event => setDraft({...draft, [key]: event.target.value})} /></Field></label>)}
      <div className="settings-postal-field"><label htmlFor="sender-postal">Physical postal address</label><Field name="physicalAddress" label="Physical postal address" required validate={() => check('physicalAddress')}><textarea id="sender-postal" minLength={5} maxLength={500} rows={3} value={draft.physicalAddress} onChange={event => setDraft({...draft, physicalAddress: event.target.value})} /></Field></div>
      {first ? null : <p className="muted-copy">Changing these details clears current sender authentication evidence. Existing approved content keeps its original identity and must match Settings before it can send.</p>}
      <button type="submit" className="primary-action">{busy ? 'Saving…' : 'Save sender details'}</button>
    </fieldset>{error ? <p className="inline-error" role="alert">{error}</p> : null}{notice ? <p className="action-notice" role="status">{notice}</p> : null}
  </ValidationForm>;
}

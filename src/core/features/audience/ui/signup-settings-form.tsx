import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { mapFieldErrors, type FieldErrors } from '@/core/app/client/ui/field-errors';

export function SignupSettingsForm({frequencyDisclosure, embedOrigins, saved}: {frequencyDisclosure: string; embedOrigins: string[]; saved: () => Promise<unknown>}) {
  const [value, setValue] = useState(frequencyDisclosure), [busy, setBusy] = useState(false), [errors, setErrors] = useState<FieldErrors>({});
  const [origins, setOrigins] = useState(embedOrigins.join('\n'));
  const [notice, setNotice] = useState(''), [error, setError] = useState('');
  const validate = () => value.trim().length < 3 ? 'Describe how often subscribers will receive the newsletter.' : value.trim().length > 200 ? 'Use at most 200 characters.' : /[<>\u0000-\u001f\u007f]/u.test(value) ? 'Use plain text without markup or control characters.' : undefined;
  const save = async () => {
    if (busy) return; setBusy(true); setError(''); setNotice('');
    try {const response = await requestJson<{fields?:unknown}>('/api/audience/signup', {method:'PUT', body:JSON.stringify({frequencyDisclosure:value,embedOrigins:origins.split(/\r?\n/).map(origin=>origin.trim()).filter(Boolean)})});
      if(response.status >= 400) {setErrors(mapFieldErrors(response.data.fields, ['frequencyDisclosure','embedOrigins'])); setError('Signup settings could not be saved. Check the field and try again.'); return;}
      await saved(); setNotice('Signup settings saved. New subscribers will see this frequency before giving consent.');
    } catch {setError('Signup settings could not be saved. Check your connection and try again.');} finally {setBusy(false);}
  };
  return (
    <ValidationForm className="signup-settings-form" aria-label="Signup-form settings" onValidSubmit={() => void save()} serverErrors={errors}>
      <h3>Signup-form settings</h3>
      <div className="signup-settings-form__row">
        <label>Newsletter frequency (required)<Field name="frequencyDisclosure" label="Newsletter frequency" required validate={validate}><input value={value} onChange={event => setValue(event.target.value)} disabled={busy} maxLength={200} /></Field></label>
        <button className="secondary-action" type="submit" disabled={busy}>Save signup settings</button>
      </div>
      <label>Allowed embed origins<Field name="embedOrigins" label="Allowed embed origins"><textarea rows={3} value={origins} onChange={event=>setOrigins(event.target.value)} disabled={busy} placeholder="https://www.example.com" /></Field></label>
      <p className="muted-copy">One exact HTTP or HTTPS origin per line, without a path or wildcard. Leave empty to refuse outside framing. Removing an origin blocks new loads there.</p>
      <p className="muted-copy">Changing the frequency updates the consent disclosure for new requests. Existing consent evidence keeps the exact disclosure originally accepted.</p>
      {notice ? <p className="action-notice" role="status">{notice}</p> : null}
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
    </ValidationForm>
  );
}

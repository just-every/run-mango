import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { Field, ValidationForm } from '../../src/core/app/client/ui/validation-form';
import type { FieldErrors } from '../../src/core/app/client/ui/field-errors';

function ValidationFixture() {
  const [subject, setSubject] = useState(''), [sender, setSender] = useState('sender@example.test');
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false), [mounted, setMounted] = useState(true), [remount, setRemount] = useState(false);
  const [validationRequest, setValidationRequest] = useState(0), [reads, setReads] = useState(0), [submissions, setSubmissions] = useState(0);
  return <>
    <button onClick={() => setReads(reads + 1)}>Background read</button><output>{reads} reads</output><p>Valid submissions: {submissions}</p>
    <button onClick={() => setServerErrors({sender: 'The server requires a verified sender.'})}>Receive named refusal</button>
    <label><input type="checkbox" checked={remount} onChange={event => setRemount(event.target.checked)} />Remount during save</label>
    <button disabled={!busy} onClick={() => {setBusy(false); setMounted(true); setServerErrors({}); setValidationRequest(value => value + 1);}}>Finish save</button>
    {mounted ? <ValidationForm aria-label="Draft" serverErrors={Object.keys(serverErrors).length ? serverErrors : {}} validationRequest={validationRequest} aria-busy={busy} onValidSubmit={() => {setSubmissions(value => value + 1); setBusy(true); if (remount) setMounted(false);}}>
      <fieldset disabled={busy}>
        <label>Subject<Field name="subject" label="Subject" required advisory><input value={subject} onChange={event => setSubject(event.target.value)} /></Field></label>
        <label>Sender<Field name="sender" label="Sender" required><input type="email" value={sender} onChange={event => setSender(event.target.value)} /></Field></label>
      </fieldset>
      <button disabled={busy}>Save draft</button>
    </ValidationForm> : null}
  </>;
}

createRoot(document.getElementById('root')!).render(<ValidationFixture />);

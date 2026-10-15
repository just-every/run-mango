import { useState, type FormEvent } from 'react';

import { useResource } from '@/core/app/client/lib/use-resource';

import { operatorAction, OperatorProofRequired, type SettingsOperator } from './settings-operator-actions';

export function SettingsOperators({ current }: { current: SettingsOperator }) {
  const operators = useResource<{ operators: SettingsOperator[] }>('/api/operators');
  const [email, setEmail] = useState('');
  const [removing, setRemoving] = useState<SettingsOperator>();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [proofRequired, setProofRequired] = useState(false);
  const [proofSent, setProofSent] = useState(false);

  async function confirmAccess() {
    setPending(true);
    setError(undefined);
    setNotice(undefined);
    setProofSent(false);
    try {
      await operatorAction('/auth/step-up', { method: 'POST', body: JSON.stringify({ action: 'owner:transfer', returnTo: '/app/settings' }) });
      setProofSent(true);
      setNotice('Open your confirmation message in this browser and press Confirm. Then add the operator again.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to request confirmation. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function addOperator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    setProofRequired(false);
    setProofSent(false);
    setNotice(undefined);
    try {
      const { operator } = await operatorAction<{ operator: SettingsOperator }>('/api/operators', {
        method: 'POST', body: JSON.stringify({ email }),
      });
      const existing = operators.data?.operators.some((item) => item.id === operator.id);
      setNotice(existing ? `${operator.email} already has access.` : `Access added for ${operator.email}. An invitation email has been sent; they must confirm it before signing in.`);
      setEmail('');
      await operators.reload();
    } catch (cause) {
      setProofRequired(cause instanceof OperatorProofRequired);
      setError(cause instanceof Error ? cause.message : 'Unable to add access. Try again.');
    } finally {
      setPending(false);
    }
  }

  async function removeOperator() {
    if (!removing) return;
    setPending(true);
    setError(undefined);
    setProofRequired(false);
    setProofSent(false);
    setNotice(undefined);
    try {
      await operatorAction(`/api/operators/${encodeURIComponent(removing.id)}`, { method: 'DELETE' });
      if (removing.id === current.id) {
        window.location.assign('/signin?reason=session-ended');
        return;
      }
      setNotice(removing.status === 'invited'
        ? `Invitation cancelled for ${removing.email}. Their confirmation links no longer work.`
        : `Access removed for ${removing.email}. Their sessions have been revoked.`);
      setRemoving(undefined);
      await operators.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to remove access. Try again.');
      setRemoving(undefined);
      await operators.reload();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel settings-operators" aria-labelledby="operators-title">
      <div className="section-heading"><div><p className="eyebrow">Team access</p><h2 id="operators-title">Operators</h2></div></div>
      <p>There are no roles. Every operator can manage campaigns, contacts and settings.</p>
      <form className="settings-add-operator" onSubmit={(event) => void addOperator(event)}>
        <label htmlFor="operator-email">Operator email</label>
        <div className="settings-actions">
          <input id="operator-email" type="email" autoComplete="email" required value={email} disabled={pending} onChange={(event) => setEmail(event.target.value)} />
          <button className="secondary-action" type="submit" disabled={pending || operators.loading || !operators.data}>{pending && !removing ? 'Adding…' : 'Add operator'}</button>
        </div>
        <p className="muted-copy">Adding an operator sends an invitation. They must open it and press Confirm before gaining access.</p>
      </form>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      {proofRequired ? <button className="secondary-action" type="button" disabled={pending} onClick={() => void confirmAccess()}>Email a confirmation link</button> : null}
      {notice ? <p className="action-notice" role="status">{notice}</p> : null}
      {operators.error ? <div className="inline-error" role="alert"><p>Unable to load the operator list.</p><button className="secondary-action" onClick={() => void operators.reload()} disabled={pending}>Refresh operators</button></div> : null}
      {operators.loading ? <p className="muted-copy" role="status">Loading operators…</p> : null}
      <ul className="settings-operator-list">
        {operators.data?.operators.map((operator) => <li key={operator.id}>
          <div className="settings-operator">
            <p className="settings-operator__name"><strong>{operator.displayName}{operator.id === current.id ? ' (you)' : ''}</strong>{operator.status ? <span className={`status-pill ${operator.status === 'invited' ? 'status-pill--pending' : 'status-pill--configured'}`}>{operator.status === 'invited' ? 'Invitation pending' : 'Active'}</span> : null}</p>
            <p className="settings-operator__email">{operator.email}</p>
            {operator.isInitial ? <small className="muted-copy">Setup operator · only they can remove their access</small> : null}
          </div>
          <button type="button" className="danger-action--line" disabled={pending || Boolean(removing) || (operator.isInitial && operator.id !== current.id)} onClick={() => { setRemoving(operator); setError(undefined); setNotice(undefined); }} aria-label={`Remove ${operator.email}`}>Remove</button>
        </li>)}
      </ul>
      {removing ? <div className="settings-removal notice-warning" role="group" aria-labelledby="remove-operator-title">
        <h3 id="remove-operator-title">Remove {removing.email}?</h3>
        <p>{removing.id === current.id ? 'You will lose access and be signed out immediately.' : removing.status === 'invited' ? 'Their pending invitation and confirmation links will be cancelled.' : 'Their access and active sessions will be revoked.'} Campaign and approval history will be preserved.</p>
        <div className="settings-actions">
          <button className="secondary-action" disabled={pending} onClick={() => setRemoving(undefined)}>Keep operator</button>
          <button className="danger-action" disabled={pending} onClick={() => void removeOperator()}>{pending ? 'Removing…' : 'Confirm removal'}</button>
        </div>
      </div> : null}
    </section>
  );
}

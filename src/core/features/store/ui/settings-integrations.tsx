import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { useResource } from '@/core/app/client/lib/use-resource';
import { IntegrationAudit } from './settings-integration-audit';

type Credential = {id: string; name: string; prefix: string; scopes: string[]; createdAt: number; revokedAt: number | null; lastUsedAt: number | null};
const choices = [
  ['contacts:read', 'Read contacts', 'Read contact fields, tags and lists.'],
  ['contacts:write', 'Write contacts', 'Sync contacts and consent evidence, and stop email. Existing opt-outs stay in force.'],
  ['events:read', 'Read campaign events', 'Read unsubscribe, bounce, complaint and suppression changes.'],
  ['campaigns:send', 'Send to a segment', 'Dispatch an exact campaign revision a person has already approved for its saved segment.'],
] as const;

export function SettingsIntegrations() {
  const resource = useResource<{credentials: Credential[]}>('/api/settings/integrations');
  const [name, setName] = useState(''), [scopes, setScopes] = useState<string[]>([]);
  const [token, setToken] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [revoke, setRevoke] = useState<string | null>(null), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0);
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await requestJson<{token?: string; error?: string}>('/api/settings/integrations', {method: 'POST', body: JSON.stringify({name, scopes})});
      if (response.status !== 201 || !response.data.token) {setError('The credential could not be created. Check its name and scopes, and that you are signed in as the owner.'); return;}
      setToken(response.data.token); setName(''); setScopes([]); await resource.reload(); setRevision(value => value + 1);
    } catch {setError('The credential could not be created. Check your connection and try again.');}
    finally {setBusy(false);}
  }
  async function remove(id: string) {
    setBusy(true); setError('');
    try {
      const response = await requestJson(`/api/settings/integrations/${encodeURIComponent(id)}`, {method: 'DELETE'});
      if (response.status !== 200) {setError('The credential could not be revoked. Try again as the owner.'); return;}
      setRevoke(null); setNotice('Credential revoked. Its next API request will be refused.'); await resource.reload(); setRevision(value => value + 1);
    } catch {setError('Revocation could not be confirmed. Check your connection and try again.');}
    finally {setBusy(false);}
  }
  return <section id="integrations" className="panel settings-integrations" aria-labelledby="integrations-title">
    <p className="eyebrow">Connect another seed</p><h2 id="integrations-title">Integration credentials</h2>
    <p>Give Coffer or another application only the access it needs to keep subscribers and consent in sync. These credentials cannot sign in as an operator or approve campaigns.</p>
    <p><a href="/docs/integrations">Integrator guide and curl examples</a>. Every API request appears in the activity below. Only the owner can create or revoke credentials.</p>
    {resource.loading ? <p role="status">Loading credentials…</p> : null}
    {resource.error ? <p className="inline-error" role="alert">Credentials are unavailable. Sign in as the owner, or <button className="secondary-action" onClick={() => void resource.reload()}>try again</button>.</p> : null}
    {resource.data ? <>
      {token ? <div className="notice-warning integration-secret" role="status">
        <h3>Save this credential now</h3><p>This is the only time Mango shows it. Store it in the connected application’s private settings.</p>
        <label htmlFor="integration-token">Scoped credential</label><textarea id="integration-token" readOnly rows={3} value={token} spellCheck={false} autoComplete="off" />
        <button type="button" className="secondary-action" onClick={() => {setToken(''); setNotice('Credential hidden. You can revoke it below if it was not saved.');}}>I saved it</button>
      </div> : <form className="integration-create" onSubmit={event => void create(event)}>
        <label htmlFor="integration-name">Credential name<input id="integration-name" required maxLength={100} placeholder="Coffer donor sync" value={name} onChange={event => setName(event.target.value)} /></label>
        <fieldset disabled={busy}><legend>Choose its scopes</legend>
          {choices.map(([scope, title, description]) => <label key={scope} className="integration-scope"><input type="checkbox" checked={scopes.includes(scope)} onChange={event => setScopes(current => event.target.checked ? [...current, scope] : current.filter(value => value !== scope))} /><span><strong>{title}</strong><small>{description}</small></span></label>)}
        </fieldset>
        <button className="primary-action" disabled={busy || !scopes.length} type="submit">{busy ? 'Creating…' : 'Create credential'}</button>
      </form>}
      <ul className="integration-credentials">{resource.data.credentials.map(credential => <li key={credential.id}>
        <div className="settings-operator"><p className="settings-operator__name"><strong>{credential.name}</strong><span>{credential.revokedAt ? 'Revoked' : 'Active'}</span></p>
          <small>{credential.scopes.join(' · ')}</small><small>Created {new Date(credential.createdAt).toLocaleDateString()} · {credential.lastUsedAt ? `Last used ${new Date(credential.lastUsedAt).toLocaleString()}` : 'No API requests yet'}</small>
          {revoke === credential.id ? <div className="settings-removal notice-warning"><p>Stop this application’s access now? Its synced contacts and consent history stay in Mango.</p><div className="settings-actions"><button className="danger-action" disabled={busy} onClick={() => void remove(credential.id)}>Confirm revocation</button><button className="secondary-action" onClick={() => setRevoke(null)}>Keep credential</button></div></div> : null}
        </div>{!credential.revokedAt && revoke !== credential.id ? <button className="secondary-action" disabled={busy} onClick={() => setRevoke(credential.id)}>Revoke {credential.name}</button> : null}
      </li>)}</ul>
      {!resource.data.credentials.length ? <p className="muted-copy">No credentials yet. Start with the scopes your connected application needs.</p> : null}
      <IntegrationAudit key={revision} />
    </> : null}
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    {notice ? <p className="action-notice" role="status">{notice}</p> : null}
  </section>;
}

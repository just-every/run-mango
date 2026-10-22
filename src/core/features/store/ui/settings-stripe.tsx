import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import {Can} from '@/core/features/auth/ui/permissions';
import {SettingsPaidTier, type PaidReaders, type PaidTier} from './settings-paid-tier';
type Status = {connection: {mode: string; lastFour: string; connectedBy: string; connectedAt: number} | null; sourceTypes: string[]; webhookPath: string; paidTier: PaidTier | null; paidReaders: PaidReaders};
export function SettingsStripe() {
  const resource = useResource<Status>('/api/settings/stripe');
  const [key, setKey] = useState(''), [signingSecret, setSigningSecret] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function connect(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await requestJson('/api/settings/stripe', {method: 'PUT', body: JSON.stringify({key, signingSecret})});
      if (response.status !== 200) {setError('Connection refused. Check the restricted key, webhook signing secret and Stripe permissions.'); return;}
      setKey(''); setSigningSecret(''); await resource.reload();
    } catch {setError('Could not confirm the Stripe connection. Try again.');} finally {setBusy(false);}
  }
  async function disconnect() {
    setBusy(true); setError('');
    try {const response = await requestJson('/api/settings/stripe', {method: 'DELETE'}); if (response.status !== 200) throw new Error(); await resource.reload();}
    catch {setError('Could not disconnect Stripe. Try again.');} finally {setBusy(false);}
  }
  return <section className="panel" aria-labelledby="stripe-title" id="stripe">
    <p className="eyebrow">Payments and subscriptions</p><h2 id="stripe-title">Stripe connection</h2>
    <p>Record payment and subscription events on contact timelines. Connecting never subscribes anyone to marketing. <a href="/docs/integrations#stripe">Stripe setup guide</a>.</p>
    {resource.loading ? <p role="status">Loading Stripe…</p> : null}
    {resource.error ? <p role="alert">Stripe status is unavailable. <button type="button" onClick={() => void resource.reload()}>Try again</button></p> : null}
    {resource.data ? <>
      {resource.data.connection ? <div role="status"><p><strong>{resource.data.connection.mode === 'test' ? 'Test mode' : 'Live mode'}</strong> · Key ending {resource.data.connection.lastFour}</p><p>Connected by {resource.data.connection.connectedBy} on {new Date(resource.data.connection.connectedAt).toLocaleString()}.</p></div> : <p>No Stripe connection.</p>}
      <p>Declared sources: {resource.data.sourceTypes.join(', ')}. Webhook path: <code>{resource.data.webhookPath}</code>.</p>
      <Can permission="provider.connect"><form onSubmit={event => void connect(event)} className="integration-create">
        <label htmlFor="stripe-key">Restricted Stripe key<input id="stripe-key" type="password" autoComplete="new-password" required value={key} onChange={event => setKey(event.target.value)} /></label>
        <label htmlFor="stripe-signing">Webhook signing secret<input id="stripe-signing" type="password" autoComplete="new-password" required value={signingSecret} onChange={event => setSigningSecret(event.target.value)} /></label>
        <p>Use a restricted key with read access to customers, charges and PaymentIntents; a paid tier also needs write access to Checkout Sessions and read access to Prices and Subscriptions. Keys stay encrypted on the server and are excluded from exports. Save the signing secret from your Stripe webhook configuration.</p>
        <button type="submit" className="primary-action" disabled={busy}>{busy ? 'Saving…' : resource.data.connection ? 'Replace Stripe connection' : 'Connect Stripe'}</button>
        {resource.data.connection ? <button type="button" className="secondary-action" disabled={busy} onClick={() => void disconnect()}>Disconnect Stripe</button> : null}
      </form></Can>
      {resource.data.connection ? <SettingsPaidTier tier={resource.data.paidTier} readers={resource.data.paidReaders} onSaved={resource.reload} /> : null}
    </> : null}
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
  </section>;
}

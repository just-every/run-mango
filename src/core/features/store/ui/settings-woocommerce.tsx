import {useState} from 'react';
import {Can} from '@/core/features/auth/ui/permissions';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
type Status = {connection: {id: string; url: string; connectedAt: number} | null; sourceTypes: string[]; webhookUrl: string | null};
export function SettingsWooCommerce() {
  const status = useResource<Status>('/api/settings/woocommerce');
  const [url, setUrl] = useState(''), [key, setKey] = useState(''), [secret, setSecret] = useState(''), [signingSecret, setSigning] = useState('');
  const [exclusiveSecret, setExclusive] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await requestJson('/api/settings/woocommerce', {method: 'PUT', body: JSON.stringify({url, key, secret, signingSecret, exclusiveSecret})});
      if (response.status !== 200) throw new Error();
      setKey(''); setSecret(''); setSigning(''); setExclusive(false); await status.reload();
    } catch {setError('Connection refused. Check the public HTTPS store address and read-only REST API keys. Disconnect another configured store before connecting WooCommerce.');}
    finally {setBusy(false);}
  }
  async function disconnect() {
    setBusy(true); setError('');
    try {if ((await requestJson('/api/settings/woocommerce', {method: 'DELETE'})).status !== 200) throw new Error(); await status.reload();}
    catch {setError('Could not disconnect WooCommerce. Try again.');} finally {setBusy(false);}
  }
  return <section className="panel" id="woocommerce" aria-labelledby="woocommerce-title">
    <p className="eyebrow">Store connection</p><h2 id="woocommerce-title">WooCommerce</h2>
    <p>Import customers, products, orders and refunds. Store records never subscribe someone to marketing. <a href="/docs/integrations#woocommerce">WooCommerce setup guide</a>.</p>
    {status.loading ? <p role="status">Loading WooCommerce…</p> : null}
    {status.error ? <p role="alert">WooCommerce status is unavailable. <button type="button" onClick={() => void status.reload()}>Try again</button></p> : null}
    {status.data ? <>
      <p role="status">{status.data.connection ? `Connected to ${status.data.connection.url}` : 'No WooCommerce connection.'}</p>
      {status.data.webhookUrl ? <><p>Webhook delivery URL: <code>{status.data.webhookUrl}</code></p><p>Sync each source from <a href="/app/store">Store</a>. Signed order updates also refresh the order’s refunds.</p></> : null}
      <p>Onsite tracking, the WordPress plugin and abandoned-checkout flows are not available yet.</p>
      <Can permission="provider.connect"><form className="integration-create" onSubmit={event => void save(event)}>
        <label htmlFor="woo-url">WooCommerce store URL<input id="woo-url" type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://shop.example.com/" required /></label>
        <label htmlFor="woo-key">Consumer key<input id="woo-key" type="password" autoComplete="new-password" value={key} onChange={event => setKey(event.target.value)} required minLength={16} /></label>
        <label htmlFor="woo-secret">Consumer secret<input id="woo-secret" type="password" autoComplete="new-password" value={secret} onChange={event => setSecret(event.target.value)} required minLength={16} /></label>
        <label htmlFor="woo-signing">WooCommerce webhook secret<input id="woo-signing" type="password" autoComplete="new-password" value={signingSecret} onChange={event => setSigning(event.target.value)} required minLength={16} /></label>
        <label htmlFor="woo-exclusive"><input id="woo-exclusive" type="checkbox" checked={exclusiveSecret} onChange={event => setExclusive(event.target.checked)} required />This webhook secret is used only for this store’s Mango connection.</label>
        <p>Use REST API keys with Read permission. Credentials are encrypted on this installation and excluded from exports. Configure customer.created, customer.updated, product.created, product.updated, order.created and order.updated webhooks with the same exclusive secret.</p>
        <button type="submit" className="primary-action" disabled={busy}>{busy ? 'Saving…' : status.data.connection ? 'Replace WooCommerce connection' : 'Connect WooCommerce'}</button>
        {status.data.connection ? <button type="button" className="secondary-action" disabled={busy} onClick={() => void disconnect()}>Disconnect WooCommerce</button> : null}
      </form></Can>
    </> : null}
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
  </section>;
}

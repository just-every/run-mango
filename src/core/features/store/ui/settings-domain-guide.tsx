import {useState} from 'react';
import {Can} from '@/core/features/auth/ui/permissions';
import {requestJson} from '@/core/app/client/lib/api';
import {useResource} from '@/core/app/client/lib/use-resource';
type Tracking = {host: string; target: string; cname: boolean; https: boolean; passed: boolean};
type Guide = {setup: {domain: string; exists: boolean; providerValid: boolean; records: Array<{purpose: string; name: string; type: string; value: string; providerReturned: boolean; passed: boolean}>}; tracking: Tracking | null; trackingTarget: string};
export function SettingsDomainGuide() {
  const resource = useResource<Guide>('/api/settings/sender/domain-guide');
  const [host, setHost] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function action(path: string, method: string, body: unknown) {
    setBusy(true); setError('');
    try {const response = await requestJson(path, {method, body: JSON.stringify(body)}); if (response.status !== 200) throw new Error(); await resource.reload();}
    catch {setError('The domain action could not be confirmed. Check the connected SendGrid account and your Owner access, then try again.');}
    finally {setBusy(false);}
  }
  return <section className="panel" id="domain-guide" aria-labelledby="domain-guide-title">
    <p className="eyebrow">Domain setup</p><h2 id="domain-guide-title">Authenticate your sending domain</h2>
    <p>Read records from the connected SendGrid account, add them at your DNS provider, then check public DNS. Passing these checks does not replace the sender’s inbox check. <a href="/docs/going-live#domain-setup">Domain setup guide</a>.</p>
    {resource.loading ? <p role="status">Reading domain records…</p> : null}
    {resource.error ? <p role="status">Connect SendGrid in your installation configuration and save the From address to read its domain records. <button type="button" className="secondary-action" onClick={() => void resource.reload()}>Check again</button></p> : null}
    {resource.data ? <>
      <p>From domain: <strong>{resource.data.setup.domain}</strong>. SendGrid authentication: {resource.data.setup.exists ? resource.data.setup.providerValid ? 'Validated' : 'Not validated' : 'Not created'}.</p>
      <Can permission="provider.connect"><div className="settings-actions"><button type="button" className="primary-action" disabled={busy} onClick={() => void action('/api/settings/sender/domain-authentication', 'POST', {action: resource.data!.setup.exists ? 'validate' : 'create'})}>{resource.data.setup.exists ? 'Validate domain at SendGrid' : 'Create domain authentication'}</button></div></Can>
      <button type="button" className="secondary-action" disabled={busy} onClick={() => void resource.reload()}>Check public DNS</button>
      <p>For SendGrid, the mail CNAME supplies SPF and the return-path. Use the exact account-specific CNAME values below; do not add a second SPF record. DKIM uses both rotation selectors. DMARC is your policy, separate from SendGrid’s returned records; preserve an existing policy.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Domain DNS setup records"><table className="responsive-table insights-table" aria-label="Domain DNS records"><thead><tr><th>Purpose</th><th>Name</th><th>Type</th><th>Record to add</th><th>Public DNS</th></tr></thead><tbody>
        {resource.data.setup.records.map(row => <tr key={row.name}><td data-label="Purpose">{row.purpose}{!row.providerReturned ? ' (recommendation)' : ''}</td><td data-label="Name"><code>{row.name}</code></td><td data-label="Type">{row.type}</td><td data-label="Record to add"><code>{row.value}</code></td><td data-label="Public DNS">{row.passed ? 'Pass' : 'Fail — add or correct this record'}</td></tr>)}
      </tbody></table></div>
      <h3>Branded tracking and links</h3><p>Choose a hostname that routes to this Mango installation, with CNAME target <code>{resource.data.trackingTarget}</code> and a valid HTTPS certificate. The existing tracked-link path and click/consent rules stay the same. Mango checks both before rewriting; a failed check uses the installation’s ordinary host.</p>
      {resource.data.tracking ? <p role="status">{resource.data.tracking.host}: CNAME {resource.data.tracking.cname ? 'Pass' : 'Fail'} · HTTPS certificate and response {resource.data.tracking.https ? 'Pass' : 'Fail'} · {resource.data.tracking.passed ? 'Branded rewrite enabled' : 'Branded rewrite disabled'}</p> : <p>No branded tracking host is set.</p>}
      <Can permission="provider.connect"><form className="integration-create" onSubmit={event => {event.preventDefault(); void action('/api/settings/sender/tracking-domain', 'PUT', {host});}}><label htmlFor="tracking-host">Tracking hostname<input id="tracking-host" placeholder="links.your-domain.com" value={host} onChange={event => setHost(event.target.value)} maxLength={253} /></label><p>Save an empty hostname to remove it. DNS alone does not provision a routing rule or certificate.</p><button type="submit" className="primary-action" disabled={busy}>Save tracking hostname</button></form></Can>
      <h3>BIMI and DMARC</h3><p>BIMI can display your brand’s logo in supporting inboxes. First enforce DMARC with p=quarantine or p=reject (and full enforcement, pct=100 where used), align your mail, and publish a compliant SVG logo at default._bimi with the required certificate where the receiver requires one. A monitoring policy, p=none, is not enough for BIMI. BIMI does not guarantee inbox placement.</p>
    </> : null}
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
  </section>;
}

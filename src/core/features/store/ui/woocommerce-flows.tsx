import {useState} from 'react';
import {useResource} from '@/core/app/client/lib/use-resource';
import {requestJson} from '@/core/app/client/lib/api';
import {Can} from '@/core/features/auth/ui/permissions';
type Flow = {id: string; name: string; tag: string; state: string; enrollments: number};
export function WooCommerceFlows() {
  const resource = useResource<{flows: Flow[]}>('/api/flows');
  const [name, setName] = useState(''), [tag, setTag] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function change(path: string, body: unknown) {
    setBusy(true); setError('');
    try {const response = await requestJson(path, {method: 'POST', body: JSON.stringify(body)}); if (response.status >= 300) throw new Error(); await resource.reload();}
    catch {setError('The flow was not changed. Check your role and the plugin connection, then try again.');} finally {setBusy(false);}
  }
  return <div aria-labelledby="woo-flows-title">
    <h3 id="woo-flows-title">Abandoned-checkout flows</h3>
    <p>The plugin observes a signed-in customer’s checkout after an hour of inactivity, explicit analytics and marketing consent, and no placed order. A live flow tags an eligible subscribed contact and exits. It sends no message. GPC, opt-out and suppression prevent enrollment.</p>
    <Can permission="draft.write"><form className="integration-create" onSubmit={event => {event.preventDefault(); void change('/api/flows', {kind: 'woocommerce-abandoned-checkout', name, tag});}}>
      <label htmlFor="woo-flow-name">Flow name<input id="woo-flow-name" value={name} onChange={event => setName(event.target.value)} maxLength={100} required /></label>
      <label htmlFor="woo-flow-tag">Contact tag<input id="woo-flow-tag" value={tag} onChange={event => setTag(event.target.value)} maxLength={100} required /></label>
      <button type="submit" className="secondary-action" disabled={busy}>Save checkout flow draft</button>
    </form></Can>
    {resource.loading ? <p role="status">Loading checkout flows…</p> : null}
    {resource.error ? <p role="alert">Checkout flows are unavailable. <button onClick={() => void resource.reload()}>Try again</button></p> : null}
    {resource.data?.flows.map(flow => <article key={flow.id} aria-label={flow.name}>
      <h4>{flow.name}</h4><p>Abandoned checkout → tag “{flow.tag}” → exit</p>
      <p>State: {flow.state}. Enrollments: {flow.enrollments}. Revision: <code>{flow.id}</code></p>
      <Can permission="flow.activate"><button className="secondary-action" disabled={busy} onClick={() => void change(`/api/flows/${flow.id}/${flow.state === 'live' ? 'pause' : 'activate'}`, {revisionId: flow.id})}>{flow.state === 'live' ? 'Pause flow' : 'Activate this revision'}</button></Can>
    </article>)}
    {error ? <p role="alert">{error}</p> : null}
  </div>;
}

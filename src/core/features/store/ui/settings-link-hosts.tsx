import { useState } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { useResource } from '@/core/app/client/lib/use-resource';
import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { linkHostsSchema } from '@/core/features/settings/link-hosts-validation';

type LinkHosts = {hosts: string[]; defaultHost: string};

function LinkHostsForm({settings}: {settings: LinkHosts}) {
  const [hosts, setHosts] = useState(settings.hosts.join(', ')), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  async function save() {
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await requestJson<LinkHosts>('/api/settings/link-hosts', {method: 'PUT', body: JSON.stringify({hosts})});
      if (response.status === 401) {window.location.assign('/signin?reason=session-ended'); return;}
      if (response.status >= 400) {setError('Link hosts could not be saved. Check the host names and try again.'); return;}
      setHosts(response.data.hosts.join(', ')); setNotice('Allowed newsletter link hosts saved.');
    } catch {setError('Link hosts could not be saved. Check your connection and try again.');}
    finally {setBusy(false);}
  }
  return <ValidationForm className="settings-sender-form" onValidSubmit={() => void save()} aria-busy={busy}>
    <p className="settings-sender-form__intro">Newsletters can link to your app’s host by default: <strong>{settings.defaultHost}</strong>. Add the hosts you want to use, separated by commas. Their subdomains are also allowed.</p>
    <fieldset disabled={busy}><legend className="sr-only">Newsletter link policy</legend>
      <div className="settings-postal-field"><label htmlFor="newsletter-link-hosts">Allowed newsletter link hosts</label>
        <Field name="hosts" label="Allowed newsletter link hosts" validate={() => {
          const result = linkHostsSchema.safeParse(hosts); return result.success ? undefined : result.error.issues[0].message;
        }}><textarea id="newsletter-link-hosts" rows={3} maxLength={25000} value={hosts} onChange={event => setHosts(event.target.value)} /></Field></div>
      <p className="muted-copy">Use host names such as shop.example.com, without https:// or paths. Leave empty to return to your app’s host. Mango checks this policy during campaign review and before sending.</p>
      <button className="primary-action" type="submit">{busy ? 'Saving…' : 'Save link hosts'}</button>
    </fieldset>
    {error ? <p className="inline-error" role="alert">{error}</p> : null}
    {notice ? <p className="action-notice" role="status">{notice}</p> : null}
  </ValidationForm>;
}

export function SettingsLinkHosts() {
  const settings = useResource<LinkHosts>('/api/settings/link-hosts');
  return <section className="panel settings-sender" aria-labelledby="link-hosts-title" aria-busy={settings.loading}>
    <p className="eyebrow">Newsletter links</p><h2 id="link-hosts-title">Allowed link hosts</h2>
    {settings.loading ? <p role="status">Loading link hosts…</p> : null}
    {settings.error ? <p className="inline-error" role="alert">Unable to load link hosts. <button className="secondary-action" onClick={() => void settings.reload()}>Try again</button></p> : null}
    {settings.data ? <LinkHostsForm settings={settings.data} /> : null}
  </section>;
}

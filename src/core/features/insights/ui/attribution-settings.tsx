import { useState, type FormEvent } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { useResource } from '@/core/app/client/lib/use-resource';
import { usePermissions } from '@/core/features/auth/ui/permissions';
import type { AttributionPolicy } from '../attribution-policy';
import { AttributionPolicyNote } from './attribution-policy-note';

type Settings = AttributionPolicy & { availableMetrics: { id: string; label: string }[] };
type Draft = { metric: string; email: string; sms: string };

export function AttributionSettings({ onSettingsChanged }: { onSettingsChanged: () => void }) {
  const { can } = usePermissions();
  const { data, error, loading, reload, replace } = useResource<Settings>('/api/insights/attribution-policy');
  const [draft, setDraft] = useState<Draft>();
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState(''), [saved, setSaved] = useState(false);
  const values = draft ?? (data ? { metric: data.metric, email: String(data.clickWindowDays.email), sms: String(data.clickWindowDays.sms) } : undefined);
  const changed = data && values && (values.metric !== data.metric || Number(values.email) !== data.clickWindowDays.email || Number(values.sms) !== data.clickWindowDays.sms);
  const update = (value: Partial<Draft>) => { if (values) setDraft({ ...values, ...value }); setSaved(false); setFailure(''); };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values || busy || !can('settings.manage')) return;
    setBusy(true); setFailure(''); setSaved(false);
    try {
      const response = await requestJson<Settings & { error?: string }>('/api/insights/attribution-policy', {
        method: 'PUT', body: JSON.stringify({ metric: values.metric, clickWindowDays: { email: Number(values.email), sms: Number(values.sms) } }),
      });
      if (response.status !== 200) {
        setFailure(response.status === 403 ? 'Your authority changed. Sign in as an Owner or Admin to change attribution.' : 'Attribution could not be saved. Choose a recorded metric and whole-day windows from 1 to 365.');
        return;
      }
      replace(response.data); setDraft(undefined); setSaved(true); onSettingsChanged();
    } catch { setFailure('Attribution could not be saved. Check your connection and try again.'); }
    finally { setBusy(false); }
  }

  return <section className="panel attribution-policy-settings" aria-labelledby="attribution-settings-title">
    <h2 id="attribution-settings-title">Revenue attribution</h2>
    <p>The most recent qualifying human click receives each conversion once. Changing the metric or channel windows recalculates reports from recorded events. Refunds and cancellations subtract from attributed revenue.</p>
    {error ? <p className="inline-error" role="alert">Attribution settings could not be loaded. <button type="button" className="secondary-action" onClick={() => void reload()}>Try again</button></p>
      : loading || !data || !values ? <p role="status">Loading attribution settings…</p>
      : <>
        <p>Current report policy<AttributionPolicyNote policy={data} /></p>
        {can('settings.manage') ? <form onSubmit={event => void save(event)}>
          <fieldset className="draft-fields" disabled={busy}>
            <legend>Conversion metric and click windows</legend>
            <label>Conversion metric<select value={values.metric} onChange={event => update({ metric: event.target.value })}>
              {!data.availableMetrics.some(metric => metric.id === data.metric) ? <option value={data.metric} disabled>{data.metricLabel} (no recorded conversions)</option> : null}
              {data.availableMetrics.map(metric => <option key={metric.id} value={metric.id}>{metric.label}</option>)}
            </select></label>
            <label>Email click window (days)<input type="number" required min={1} max={365} step={1} value={values.email} onChange={event => update({ email: event.target.value })} /></label>
            <label>SMS click window (days)<input type="number" required min={1} max={365} step={1} value={values.sms} onChange={event => update({ sms: event.target.value })} /></label>
          </fieldset>
          <p className="muted-copy">Defaults: Placed Order and seven days per channel. Custom conversion events appear after an integration records them.</p>
          <button type="submit" className="primary-action" disabled={busy || !changed}>{busy ? 'Saving attribution…' : 'Save attribution and recalculate'}</button>
        </form> : <p>An Owner or Admin can change this policy.</p>}
      </>}
    {failure ? <p className="inline-error" role="alert">{failure}</p> : null}
    {saved ? <p className="action-notice" role="status">Attribution saved. Campaign performance is refreshing.</p> : null}
  </section>;
}

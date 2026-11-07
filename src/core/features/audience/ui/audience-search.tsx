import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { requestJson } from '@/core/app/client/lib/api';
import { useResource } from '@/core/app/client/lib/use-resource';
import type { Contact } from '@/core/app/client/lib/types';

export type AudienceQuery = {
  field: 'email' | 'phone' | 'name' | 'property' | 'tag' | 'segment' | 'consent';
  value: string;
  property?: string;
  channel?: 'email' | 'sms';
};
export type BulkOptions = {
  segments: { id: string; name: string }[];
  topics: { id: string; name: string; channel: 'email' | 'sms' }[];
  properties: { key: string; label: string }[];
};
export type AudienceSearchResult = { contacts: Contact[]; total: number; search: AudienceQuery; label: string };
const fields: { value: AudienceQuery['field']; label: string }[] = [
  { value: 'email', label: 'Email' }, { value: 'phone', label: 'Phone' },
  { value: 'name', label: 'Name' }, { value: 'property', label: 'Property value' },
  { value: 'tag', label: 'Tag' }, { value: 'segment', label: 'Segment' },
  { value: 'consent', label: 'Consent state' },
];

export function AudienceSearch({ onResult, onBusy, onOptions, applied }: {
  onResult: (result: AudienceSearchResult | undefined) => void;
  onBusy: (busy: boolean) => void;
  onOptions: (options: BulkOptions) => void;
  applied?: string;
}) {
  const { data: options, error: optionsError, reload } = useResource<BulkOptions>('/api/audience/bulk-options');
  const [field, setField] = useState<AudienceQuery['field']>('name');
  const [value, setValue] = useState('');
  const [property, setProperty] = useState('');
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController | null>(null);
  const propertiesId = useId();
  useEffect(() => { if (options) onOptions(options); }, [options, onOptions]);
  useEffect(() => () => pending.current?.abort(), []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const query: AudienceQuery = { field, value: value.trim(),
      ...(field === 'property' ? { property } : {}), ...(field === 'consent' ? { channel } : {}) };
    const params = new URLSearchParams({ field: query.field, value: query.value });
    if (query.property) params.set('property', query.property);
    if (query.channel) params.set('channel', query.channel);
    const visibleValue = field === 'segment' ? options?.segments.find(segment => segment.id === value)?.name ?? value : value;
    const label = field === 'name' && !value.trim() ? 'All contacts'
      : `${field === 'property' ? options?.properties.find(item => item.key === property)?.label ?? property
        : field === 'consent' ? `${channel === 'email' ? 'Email' : 'SMS'} consent` : fields.find(item => item.value === field)?.label}: ${visibleValue.trim()}`;
    setBusy(true); onBusy(true); setError('');
    try {
      const result = await requestJson<{ contacts: Contact[]; total: number; detail?: string }>(`/api/audience/search?${params}`, { signal: controller.signal });
      if (result.status >= 400) throw new Error(result.data.detail ?? 'The contact search could not be completed.');
      if (controller.signal.aborted) return;
      onResult({ contacts: result.data.contacts, total: result.data.total, search: query, label });
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'The contact search could not be completed.');
    } finally {
      if (!controller.signal.aborted) { setBusy(false); onBusy(false); }
    }
  }

  function clear() {
    pending.current?.abort(); setBusy(false); onBusy(false);
    setError(''); onResult(undefined);
  }

  return <div className="audience-search">
    <details>
      <summary>Search contacts</summary>
      <form className="audience-search__form" onSubmit={event => void search(event)} aria-busy={busy}>
        <label>Search by<select value={field} onChange={event => { setField(event.target.value as AudienceQuery['field']); setValue(''); }}>
          {fields.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select></label>
        {field === 'property' ? <label>Property key<input required list={propertiesId} value={property} maxLength={100} onChange={event => setProperty(event.target.value)} />
          <datalist id={propertiesId}>{options?.properties.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</datalist>
        </label> : null}
        {field === 'consent' ? <label>Channel<select value={channel} onChange={event => setChannel(event.target.value as 'email' | 'sms')}><option value="email">Email</option><option value="sms">SMS</option></select></label> : null}
        <label>{field === 'consent' ? 'Consent state' : field === 'segment' ? 'Saved segment' : 'Search value'}
          {field === 'segment' ? <select required value={value} onChange={event => setValue(event.target.value)}>
            <option value="">Choose a segment</option>{options?.segments.map(segment => <option key={segment.id} value={segment.id}>{segment.name}</option>)}
          </select> : field === 'consent' ? <select required value={value} onChange={event => setValue(event.target.value)}>
            <option value="">Choose a state</option>{['subscribed', 'pending', 'unsubscribed', 'suppressed', 'non-subscribed'].map(state => <option key={state} value={state}>{state.replaceAll('-', ' ')}</option>)}
          </select> : <input type="search" value={value} required={field !== 'name'} maxLength={320} onChange={event => setValue(event.target.value)} placeholder={field === 'name' ? 'Leave blank for all contacts' : undefined} />}
        </label>
        <button type="submit" className="secondary-action" disabled={busy}>{busy ? 'Searching…' : 'Find contacts'}</button>
      </form>
      {optionsError ? <p className="inline-error" role="alert">Search choices could not be loaded. <button type="button" className="text-link" onClick={() => void reload()}>Reload search choices</button></p> : null}
      {options && field === 'segment' && !options.segments.length ? <p className="muted-copy">Create a saved segment below to search its contacts.</p> : null}
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
    </details>
    {applied ? <div className="audience-search__applied"><span>{applied}</span><button type="button" className="text-link" onClick={clear}>Clear search</button></div> : null}
  </div>;
}

import { useCallback, useEffect, useState } from 'react';
import { ApiError, getJson } from '@/core/app/client/lib/api';
import { LoadState } from '@/core/app/client/ui/layout';

type Entry = {id: string; operatorId: string; operatorName: string | null; actorType: string; action: string; objectType: string; objectId: string; detail: unknown; occurredAt: number};
type Page = {entries: Entry[]; nextCursor: string | null};
const fields = [['operator', 'Operator'], ['agent', 'Agent'], ['action', 'Action'], ['object', 'Object'], ['from', 'From date'], ['to', 'To date']] as const;
type Filters = Record<(typeof fields)[number][0], string>;
const blank: Filters = {operator: '', agent: '', action: '', object: '', from: '', to: ''};

function query(filters: Filters, extra: Record<string, string> = {}) {
  const params = new URLSearchParams(extra);
  for (const [name, value] of Object.entries(filters)) if (value.trim()) params.set(name, value.trim());
  return params.toString();
}

function actor(entry: Entry) {
  if (entry.actorType === 'agent') return entry.operatorName ?? 'Removed agent';
  if (entry.actorType === 'operator') return entry.operatorName ?? 'Removed operator';
  return entry.actorType === 'system' ? 'Mango' : `${entry.actorType} ${entry.operatorId}`;
}

/** OPER-007: Owner and Admin read, filter and export every recorded action. */
export function ActivityPage() {
  const [draft, setDraft] = useState<Filters>(blank), [applied, setApplied] = useState<Filters>(blank);
  const [entries, setEntries] = useState<Entry[]>([]), [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState<string>();
  const load = useCallback(async (filters: Filters, before?: string) => {
    setLoading(true); setError(undefined);
    try {
      const page = await getJson<Page>(`/api/activity?${query(filters, {limit: '100', ...(before ? {before} : {})})}`);
      setEntries(current => before ? [...current, ...page.entries] : page.entries); setCursor(page.nextCursor);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {window.location.assign('/signin?reason=session-ended'); return;}
      setError(cause instanceof ApiError && cause.status === 400 ? 'Check the filters: dates look like 2026-10-20.' : 'Unable to load the activity log.');
    } finally {setLoading(false);}
  }, []);
  useEffect(() => {void load(applied);}, [applied, load]);
  const set = (name: keyof Filters, value: string) => setDraft(current => ({...current, [name]: value}));
  return <div className="page-flow activity-page">
    <header className="page-head page-head--actions">
      <div className="page-head__text">
        <h1>Activity</h1>
        <p className="page-head__lead">Every action by an operator, an integration or Mango itself, newest first. Entries stay after an operator is removed.</p>
      </div>
      <div className="page-head__actions"><a className="secondary-action" href={`/api/activity/export?${query(applied)}`} download="mango-activity.csv">Export CSV</a></div>
    </header>
    <form className="panel activity-filters" aria-label="Activity filters" onSubmit={event => {event.preventDefault(); setApplied({...draft});}}>
      {fields.map(([name, label]) => <label key={name}>{label}
        <input name={name} type={name === 'from' || name === 'to' ? 'date' : 'text'} value={draft[name]} onChange={event => set(name, event.target.value)} maxLength={200} />
      </label>)}
      <div className="detail-actions">
        <button className="primary-action" type="submit">Apply filters</button>
        <button className="secondary-action" type="button" onClick={() => {setDraft(blank); setApplied(blank);}}>Clear</button>
      </div>
    </form>
    {error ? <LoadState error={error} /> : null}
    <section className="panel" aria-label="Activity entries" aria-busy={loading}>
      {entries.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Activity log table">
        <table className="responsive-table">
          <thead><tr><th scope="col">Time</th><th scope="col">Who</th><th scope="col">Action</th><th scope="col">Object</th><th scope="col">Detail</th></tr></thead>
          <tbody>{entries.map(entry => <tr key={entry.id}>
            <td><time dateTime={new Date(entry.occurredAt).toISOString()}>{new Date(entry.occurredAt).toISOString().replace('T', ' ').slice(0, 19)} UTC</time></td>
            <td>{actor(entry)}<small>{entry.operatorId}</small></td>
            <td>{entry.action}</td>
            <td>{entry.objectType}<small>{entry.objectId}</small></td>
            <td><code className="activity-detail">{JSON.stringify(entry.detail)}</code></td>
          </tr>)}</tbody>
        </table>
      </div> : <p className="muted-copy">{loading ? 'Loading activity…' : 'No activity matches these filters.'}</p>}
      {cursor ? <button className="secondary-action" type="button" disabled={loading} onClick={() => void load(applied, cursor)}>Show older activity</button> : null}
    </section>
  </div>;
}

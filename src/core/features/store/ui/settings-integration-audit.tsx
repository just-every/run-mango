import { useResource } from '@/core/app/client/lib/use-resource';
import { useState } from 'react';

type Audit = {id: string; credentialId: string | null; operation: string; status: number; outcome: string; occurredAt: number};
export function IntegrationAudit() {
  const [cursor, setCursor] = useState('0');
  const activity = useResource<{audit: Audit[]; nextCursor: string}>(`/api/settings/integrations/audit?limit=50&cursor=${cursor}`);
  return <div className="integration-audit">
    <div className="section-heading"><h3>Integration activity</h3><button className="secondary-action" onClick={() => void activity.reload()}>Refresh activity</button></div>
    <p className="muted-copy">Up to 50 requests per page, including refused requests. Credentials and request bodies are never shown here.</p>
    {activity.loading ? <p role="status">Loading activity…</p> : null}
    {activity.error ? <p className="inline-error" role="alert">Activity could not be loaded. Try refreshing it.</p> : null}
    {activity.data ? <ol className="integration-activity">{activity.data.audit.map(entry => <li key={entry.id}>
      <div><strong>{entry.operation}</strong><small>{entry.credentialId ? `Credential ${entry.credentialId}` : 'Owner or unrecognized credential'}</small></div>
      <div><span>{entry.status ? `${entry.status} · ${entry.outcome}` : 'In progress'}</span><time dateTime={new Date(entry.occurredAt).toISOString()}>{new Date(entry.occurredAt).toLocaleString()}</time></div>
    </li>)}</ol> : null}
    {activity.data && !activity.data.audit.length ? <p>No integration activity yet.</p> : null}
    <div className="settings-actions">
      {cursor !== '0' ? <button className="secondary-action" onClick={() => setCursor('0')}>Newest activity</button> : null}
      {activity.data?.audit.length === 50 ? <button className="secondary-action" onClick={() => setCursor(activity.data!.nextCursor)}>Older activity</button> : null}
    </div>
  </div>;
}

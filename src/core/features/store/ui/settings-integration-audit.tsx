import { useResource } from '@/core/app/client/lib/use-resource';
import { useState } from 'react';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import { activityWords } from '@/core/features/auth/ui/activity-wording';

type Audit = {id: string; credentialId: string | null; credentialName: string | null; operatorName: string | null; operation: string; status: number; outcome: string; occurredAt: number};
export function IntegrationAudit() {
  const formatDate = useDateFormatter();
  const [cursor, setCursor] = useState('0');
  const activity = useResource<{audit: Audit[]; nextCursor: string}>(`/api/settings/integrations/audit?limit=50&cursor=${cursor}`);
  return <div className="integration-audit">
    <div className="section-heading"><h3>Integration activity</h3><button className="secondary-action" onClick={() => void activity.reload()}>Refresh activity</button></div>
    {activity.loading ? <p role="status">Loading activity…</p> : null}
    {activity.error ? <p className="inline-error" role="alert">Activity could not be loaded. Try refreshing it.</p> : null}
    {activity.data ? <ol className="integration-activity">{activity.data.audit.map(entry => <li key={entry.id}>
      <div><strong>{activityWords(`integration.${entry.operation}`)}</strong><small>{entry.credentialName ?? entry.operatorName ?? 'An unknown credential'}</small></div>
      <div><span>{entry.status >= 400 ? 'Refused' : entry.status ? 'Done' : 'In progress'}</span><time dateTime={new Date(entry.occurredAt).toISOString()}>{formatDate(entry.occurredAt)}</time></div>
    </li>)}</ol> : null}
    {activity.data && !activity.data.audit.length ? <p>No integration activity yet.</p> : null}
    <div className="settings-actions">
      {cursor !== '0' ? <button className="secondary-action" onClick={() => setCursor('0')}>Newest activity</button> : null}
      {activity.data?.audit.length === 50 ? <button className="secondary-action" onClick={() => setCursor(activity.data!.nextCursor)}>Older activity</button> : null}
    </div>
  </div>;
}

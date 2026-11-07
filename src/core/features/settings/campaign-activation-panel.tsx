import {useState} from 'react';
import {requestJson} from '@/core/app/client/lib/api';
import {useResource} from '@/core/app/client/lib/use-resource';
import {hasPermission} from '@/core/features/auth/permissions';
import type {SettingsOperator} from '@/core/features/store/ui/settings-operator-actions';

type ActivationPolicy = {
  approverOperatorId: string;
  approverName: string;
  generation: number;
  updatedAt: number;
};
type PolicyResponse = {policy: ActivationPolicy | null};
const policyPath = '/api/settings/campaign-activation';

export function CampaignActivationPanel({current}: {current: SettingsOperator}) {
  const resource = useResource<PolicyResponse>(policyPath);
  return <section className="panel" aria-labelledby="campaign-activation-title">
    <h2 id="campaign-activation-title">Campaign activation approval</h2>
    <p>Choose who approves machine-requested campaign activation. It stays held until that person approves the exact saved revision. Generating or adopting a proposal never schedules or sends it.</p>
    {resource.data ? <>
      <p>{resource.data.policy
        ? <>Required approver: <strong>{resource.data.policy.approverName}</strong>.</>
        : 'No company activation policy is configured. Campaigns still need ordinary operator approval.'}</p>
      {current.role === 'owner'
        ? <ApproverSelector policy={resource.data.policy} reload={resource.reload} />
        : <p className="muted-copy">Only an Owner can change the required approver.</p>}
    </> : resource.loading ? <p role="status">Loading activation policy…</p> : null}
    {resource.error ? <div className="inline-error" role="alert">
      <p>Unable to load the current activation policy.</p>
      <button type="button" className="secondary-action" onClick={() => void resource.reload()}>Refresh policy</button>
    </div> : null}
  </section>;
}

function ApproverSelector({policy, reload}: {
  policy: ActivationPolicy | null;
  reload: () => Promise<PolicyResponse | undefined>;
}) {
  const operators = useResource<{operators: SettingsOperator[]}>('/api/operators');
  const [selection, setSelection] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const eligible = operators.data?.operators.filter(operator =>
    operator.status === 'active' && hasPermission(operator.role, 'campaign.approve')) ?? [];
  const selectedId = selection ?? policy?.approverOperatorId ?? '';
  const selectedUnavailable = Boolean(selectedId && operators.data && !eligible.some(operator => operator.id === selectedId));

  async function changeApprover(approverOperatorId: string) {
    if (!approverOperatorId || busy) return;
    setSelection(approverOperatorId);
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await requestJson(policyPath, {
        method: 'PUT', body: JSON.stringify({approverOperatorId}),
      });
      if (response.status >= 300) {
        setError(response.status === 403
          ? 'Only an Owner can change this policy. Refresh the page to check your access.'
          : 'The approver could not be changed. Refresh operators and choose an active Owner, Admin or Manager.');
        return;
      }
      const refreshed = await reload();
      if (refreshed) setSelection(undefined);
      setNotice(refreshed ? 'Saved' : 'Saved. Refresh the policy to confirm the current approver.');
    } catch {
      setError('The change could not be confirmed. Your selection is kept; try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="settings-add-operator">
    <label htmlFor="campaign-activation-approver">Required approver</label>
    <select id="campaign-activation-approver" value={selectedId} disabled={busy || !operators.data || !eligible.length}
      onChange={event => void changeApprover(event.target.value)} aria-describedby="campaign-activation-help">
      <option value="" disabled>Choose an approver</option>
      {selectedUnavailable ? <option value={selectedId} disabled>{policy?.approverOperatorId === selectedId ? policy.approverName : 'Selected operator'} — unavailable</option> : null}
      {eligible.map(operator => <option key={operator.id} value={operator.id}>{operator.displayName} ({operator.email})</option>)}
    </select>
    <p id="campaign-activation-help" className="muted-copy">Active Owners, Admins and Managers can approve. Changes save immediately.</p>
    {!operators.data && operators.loading ? <p role="status">Loading operators…</p> : null}
    {operators.data && !eligible.length ? <p>No active operator has campaign approval rights.</p> : null}
    {selectedUnavailable ? <p className="inline-error">This operator is unavailable for approval. Choose an active approver.</p> : null}
    {operators.error ? <p className="inline-error" role="alert">Unable to load the operator list.</p> : null}
    {operators.error || error ? <button type="button" className="secondary-action" disabled={busy} onClick={() => void operators.reload()}>Refresh operators</button> : null}
    {error ? <div className="inline-error" role="alert"><p>{error}</p>
      <button type="button" className="secondary-action" disabled={busy || !eligible.some(operator => operator.id === selectedId)} onClick={() => void changeApprover(selectedId)}>Retry change</button>
    </div> : null}
    <p className="muted-copy" role="status">{busy ? 'Saving…' : notice}</p>
  </div>;
}

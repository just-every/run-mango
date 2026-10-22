import type { AttributionPolicy } from '../attribution-policy';
import './attribution-policy.css';

export function AttributionPolicyNote({ policy, channel }: { policy: AttributionPolicy; channel?: string }) {
  const window = channel === 'email' || channel === 'sms'
    ? `${channel === 'email' ? 'Email' : 'SMS'} ${policy.clickWindowDays[channel]}-day click window`
    : `Email ${policy.clickWindowDays.email} days · SMS ${policy.clickWindowDays.sms} days · click windows`;
  return <small className="attribution-policy-note">{policy.metricLabel} · {window}</small>;
}

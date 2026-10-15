import { formatDate } from '@/core/app/client/lib/format';
import { useResource } from '@/core/app/client/lib/use-resource';
import type { SenderStatus } from '@/core/features/settings/types';
import { SettingsSenderForm } from './settings-sender-form';
import { InboxCheck } from './settings-inbox-check';

const statusLabels = {
  ready: 'Sender check passed',
  blocked: 'Sending requirements not met',
  unavailable: 'Sender check unavailable',
  error: 'Sender check failed',
};

const evidenceLabels = [['provider', 'Provider domain'], ['dns', 'DNS records'], ['observation', 'Inbox check']] as const;
const readinessLabels = { observed: 'Observed', checked: 'Checked in DNS', 'not-observed': 'Not yet', unavailable: 'Unavailable', 'built-in': 'Built in', owner: 'Your decision' };

export function SettingsSender({ operatorEmail }: { operatorEmail: string }) {
  const sender = useResource<SenderStatus>('/api/settings/sender');
  return (
    <section className="panel settings-sender" aria-labelledby="sender-title" aria-busy={sender.loading}>
      <div className="section-heading">
        <div><p className="eyebrow">Sender identity</p><h2 id="sender-title">{sender.data?.identity.displayName || 'Configured sender'}</h2></div>
        <button type="button" className="secondary-action" disabled={sender.loading} onClick={() => void sender.reload()}>Check again</button>
      </div>
      {sender.error ? <p className="inline-error" role="alert">Unable to load sender settings. Try again.</p> : null}
      {sender.loading ? <p className="muted-copy" role="status">Checking sender settings…</p> : null}
      {sender.data ? <div className="settings-sender__body">
        <SettingsSenderForm identity={sender.data.identity} saved={sender.reload} />
        <div className="settings-sender__facts">
          <dl className="kv-list settings-identity">
            <div><dt>From</dt><dd>{sender.data.identity.fromEmail || 'Not configured'}</dd></div>
            <div><dt>Reply-to</dt><dd>{sender.data.identity.replyToEmail || 'Not configured'}</dd></div>
            <div><dt>Postal address</dt><dd>{sender.data.identity.physicalAddress || 'Not configured'}</dd></div>
          </dl>
          <div className={`settings-validation settings-validation--${sender.data.validation.state}`}>
            <p className="eyebrow">Email authentication</p>
            <h3>{statusLabels[sender.data.validation.state]}</h3>
            <p>{sender.data.validation.detail}</p>
            {sender.data.evidence && sender.data.validation.state !== 'unavailable' ? <dl className="settings-evidence">
              {evidenceLabels.map(([key, label]) => {
                const evidence = sender.data!.evidence![key];
                return <div key={key}><dt>{label}</dt><dd>
                  <strong className={`settings-evidence__state settings-evidence__state--${evidence.state}`}>{evidence.state === 'passed' ? 'Passed' : evidence.state === 'missing' ? 'Not yet' : evidence.state === 'stale' ? 'Expired' : evidence.state === 'unknown' ? 'Not checked' : evidence.state === 'failed' ? 'Failed' : 'Withdrawn'}</strong>
                  <span>{evidence.reason}</span>
                  {evidence.observedAt ? <small>Observed <time dateTime={evidence.observedAt}>{formatDate(evidence.observedAt)}</time></small> : null}
                  {evidence.expiresAt ? <small>Expires <time dateTime={evidence.expiresAt}>{formatDate(evidence.expiresAt)}</time></small> : null}
                </dd></div>;
              })}
            </dl> : null}
            <p className="muted-copy">Checked <time dateTime={sender.data.validation.checkedAt}>{formatDate(sender.data.validation.checkedAt)}</time>. Approval uses a fresh check for the saved campaign.</p>
          </div>
          {sender.data.validation.state !== 'unavailable' ? <InboxCheck status={sender.data} operatorEmail={operatorEmail} /> : null}
          <div className="settings-validation">
            <p className="eyebrow">Before the first real send</p>
            <dl className="settings-evidence" aria-label="Sending readiness">
              {sender.data.readiness.map(item => <div key={item.key}><dt>{item.label}</dt><dd>
                <strong className={`settings-evidence__state${item.state === 'observed' ? ' settings-evidence__state--passed' : ''}`}>{readinessLabels[item.state]}</strong>
                <span>{item.detail}</span>
              </dd></div>)}
            </dl>
            <p className="muted-copy"><a href="/docs/going-live">What each item means and what you supply</a></p>
          </div>
        </div>
      </div> : null}
    </section>
  );
}

import { SavedSegments } from './saved-segments';
import { Link } from '@tanstack/react-router';

import { formatDate } from '@/core/app/client/lib/format';
import type { Contact } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { EmptyState } from '@/core/app/client/ui/empty-state';
import { LoadState, StatusPill } from '@/core/app/client/ui/layout';

import { AudienceEmptyArt } from './audience-empty-art';
import { AudienceSignupTools } from './audience-signup-tools';

function countByStatus(contacts: Contact[], channel: 'emailStatus' | 'smsStatus', status: string) {
  return contacts.filter((contact) => contact[channel] === status).length;
}

export function AudiencePage() {
  const { data, error, loading } = useResource<{ contacts: Contact[] }>('/api/audience');
  if (loading) return <LoadState />;
  if (!data) return <LoadState error={error} />;
  const subscribedEmail = countByStatus(data.contacts, 'emailStatus', 'subscribed');
  const subscribedSms = countByStatus(data.contacts, 'smsStatus', 'subscribed');

  return (
    <div className="page-flow audience-page">
      <header className="page-head">
        <div className="page-head__text">
          <p className="eyebrow">Audience</p>
          <h1>Consent stays visible at every decision.</h1>
          <p className="page-head__lead">Each person keeps an independent Email and SMS status in the persisted contact ledger.</p>
        </div>
        <div className="page-head__actions">
          <Link className="primary-action" to="/app/audience/import">Import contacts</Link>
          <a className="secondary-action" href="/api/audience/export" download="audience.csv">Download contacts CSV</a>
        </div>
      </header>
      <section className="summary-grid" aria-label="Audience summary">
        <article className="summary-grid__tile summary-grid__tile--total"><span>Total contacts</span><strong>{data.contacts.length}</strong></article>
        <article className="summary-grid__tile summary-grid__tile--email"><span>Email subscribed</span><strong>{subscribedEmail}</strong></article>
        <article className="summary-grid__tile summary-grid__tile--sms"><span>SMS subscribed</span><strong>{subscribedSms}</strong></article>
      </section>
      <section className="panel data-table-panel audience-ledger">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Contact ledger</p>
            <h2>{data.contacts.length} saved contacts</h2>
          </div>
          <p className="muted-copy">Statuses are channel-specific.</p>
        </div>
        {data.contacts.length ? (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Saved contact ledger">
            <table className="responsive-table audience-ledger__table" aria-label="Saved contact ledger">
              <thead>
                <tr>
                  <th scope="col">Contact</th>
                  <th scope="col">Email consent</th>
                  <th scope="col">SMS consent</th>
                  <th scope="col">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {data.contacts.map((contact) => (
                  <tr key={contact.id}>
                    <th scope="row">
                      <Link to="/app/audience/$id" params={{ id: contact.id }}>
                        {contact.displayName}
                      </Link>
                      <small>{contact.email}</small>
                    </th>
                    <td data-label="Email consent"><StatusPill value={contact.emailStatus} /></td>
                    <td data-label="SMS consent"><StatusPill value={contact.smsStatus} /></td>
                    <td data-label="Last activity">{formatDate(contact.lastActivityAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState id="audience-empty-title" title="The ledger is empty" level={3} inPanel art={<AudienceEmptyArt />}>
            <p>No contacts have been imported into the persisted ledger.</p>
          </EmptyState>
        )}
      </section>
      <SavedSegments />
      <AudienceSignupTools />
      <section className="audience-rules notice-note">
        <p className="eyebrow">Eligibility rule</p>
        <h2>Subscribers are not the same as candidates.</h2>
        <p>
          The campaign review identifies candidate, excluded, and eligible counts separately. A
          contact may be eligible for Email and ineligible for SMS without changing either status.
        </p>
      </section>
    </div>
  );
}

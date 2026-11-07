import {ManualEntryForm} from './manual-entry-form';
import {Can} from '@/core/features/auth/ui/permissions';
import { AudienceExport } from './audience-export';
import { SavedSegments } from './saved-segments';
import { Link } from '@tanstack/react-router';
import { useCallback, useRef, useState, useEffect } from 'react';
import { usePermissions } from '@/core/features/auth/ui/permissions';

import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import type { Contact } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { EmptyState } from '@/core/app/client/ui/empty-state';
import { LoadState, StatusPill } from '@/core/app/client/ui/layout';

import { AudienceEmptyArt } from './audience-empty-art';
import { AudienceSignupTools } from './audience-signup-tools';
import { AudienceSearch, type AudienceSearchResult, type BulkOptions } from './audience-search';
import { AudienceBulk } from './audience-bulk';
import './audience-search.css';

function countByStatus(contacts: Contact[], channel: 'emailStatus' | 'smsStatus', status: string) {
  return contacts.filter((contact) => contact[channel] === status).length;
}

export function AudiencePage() {
  const formatDate = useDateFormatter();
  const { can } = usePermissions();
  const { data, error, loading, reload } = useResource<{ contacts: Contact[]; total?: number }>('/api/audience');
  const [result, setResult] = useState<AudienceSearchResult>();
  const [searching, setSearching] = useState(false);
  const [options, setOptions] = useState<BulkOptions>();
  const [selected, setSelected] = useState(new Set<string>());
  const [allMatching, setAllMatching] = useState(false);
  const selectVisible = useRef<HTMLInputElement>(null);
  const contacts = result?.contacts ?? data?.contacts ?? [];
  const total = result?.total ?? data?.total ?? contacts.length;
  const selectedCount = allMatching ? total : selected.size;
  const visibleSelected = contacts.filter(contact => selected.has(contact.id)).length;
  const clearSelection = useCallback(() => { setSelected(new Set()); setAllMatching(false); }, []);
  const receiveResult = useCallback((next: AudienceSearchResult | undefined) => {
    setResult(next); setSelected(new Set()); setAllMatching(false);
  }, []);
  const completeBulk = useCallback(() => {
    setResult(undefined); setSelected(new Set()); setAllMatching(false); void reload();
  }, [reload]);
  useEffect(() => {
    if (selectVisible.current) selectVisible.current.indeterminate = !allMatching && visibleSelected > 0 && visibleSelected < contacts.length;
  }, [allMatching, visibleSelected, contacts.length]);
  if (loading && !data) return <LoadState />;
  if (!data) return <LoadState error={error} />;
  const subscribedEmail = countByStatus(data.contacts, 'emailStatus', 'subscribed');
  const subscribedSms = countByStatus(data.contacts, 'smsStatus', 'subscribed');

  return (
    <div className="page-flow audience-page">
      <header className="page-head">
        <div className="page-head__text">
          <h1>Audience</h1>
        </div>
        <div className="page-head__actions">
          <Can permission="audience.import"><Link className="primary-action" to="/app/audience/import">Import contacts</Link></Can>
          <AudienceExport />
        </div>
      </header>
      <Can permission="contact.subscribe"><ManualEntryForm/></Can>
      <section className="summary-grid" aria-label="Audience summary">
        <article className="summary-grid__tile summary-grid__tile--total"><span>Total contacts</span><strong>{data.total ?? data.contacts.length}</strong></article>
        <article className="summary-grid__tile summary-grid__tile--email"><span>Email subscribed</span><strong>{subscribedEmail}</strong></article>
        <article className="summary-grid__tile summary-grid__tile--sms"><span>SMS subscribed</span><strong>{subscribedSms}</strong></article>
      </section>
      <section className="panel data-table-panel audience-ledger">
        <div className="section-heading">
          <div>
            <h2>{total.toLocaleString()} {total === 1 ? 'contact' : 'contacts'}</h2>
          </div>
        </div>
        <Can permission="contact.unmasked"><AudienceSearch applied={result?.label} onResult={receiveResult} onBusy={setSearching} onOptions={setOptions} /></Can>
        <Can permission="settings.manage">
          <AudienceBulk selection={allMatching ? { search: result?.search ?? { field: 'name', value: '' } } : { contactIds: [...selected] }} count={selectedCount} options={options} disabled={searching} onComplete={completeBulk} onClear={clearSelection} />
        </Can>
        {total > contacts.length ? <p className="muted-copy">Showing the first {contacts.length.toLocaleString()} of {total.toLocaleString()} matching contacts.</p> : null}
        {can('settings.manage') && contacts.length ? <div className="audience-selection">
          <label><input ref={selectVisible} type="checkbox" checked={allMatching || visibleSelected === contacts.length} disabled={searching} onChange={event => {
            setAllMatching(false); setSelected(event.target.checked ? new Set(contacts.map(contact => contact.id)) : new Set());
          }} />Select {contacts.length < total ? 'shown contacts' : 'all contacts'}</label>
          {total > contacts.length && !allMatching ? <button type="button" className="text-link" disabled={searching} onClick={() => { setSelected(new Set()); setAllMatching(true); }}>Select all {total.toLocaleString()} matching contacts</button> : null}
          {allMatching ? <span>All {total.toLocaleString()} matching contacts selected</span> : null}
        </div> : null}
        {contacts.length ? (
          <div className="table-scroll" tabIndex={0} role="region" aria-label="Contacts" aria-busy={searching}>
            <table className="responsive-table audience-ledger__table" aria-label="Contacts">
              <thead>
                <tr>
                  <th scope="col">Contact</th>
                  <th scope="col">Email consent</th>
                  <th scope="col">SMS consent</th>
                  <th scope="col">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <th scope="row">
                      <div className="audience-contact-identity">
                      {can('settings.manage') ? <label className="audience-contact-select"><input type="checkbox" aria-label={`Select ${contact.displayName}`} checked={allMatching || selected.has(contact.id)} disabled={searching} onChange={event => {
                        const next = new Set(allMatching ? contacts.map(item => item.id) : selected);
                        if (event.target.checked) next.add(contact.id); else next.delete(contact.id);
                        setSelected(next); setAllMatching(false);
                      }} /></label> : null}
                      <div>
                      <Link to="/app/audience/$id" params={{ id: contact.id }}>
                        {contact.displayName}
                      </Link>
                      <small>{contact.email}</small>
                      </div></div>
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
          <EmptyState id="audience-empty-title" title={result ? 'No matching contacts' : 'No contacts yet'} level={3} inPanel art={<AudienceEmptyArt />}>
            <p>{result ? 'Try another search value or clear the search.' : 'Import a list or add a contact by hand.'}</p>
          </EmptyState>
        )}
      </section>
      <Can permission="segment.manage"><SavedSegments /></Can>
      <Can permission="form.manage"><AudienceSignupTools /></Can>
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

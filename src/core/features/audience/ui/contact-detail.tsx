import {useState} from 'react';
import {ContactDelete,ContactErasureReceipt} from './contact-delete';
import type {ErasureReceipt} from '../erasure/types';
import {ContactRelated,type ContactRelatedData} from './contact-related';
import { ContactMerge } from './contact-merge';
import { Link, useParams, useSearch } from '@tanstack/react-router';

import { formatDate, titleCase } from '@/core/app/client/lib/format';
import type { Contact, ContactHistory } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState, StatusPill } from '@/core/app/client/ui/layout';
import { ContactConsentEvidencePanel, type ContactConsentEvidence, type ContactImportObservation } from './contact-consent-evidence';

type ContactDetail = ContactRelatedData & {
  contact: Contact;
  history: ContactHistory[];
  consent: ContactConsentEvidence[];
  importObservations: ContactImportObservation[];
};

export function ContactDetailPage(){
  const reference=(useSearch({strict:false}) as {erasure?:string}).erasure;
  return reference?<ReceiptPage reference={reference}/>:<ContactPage/>;
}
function ReceiptPage({reference}:{reference:string}){
  const {data,error,loading}=useResource<{receipt:ErasureReceipt}>(`/api/audience/erasures/${encodeURIComponent(reference)}`);
  if(loading)return <LoadState/>;
  return data?<ContactErasureReceipt initial={data.receipt}/>:<LoadState error={error??'Receipt was not found.'}/>;
}
function ContactPage() {
  const [receipt,setReceipt]=useState<ErasureReceipt>();
  const { id } = useParams({ from: '/app/audience_/$id' });
  const { data, error, loading } = useResource<ContactDetail>(`/api/contacts/${id}`);
  if(receipt)return <ContactErasureReceipt initial={receipt}/>;
  if (loading) return <LoadState />;
  if (!data) return <LoadState error={error ?? 'This contact was not found.'} />;

  return (
    <div className="page-flow contact-page">
      <header className="page-head contact-head">
        <div className="page-head__text">
          <Link className="back-link" to="/app/audience">← Back to audience</Link>
          <div className="contact-head__identity">
            <span className="contact-monogram" aria-hidden="true">{data.contact.displayName.slice(0, 1)}</span>
            <div>
              <p className="eyebrow">Contact record</p>
              <h1>{data.contact.displayName}</h1>
              <p className="page-head__lead">{data.contact.email}</p>
            </div>
          </div>
        </div>
        <div className="page-head__actions"><ContactMerge key={data.contact.id} contact={data.contact}/><ContactDelete id={data.contact.id} onReceipt={setReceipt}/></div>
      </header>
      <section className="contact-status-grid">
        <article className="contact-status-tile"><p className="contact-status-tile__label">Email</p><StatusPill value={data.contact.emailStatus} /><p>Updated {formatDate(data.contact.updatedAt)}</p></article>
        <article className="contact-status-tile"><p className="contact-status-tile__label">SMS</p><StatusPill value={data.contact.smsStatus} /><p>Updated {formatDate(data.contact.updatedAt)}</p></article>
        <article className="contact-status-tile"><p className="contact-status-tile__label">Last activity</p><h2>{formatDate(data.contact.lastActivityAt)}</h2><p>Only recorded facts appear in this history.</p></article>
      </section>
      <div className="contact-layout">
        <div className="contact-layout__records">
          <ContactConsentEvidencePanel consent={data.consent} observations={data.importObservations} />
          <ContactRelated data={data}/>
        </div>
        <section className="panel timeline" aria-labelledby="timeline-title">
          <p className="eyebrow">History</p>
          <h2 id="timeline-title">Recorded contact activity</h2>
          {data.history.length ? (
            <div className="timeline__events">
              {data.history.map((event) => (
                <article key={event.id} className="timeline__event">
                  <span aria-hidden="true" />
                  <div><strong>{titleCase(event.kind)}</strong><p>{event.detail}</p></div>
                  <time>{formatDate(event.occurredAt)}</time>
                </article>
              ))}
            </div>
          ) : <p className="muted-copy">No history has been recorded for this contact.</p>}
        </section>
      </div>
    </div>
  );
}

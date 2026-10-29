import {ContactProperties} from './contact-properties';
import {Can} from '@/core/features/auth/ui/permissions';
import {ContactSupport} from '@/core/features/auth/ui/contact-support';
import {ActionMenu} from '@/core/app/client/ui/action-menu';
import {useState} from 'react';
import {ContactDelete,ContactErasureReceipt} from './contact-delete';
import type {ErasureReceipt} from '../erasure/types';
import { ContactMerge } from './contact-merge';
import { Link, useParams, useSearch } from '@tanstack/react-router';

import { titleCase } from '@/core/app/client/lib/format';
import { ContactRetention } from '@/core/features/insights/ui/retention-report';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import type { Contact } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState, StatusPill } from '@/core/app/client/ui/layout';
import { ContactConsentEvidencePanel, type ContactConsentEvidence, type ContactImportObservation } from './contact-consent-evidence';
import type { ContactTimelineEntry } from '../contact-timeline';
import type { ContactProfile } from '../contact-profile';

type ContactDetail = {
  masked?:boolean;
  profile?:ContactProfile;
  emails:Array<{id:string;email:string;channelStatus:string}>;
  smsServices?:Array<{id:string;purpose:string;state:string;reason:string|null;provider_message_id:string|null;created_at:number}>;
  contact: Contact;
  phones:Array<{id:string;phoneE164:string;channelStatus:string}>;
  timeline: ContactTimelineEntry[];
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
  const formatDate = useDateFormatter();
  const [receipt,setReceipt]=useState<ErasureReceipt>();
  const [visibleEvents,setVisibleEvents]=useState(40);
  const { id } = useParams({ from: '/app/audience_/$id' });
  const { data, error, loading, reload } = useResource<ContactDetail>(`/api/contacts/${id}`);
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
              <p className="page-head__lead">{[data.contact.email,...data.phones.map(phone=>phone.phoneE164)].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
        </div>
        <div className="page-head__actions"><ActionMenu><ContactMerge key={data.contact.id} contact={data.contact}/><Can permission="contact.privacy-request"><ContactSupport contactId={id} reload={reload}/></Can><ContactDelete id={data.contact.id} onReceipt={setReceipt}/></ActionMenu></div>
      </header>
      <section className="contact-status-grid">
        <article className="contact-status-tile"><p className="contact-status-tile__label">Email</p><StatusPill value={data.contact.emailStatus} /><p>Updated {formatDate(data.contact.updatedAt)}</p></article>
        <article className="contact-status-tile"><p className="contact-status-tile__label">SMS</p><StatusPill value={data.contact.smsStatus} />{data.phones.map(phone=><p key={phone.id}>{phone.phoneE164} · {titleCase(phone.channelStatus)}</p>)}<p>Updated {formatDate(data.contact.updatedAt)}</p></article>
        <article className="contact-status-tile"><p className="contact-status-tile__label">Last activity</p><h2>{formatDate(data.contact.lastActivityAt)}</h2><p>Only recorded facts appear in this history.</p></article>
      </section>
      <div className="contact-layout">
        <div className="contact-layout__records">
          <ContactProfilePanels data={data} reload={reload}/>
          <Can permission="report.read"><ContactRetention contactId={id} /></Can>
          <ContactConsentEvidencePanel consent={data.consent} observations={data.importObservations} restricted={data.masked} />
          {data.smsServices?.length?<section className="panel"><h2>SMS confirmations and service replies</h2><p className="muted-copy">Queued messages wait for permitted windows. Unconfirmed handoffs are never repeated automatically.</p>{data.smsServices.map(message=><article key={message.id}><strong>{titleCase(message.purpose)}</strong><p>{titleCase(message.state)}{message.reason?` · ${titleCase(message.reason)}`:''}</p><small>{formatDate(new Date(message.created_at).toISOString())}{message.provider_message_id?` · Provider receipt ${message.provider_message_id}`:''}</small></article>)}</section>:null}
        </div>
        <section className="panel timeline" aria-labelledby="timeline-title">
          <p className="eyebrow">History</p>
          <h2 id="timeline-title">Recorded contact activity</h2>
          <p className="muted-copy">Newest first, using each source's original event time.</p>
          {data.timeline.length ? (
            <div className="timeline__events">
              {data.timeline.slice(0,visibleEvents).map((event) => (
                <article key={event.id} className="timeline__event" data-timeline-id={event.id} data-timeline-kind={event.kind} style={{minWidth:0,overflowWrap:'anywhere'}}>
                  <span aria-hidden="true" />
                  <div><strong>{titleCase(event.kind)}</strong><p>{event.detail}</p><small>Source: {event.source}</small>{event.campaignId?<p><Link to="/app/campaigns/$id" params={{id:event.campaignId}}>View campaign</Link></p>:null}</div>
                  <time dateTime={event.occurredAt} title={event.occurredAt}>{formatDate(event.occurredAt)}</time>
                </article>
              ))}
              {data.timeline.length>visibleEvents?<button type="button" className="secondary-action" onClick={()=>setVisibleEvents(count=>count+40)}>Show more activity ({data.timeline.length-visibleEvents} remaining)</button>:null}
            </div>
          ) : <p className="muted-copy">No history has been recorded for this contact.</p>}
        </section>
      </div>
    </div>
  );
}

function ContactProfilePanels({data,reload}:{data:ContactDetail;reload:()=>Promise<unknown>}) {
  const formatDate=useDateFormatter(),profile=data.profile;
  return <>
    <section className="panel" aria-label="Contact identities" style={{overflowWrap:'anywhere',minWidth:0}}><h2>Identities</h2>
      {data.emails.map(email=><p key={email.id}>{email.email} · Email · {titleCase(email.channelStatus)}</p>)}
      {data.phones.map(phone=><p key={phone.id}>{phone.phoneE164} · SMS · {titleCase(phone.channelStatus)}</p>)}
      {data.masked?<p>Identity details restricted for this role.</p>:profile?.mergedIdentities.length?<><h3>Merged identities</h3>{profile.mergedIdentities.map(identity=><p key={identity.id}>{identity.id} · Merged {formatDate(new Date(identity.occurredAt).toISOString())}</p>)}</>:<p>No merged identities.</p>}
    </section>
    <section className="panel" aria-label="Topics and channel consent" style={{overflowWrap:'anywhere',minWidth:0}}><h2>Topics and channel consent</h2>
      {(['email','sms'] as const).map(channel=><div key={channel}><h3>{channel==='email'?'Email':'SMS'} · {titleCase(channel==='email'?data.contact.emailStatus:data.contact.smsStatus)}</h3>
        {data.consent.filter(e=>e.channel===channel).length?data.consent.filter(e=>e.channel===channel).map(e=><article key={e.id}>
          <strong>{e.messageCategory}</strong><p>{titleCase(channel==='email'?data.contact.emailStatus:data.contact.smsStatus)} · {e.captureMethod==='incumbent-held'?'Incumbent-held evidence':e.confirmedAt?'Confirmed evidence':'Confirmation pending'}</p>
          <small>Evidence: {e.captureMethod} · {e.captureSource} · {formatDate(e.occurredAt)}</small>
        </article>):<p>No topic consent recorded.</p>}
      </div>)}<p className="muted-copy">Topic evidence never overrides a channel opt-out or suppression. Full evidence is shown below.</p>
    </section>
    {data.masked?<section className="panel" aria-label="Contact properties"><h2>Properties</h2><p>Properties restricted for this role.</p></section>:<ContactProperties id={data.contact.id} profile={profile} reload={reload}/>}
    <section className="panel" aria-label="Segment membership"><h2>Segment membership</h2>
      {data.masked?<p>Segment details restricted for this role.</p>:profile?.segments.length?profile.segments.map(segment=><p key={segment.id}>{segment.name} · {segment.state==='member'?'Member':'Membership unavailable: required evidence is unavailable'}</p>):<p>No segment membership.</p>}
      <p className="muted-copy">Calculated from current recorded facts using saved audience rules.</p>
    </section>
    <section className="panel" aria-label="Flow enrollments"><h2>Flow enrollments</h2><p>No flow enrollments.</p></section>
    <section className="panel" aria-label="Contact predictions"><h2>Predictions</h2><p>Predictions not available.</p></section>
  </>;
}

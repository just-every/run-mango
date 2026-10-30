import {catalogBlocks,type CatalogRenderings} from '../catalog-blocks';
import { useDateFormatter } from '@/core/app/client/lib/use-date-formatter';
import {requestJson} from '@/core/app/client/lib/api';
import {useDemoOrigin} from '@/core/app/client/lib/demo-origin';
import {analyticsContext} from '@/core/features/settings/analytics-policy';
import {mobileEnvelope} from '../email-mobile';
import { contactLink } from '../contact-links';
import type {SmsReviewPreview} from '@/core/features/sms/review-preview';
import { useEffect, useMemo, useState } from 'react';
import { renderMessageContent } from '../message-content';
import { contactPersonalisation } from '@/core/features/audience/contact-personalisation';
import { getJson } from '@/core/app/client/lib/api';
import { inspectEmailHtml } from '../email-html-policy';
import { sanitizeEmailPreview, previewDocument } from './sanitize-email-preview';
import type { Channel, Contact, Revision, RevisionLink } from '@/core/app/client/lib/types';
import { Paper } from '@/core/features/site/paper/Paper';

/** `mediaOrigin` is the deployment's own origin, where its campaign images are served (CAMP-012). */
export function RevisionPreviews({ revision, links, mediaOrigin, selectedChannels, smsPreview, preflightTools = true }: { revision: Revision; links: RevisionLink[]; mediaOrigin?: string; selectedChannels?: readonly Channel[]; smsPreview?:SmsReviewPreview; preflightTools?:boolean }) {
  const formatDate = useDateFormatter();
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light');
  const [contact, setContact] = useState<Contact>();
  const [propertyValues,setPropertyValues]=useState<{id:string;values:Record<string,string|undefined>}>(),[propertyError,setPropertyError]=useState('');
  useEffect(()=>{let active=true;setPropertyValues(undefined);setPropertyError('');if(!contact)return;void getJson<{values:Record<string,string|undefined>}>(`/api/contacts/${encodeURIComponent(contact.id)}/personalisation`).then(result=>{if(active)setPropertyValues({id:contact.id,values:result.values});}).catch(()=>{if(active)setPropertyError('Contact property values could not be loaded. Select the contact again.');});return()=>{active=false;};},[contact?.id]);
  const [loadImages, setLoadImages] = useState(false);
  const needsCatalog=catalogBlocks(revision.emailBody).length>0;
  const [catalog,setCatalog]=useState<{body:string;values:CatalogRenderings}>(),[catalogError,setCatalogError]=useState('');
  useEffect(()=>{let current=true;setCatalogError('');if(!needsCatalog)return;void requestJson<{renderings?:CatalogRenderings}>('/api/catalog/preview',{method:'POST',body:JSON.stringify({emailBody:revision.emailBody})}).then(result=>{if(!current)return;if(result.status!==200||!result.data.renderings){setCatalogError('Current catalog values are unavailable.');return;}setCatalog({body:revision.emailBody,values:result.data.renderings});}).catch(()=>{if(current)setCatalogError('Current catalog values are unavailable.');});return()=>{current=false;};},[revision.id,revision.updatedAt,revision.emailBody]);
  const catalogValues=catalog?.body===revision.emailBody?catalog.values:undefined;
  const previewRevision=contact&&propertyError?{...revision,emailSubject:'Contact preview unavailable',emailBody:'<p>Contact preview is unavailable because saved values could not be loaded.</p>',emailText:'Contact preview unavailable.',smsBody:'Contact preview unavailable.'}:needsCatalog&&!catalogValues?{...revision,emailBody:'<p>Catalog preview is unavailable until current values are read.</p>',emailText:'Catalog preview unavailable.'}:revision;

  const rendered = useMemo(() => renderMessageContent({...previewRevision, preheader: revision.preheader ?? '', physicalAddress: revision.physicalAddress ?? ''}, {
    catalog:catalogValues,analytics:analyticsContext(revision),
    values: contact ? propertyValues?.id===contact.id?propertyValues.values:contactPersonalisation(contact, contact.email ?? '') : {displayName: 'Alex Example'},
    unsubscribeUrl: 'https://preview.invalid/unsubscribe/example',
  }), [revision, contact, catalogValues,propertyValues,propertyError]);
  const responsive=mobileEnvelope(revision.emailBody);
  const dependent=[responsive.settings.some(row=>row.hideOnMobile)?'hide on mobile':'',responsive.settings.some(row=>row.hideOnDesktop)?'hide on desktop':'',responsive.settings.some(row=>row.orientation)?'mobile orientation':'',responsive.settings.some(row=>row.fontSize!==undefined)?'mobile font size':'',responsive.settings.some(row=>row.lineHeight!==undefined)?'mobile line height':'',responsive.settings.some(row=>row.padding!==undefined)?'mobile padding':'',responsive.settings.some(row=>row.alignment)?'mobile alignment':''].filter(Boolean);
  const showEmail = selectedChannels?.includes('email') ?? true;
  const showSms = selectedChannels?.includes('sms') ?? Boolean(rendered.sms.trim() || revision.smsSender.trim());
  const demoOrigin = useDemoOrigin();
  const issues = useMemo(() => inspectEmailHtml(revision.emailBody, mediaOrigin, demoOrigin).issues, [revision.emailBody, mediaOrigin, demoOrigin]);
  useEffect(() => {setLoadImages(false)}, [revision.id, revision.updatedAt]);
  // Approval remounts this preview outside the editor. Supply its complete document on that first render.
  const preview = useMemo(() => sanitizeEmailPreview(rendered.html, loadImages, issues.length === 0, mediaOrigin), [rendered.html, loadImages, issues, mediaOrigin]);
  return (
    <section className="preview-grid" aria-label="Saved revision previews">
      {propertyError?<p role="alert">{propertyError}</p>:contact&&propertyValues?.id!==contact.id?<p role="status">Reading contact property values…</p>:null}
      {needsCatalog?<p role={catalogError?'alert':'status'}>{catalogError||(!catalogValues?'Reading current catalog values…':'Catalog read at '+formatDate(Object.values(catalogValues)[0]?.readAt))}</p>:null}
      {showEmail ? <article className="message-preview message-preview--email">
        <Paper w={640} h={760} seed={41} className="app-sheet email-sheet">
          <p className="eyebrow">Email · saved revision</p>
          <p className="preview-sender">{revision.senderName.trim() ? <span className="preview-sender__mark" aria-hidden="true">{revision.senderName.trim().charAt(0)}</span> : null}{revision.senderName}</p>
          <h3>{rendered.subject.trim() ? rendered.subject : 'Email subject not saved'}</h3>
          <p className="muted-copy">Preheader: {rendered.preheader || 'Not saved'}</p>
          <p className="muted-copy">{contact ? `Contact: ${contact.displayName}${contact.email ? ` (${contact.email})` : ''}` : 'Example: Alex Example'}; missing personalisation values use their saved fallback. Links are inactive. Unsubscribe uses an example URL.</p>
          {preflightTools ? <PreviewContact selected={contact} onSelect={setContact} /> : null}
          <div className="preview-controls" role="group" aria-label="Email preview width">
            <button type="button" className="secondary-action" aria-pressed={width === 'desktop'} onClick={() => setWidth('desktop')}>Desktop email</button>
            <button type="button" className="secondary-action" aria-pressed={width === 'mobile'} onClick={() => setWidth('mobile')}>Mobile email</button>
          </div>
          {preflightTools ? <div className="preview-controls" role="group" aria-label="Email preview appearance">
            <button type="button" className="secondary-action" aria-pressed={appearance === 'light'} onClick={() => setAppearance('light')}>Light mode</button>
            <button type="button" className="secondary-action" aria-pressed={appearance === 'dark'} onClick={() => setAppearance('dark')}>Dark approximation</button>
          </div> : null}
          {responsive.style?<p className="muted-copy">Mobile overrides require the generated style block. Settings: {dependent.join(', ')}. A mail client that removes the block shows hidden content and uses the fluid layout.</p>:null}
          {appearance === 'dark' ? <p className="muted-copy">Approximate colour inversion; email clients apply dark mode differently. Check a test email in your target inboxes.</p> : null}
          {issues.length > 0 ? <p className="inline-error" role="alert">Unsafe or unsupported HTML is removed from this preview, which then shows no styling, and blocks approval: {issues.join(' ')}</p> : null}
          <div className={`email-preview-frame email-preview-frame--${width}`}>
            <iframe title="Saved email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={previewDocument(preview.html, loadImages, mediaOrigin, appearance)} />
          </div>
          {preview.imagesBlocked > 0 && !loadImages ? <button type="button" className="secondary-action" onClick={() => setLoadImages(true)}>Load {preview.imagesBlocked} remote image{preview.imagesBlocked === 1 ? '' : 's'}</button> : null}
          {loadImages ? <button type="button" className="secondary-action" onClick={() => setLoadImages(false)}>Block remote images</button> : null}
          <small>From {revision.fromEmail} · Reply-to {revision.replyToEmail}</small>
        </Paper>
      </article> : null}
      {showSms ? <article className="message-preview message-preview--sms">
        <p className="eyebrow">SMS · saved revision</p>
        <p className="preview-sender">Sender {revision.smsSender}</p>
        {smsPreview?.examples.length?smsPreview.examples.map(example=><div key={example.destination}><p>{example.destination}</p><p className="preview-plain-text">{example.text}</p><strong>{example.segments} SMS segments · {example.encoding}</strong></div>):<p>{rendered.sms}</p>}
        <small>{smsPreview?.detail??'Draft text only. Open review for recipient examples with managed disclosures, tracked links and segment counts.'}</small>
      </article>
      : showEmail ? <p className="muted-copy preview-sms-off">Text messages are disabled for this email-only campaign.</p> : null}
      {showEmail ? <article className="message-preview message-preview--plain">
        <p className="eyebrow">Plain text · saved revision</p>
        <p className="preview-plain-text">{rendered.text}</p>
      </article> : null}
      <article className="message-preview message-preview--links">
        <p className="eyebrow">Links · saved revision</p>
        {links.length ? (
          <ul className="saved-links">
            {links.map((link) => (
              <li key={link.id}>
                <strong>{link.label}</strong>
                <span>{link.destinationUrl}</span>
                {contactLink(link.destinationUrl) ? <ContactLinkDetails destination={link.destinationUrl} /> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-copy">No links are saved on this revision.</p>
        )}
      </article>
    </section>
  );
}

function PreviewContact({selected, onSelect}: {selected?: Contact; onSelect: (contact?: Contact) => void}) {
  const [address, setAddress] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const search = async () => {
    setBusy(true); setNotice(''); setContacts([]);
    try {
      const result = await getJson<{contacts: Contact[]}>(`/api/contacts/search?address=${encodeURIComponent(address.trim())}`);
      setContacts(result.contacts);
      if (!result.contacts.length) setNotice('No contacts match that address.');
    } catch { setNotice('Contact search could not be loaded. Try again.'); }
    finally { setBusy(false); }
  };
  return <details>
    <summary>Preview as a contact</summary>
    <form onSubmit={event => {event.preventDefault(); event.stopPropagation(); void search();}}>
      <label>Contact email or phone<input style={{width: '100%', minWidth: 0}} value={address} minLength={2} maxLength={320} required disabled={busy} onChange={event => {setAddress(event.target.value); setContacts([]); setNotice('');}} /></label>
      <button type="submit" className="secondary-action" disabled={busy || address.trim().length < 2}>{busy ? 'Searching…' : 'Find preview contact'}</button>
    </form>
    {notice ? <p role="status">{notice}</p> : null}
    {contacts.length ? <label>Preview contact<select aria-label="Preview contact" style={{width: '100%', minWidth: 0}} value={selected?.id ?? ''} onChange={event => onSelect(contacts.find(contact => contact.id === event.target.value))}>
      <option value="">Example: Alex Example</option>
      {contacts.map(contact => <option key={contact.id} value={contact.id}>{contact.displayName}{contact.email ? ` (${contact.email})` : ''}</option>)}
    </select></label> : null}
    {selected ? <button type="button" className="text-link" onClick={() => onSelect(undefined)}>Use example contact</button> : null}
    <p className="muted-copy">Uses saved contact values and the same property formatting and fallbacks as delivery. Preview selection does not change the campaign audience.</p>
  </details>;
}

function ContactLinkDetails({destination}: {destination: string}) {
  const link = contactLink(destination)!;
  return <small>{link.kind === 'email' ? 'Email' : link.kind === 'phone' ? 'Phone' : 'Text'}: {link.destination}{link.subject !== undefined ? ` · Subject: ${link.subject}` : ''}{link.body !== undefined ? ` · Body: ${link.body}` : ''} · No click tracking</small>;
}

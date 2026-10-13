import { useEffect, useMemo, useState } from 'react';
import { renderMessageContent } from '../message-content';
import { inspectEmailHtml } from '../email-html-policy';
import { sanitizeEmailPreview, previewDocument } from './sanitize-email-preview';
import type { Revision, RevisionLink } from '@/core/app/client/lib/types';
import { Paper } from '@/core/features/site/paper/Paper';

/** `mediaOrigin` is the deployment's own origin, where its campaign images are served (CAMP-012). */
export function RevisionPreviews({ revision, links, mediaOrigin }: { revision: Revision; links: RevisionLink[]; mediaOrigin?: string }) {
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [loadImages, setLoadImages] = useState(false);
  const [preview, setPreview] = useState({html: '', imagesBlocked: 0});
  const rendered = useMemo(() => renderMessageContent({...revision, preheader: revision.preheader ?? '', physicalAddress: revision.physicalAddress ?? ''}, {
    values: {first_name: 'Alex', name: 'Alex Example', displayName: 'Alex Example'},
    unsubscribeUrl: 'https://preview.invalid/unsubscribe/example',
  }), [revision]);
  const issues = useMemo(() => inspectEmailHtml(revision.emailBody, mediaOrigin).issues, [revision.emailBody, mediaOrigin]);
  useEffect(() => {setLoadImages(false)}, [revision.id, revision.updatedAt]);
  useEffect(() => {setPreview(sanitizeEmailPreview(rendered.html, loadImages, issues.length === 0, mediaOrigin))}, [rendered.html, loadImages, issues, mediaOrigin]);
  return (
    <section className="preview-grid" aria-label="Saved revision previews">
      <article className="message-preview message-preview--email">
        <Paper w={640} h={760} seed={41} className="app-sheet email-sheet">
          <p className="eyebrow">Email · saved revision</p>
          <p className="preview-sender">{revision.senderName.trim() ? <span className="preview-sender__mark" aria-hidden="true">{revision.senderName.trim().charAt(0)}</span> : null}{revision.senderName}</p>
          <h3>{rendered.subject.trim() ? rendered.subject : 'Email subject not saved'}</h3>
          <p className="muted-copy">Preheader: {rendered.preheader || 'Not saved'}</p>
          <p className="muted-copy">Example: Alex Example; other personalisation uses its saved fallback. Links are inactive. Unsubscribe uses an example URL.</p>
          <div className="preview-controls" role="group" aria-label="Email preview width">
            <button type="button" className="secondary-action" aria-pressed={width === 'desktop'} onClick={() => setWidth('desktop')}>Desktop email</button>
            <button type="button" className="secondary-action" aria-pressed={width === 'mobile'} onClick={() => setWidth('mobile')}>Mobile email</button>
          </div>
          {issues.length > 0 ? <p className="inline-error" role="alert">Unsafe or unsupported HTML is removed from this preview, which then shows no styling, and blocks approval: {issues.join(' ')}</p> : null}
          <div className={`email-preview-frame email-preview-frame--${width}`}>
            <iframe title="Saved email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={previewDocument(preview.html, loadImages, mediaOrigin)} />
          </div>
          {preview.imagesBlocked > 0 && !loadImages ? <button type="button" className="secondary-action" onClick={() => setLoadImages(true)}>Load {preview.imagesBlocked} remote image{preview.imagesBlocked === 1 ? '' : 's'}</button> : null}
          {loadImages ? <button type="button" className="secondary-action" onClick={() => setLoadImages(false)}>Block remote images</button> : null}
          <small>From {revision.fromEmail} · Reply-to {revision.replyToEmail}</small>
        </Paper>
      </article>
      {rendered.sms.trim() || revision.smsSender.trim() ? <article className="message-preview message-preview--sms">
        <p className="eyebrow">SMS · saved revision</p>
        <p className="preview-sender">Sender {revision.smsSender}</p>
        <p>{rendered.sms}</p>
      </article>
      : <p className="muted-copy preview-sms-off">Text messages are disabled for this email-only campaign.</p>}
      <article className="message-preview message-preview--plain">
        <p className="eyebrow">Plain text · saved revision</p>
        <p className="preview-plain-text">{rendered.text}</p>
      </article>
      <article className="message-preview message-preview--links">
        <p className="eyebrow">Links · saved revision</p>
        {links.length ? (
          <ul className="saved-links">
            {links.map((link) => (
              <li key={link.id}>
                <strong>{link.label}</strong>
                <span>{link.destinationUrl}</span>
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

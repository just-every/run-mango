import { useState } from 'react';
import { escapeHtml } from '../email-html-policy';
import { safeEmailLink } from '../contact-links';
import { useDemoOrigin } from '@/core/app/client/lib/demo-origin';

export function MessageLinkTool({onInsert, disabled}: {onInsert: (html: string) => void; disabled: boolean}) {
  const demoOrigin = useDemoOrigin();
  const [kind, setKind] = useState('web'), [label, setLabel] = useState(''), [destination, setDestination] = useState('');
  const [subject, setSubject] = useState(''), [body, setBody] = useState('');
  const params = new URLSearchParams();
  if (kind === 'email' && subject) params.set('subject', subject);
  if (['email', 'text'].includes(kind) && body) params.set('body', body);
  const uri = kind === 'web' ? destination : `${kind === 'email' ? 'mailto' : kind === 'phone' ? 'tel' : 'sms'}:${encodeURIComponent(destination).replaceAll('%40', '@').replaceAll('%2B', '+')}${params.size ? `?${params.toString().replaceAll('+', '%20')}` : ''}`;
  return <details className="rich-email-link"><summary>Add a link to the message</summary>
    <div className="rich-email-link__fields">
      <label>Link kind<select value={kind} onChange={event => {setKind(event.target.value); setDestination('');}}>
        <option value="web">Web</option><option value="email">Email</option><option value="phone">Phone</option><option value="text">Text</option>
      </select></label>
      <label>Link text<input value={label} onChange={event => setLabel(event.target.value)} /></label>
      <label>{kind === 'web' ? 'Link URL' : kind === 'email' ? 'Email address' : 'Phone number'}<input type="text" value={destination} onChange={event => setDestination(event.target.value)} /></label>
      {kind === 'email' ? <label>Email link subject<input value={subject} onChange={event => setSubject(event.target.value)} /></label> : null}
      {['email', 'text'].includes(kind) ? <label>Link message<input value={body} onChange={event => setBody(event.target.value)} /></label> : null}
      <button type="button" className="secondary-action" disabled={disabled || !label.trim() || !safeEmailLink(uri, false, demoOrigin)} onClick={() => {
        onInsert(`<p><a href="${escapeHtml(uri)}">${escapeHtml(label)}</a></p>`);
        setLabel(''); setDestination(''); setSubject(''); setBody('');
      }}>Insert link</button>
    </div>
  </details>;
}

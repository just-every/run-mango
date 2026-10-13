import { Field } from '@/core/app/client/ui/validation-form';
import { useEffect, useRef, useState } from 'react';
import { escapeHtml } from '../email-html-policy';
import { authoredBody, htmlToText } from '../authoring-content';
import { authoredEditorHtml, editorHtml } from './editor-html';
import { protectAuthoringTokens } from '../authoring-tokens';

export function RichEmailEditor({value, onChange, busy}: {value:string; busy:boolean; onChange:(value:string)=>void}) {
  const [mode,setMode] = useState<'rich'|'html'>('rich');
  const [linkUrl,setLinkUrl]=useState(''),[linkLabel,setLinkLabel]=useState('');
  const editor = useRef<HTMLDivElement>(null);
  const body = authoredBody(value);
  const hasImages = /<img\b/i.test(protectAuthoringTokens(body).html);
  const htmlMode = mode==='html' || hasImages;
  useEffect(() => { if (editor.current && authoredEditorHtml(editor.current) !== body) editor.current.innerHTML = editorHtml(body); }, [body,mode]);
  const paste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html=event.clipboardData.getData('text/html');
    if (/<img\b/i.test(protectAuthoringTokens(html).html)) {setMode('html');onChange(body+html);return;}
    if(html) document.execCommand('insertHTML',false,editorHtml(html));
    else document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));
    if(editor.current)onChange(authoredEditorHtml(editor.current));
  };
  const format = (command:string) => { editor.current?.focus(); document.execCommand(command); if (editor.current) onChange(authoredEditorHtml(editor.current)); };
  return <fieldset className="composition-fieldset rich-email-fieldset"><legend>Email body (required for approval)</legend>
    <div className="detail-actions editor-mode"><button type="button" className="secondary-action" disabled={hasImages} aria-pressed={!htmlMode} onClick={()=>setMode('rich')}>Rich text</button><button type="button" className="secondary-action" aria-pressed={htmlMode} onClick={()=>setMode('html')}>HTML mode</button></div>
    {hasImages?<p className="muted-copy">This email contains images. Edit its HTML to preserve the image markup without loading remote images.</p>:null}
    {htmlMode ? <label>HTML email body<Field name="emailBody" label="Email body" required advisory validate={() => htmlToText(body).trim() ? undefined : "Write the email body."}><textarea aria-label="Email body" value={body} onChange={event=>onChange(event.target.value)} rows={9}/></Field></label> : <>
      <div className="detail-actions rich-email-toolbar" aria-label="Text formatting">{[['bold','Bold'],['italic','Italic'],['insertUnorderedList','Bullet list']].map(([command,label])=><button key={command} type="button" className="secondary-action" onMouseDown={event=>event.preventDefault()} onClick={()=>format(command)}>{label}</button>)}</div>
      <Field name="emailBody" label="Email body" advisory validate={() => htmlToText(body).trim() ? undefined : "Write the email body."}><div ref={editor} contentEditable={!busy} aria-disabled={busy} suppressContentEditableWarning role="textbox" aria-label="Email body" aria-required="true" aria-multiline="true" className="rich-email-editor" onPaste={paste} onDrop={event=>event.preventDefault()} onClick={event=>{if ((event.target as Element).closest('a')) event.preventDefault();}} onInput={event=>onChange(authoredEditorHtml(event.currentTarget))} /></Field>
    </>}
    <details className="rich-email-link"><summary>Add a link to the message</summary><div className="rich-email-link__fields"><label>Link text<input value={linkLabel} onChange={event=>setLinkLabel(event.target.value)}/></label><label>Link URL<input type="url" value={linkUrl} onChange={event=>setLinkUrl(event.target.value)}/></label><button type="button" className="secondary-action" disabled={!linkLabel.trim() || !/^https:\/\//.test(linkUrl)} onClick={()=>{onChange(body+`<p><a href="${escapeHtml(linkUrl)}">${escapeHtml(linkLabel)}</a></p>`);setLinkLabel('');setLinkUrl('');}}>Insert link</button></div></details>
    <p className="muted-copy">Unsubscribe and your postal address are added automatically when saved. Plain text is generated with the same destination links.</p>
    <label>Plain-text email<textarea aria-label="Plain-text email" readOnly value={htmlToText(value)} rows={5}/></label>
  </fieldset>;
}

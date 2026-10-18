import { Field } from '@/core/app/client/ui/validation-form';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MessageLinkTool } from './message-link-tool';
import { requiresHtmlEditing } from '../email-presentation';
import { authoredBody, htmlToText } from '../authoring-content';
import { authoredEditorHtml, editorHtml } from './editor-html';
import { InsertImage } from '@/core/features/campaign-assets/ui/insert-image';

export function RichEmailEditor({value, onChange, busy, designImport}: {value:string; busy:boolean; onChange:(value:string)=>void; designImport?: ReactNode}) {
  const [mode,setMode] = useState<'rich'|'html'>('rich');
  const editor = useRef<HTMLDivElement>(null), caret = useRef<number>(undefined);
  const body = authoredBody(value);
  const htmlOnly = requiresHtmlEditing(body);
  const htmlMode = mode==='html' || htmlOnly;
  useEffect(() => { if (editor.current && authoredEditorHtml(editor.current) !== body) editor.current.innerHTML = editorHtml(body); }, [body,mode]);
  const paste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html=event.clipboardData.getData('text/html');
    if (requiresHtmlEditing(html)) {setMode('html');onChange(body+html);return;}
    if(html) document.execCommand('insertHTML',false,editorHtml(html));
    else document.execCommand('insertText',false,event.clipboardData.getData('text/plain'));
    if(editor.current)onChange(authoredEditorHtml(editor.current));
  };
  // At the HTML cursor, or at the end when the cursor is unknown or sits inside a tag.
  const insertHtml = (html: string) => {
    let at = Math.min(caret.current ?? body.length, body.length);
    const before = body.slice(0, at);
    if (before.lastIndexOf('<') > before.lastIndexOf('>')) at = body.length;
    caret.current = at + html.length;
    onChange(body.slice(0, at) + html + body.slice(at));
  };
  const format = (command:string) => { editor.current?.focus(); document.execCommand(command); if (editor.current) onChange(authoredEditorHtml(editor.current)); };
  return <fieldset className="composition-fieldset rich-email-fieldset"><legend>Email body (required for approval)</legend>
    <div className="detail-actions editor-mode"><button type="button" className="secondary-action" disabled={htmlOnly} aria-pressed={!htmlMode} onClick={()=>setMode('rich')}>Rich text</button><button type="button" className="secondary-action" aria-pressed={htmlMode} onClick={()=>setMode('html')}>HTML mode</button></div>
    {designImport}
    {htmlOnly?<p className="muted-copy">This email contains images or styling. Edit its HTML to keep that markup exactly, without loading remote images.</p>:null}
    {htmlMode ? <>
      <div className="detail-actions"><InsertImage disabled={busy} onInsert={insertHtml} /></div>
      <label>HTML email body<Field name="emailBody" label="Email body" required advisory validate={() => htmlToText(body).trim() ? undefined : "Write the email body."}><textarea aria-label="Email body" value={body} onChange={event=>onChange(event.target.value)} onSelect={event=>{caret.current=event.currentTarget.selectionEnd;}} rows={9}/></Field></label>
    </> : <>
      <div className="detail-actions rich-email-toolbar" aria-label="Text formatting">{[['bold','Bold'],['italic','Italic'],['insertUnorderedList','Bullet list']].map(([command,label])=><button key={command} type="button" className="secondary-action" onMouseDown={event=>event.preventDefault()} onClick={()=>format(command)}>{label}</button>)}</div>
      <Field name="emailBody" label="Email body" advisory validate={() => htmlToText(body).trim() ? undefined : "Write the email body."}><div ref={editor} contentEditable={!busy} aria-disabled={busy} suppressContentEditableWarning role="textbox" aria-label="Email body" aria-required="true" aria-multiline="true" className="rich-email-editor" onPaste={paste} onDrop={event=>event.preventDefault()} onClick={event=>{if ((event.target as Element).closest('a')) event.preventDefault();}} onInput={event=>onChange(authoredEditorHtml(event.currentTarget))} /></Field>
    </>}
    <MessageLinkTool disabled={busy} onInsert={html => onChange(body + html)} />
    <p className="muted-copy">Unsubscribe and your postal address are added automatically when saved. Plain text is generated with the same destination links.</p>
    <label>Plain-text email<textarea aria-label="Plain-text email" readOnly value={htmlToText(value)} rows={5}/></label>
  </fieldset>;
}

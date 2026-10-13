import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ModalProps = {open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; role?: 'alertdialog' | 'dialog'};
/** A confirmation owns no action until its explicit confirmation button is pressed. The backdrop portals to <body>, outside
 * the app root, so it carries `mango-app` itself. */
export function Modal({open, onClose, title, description, children, role = 'alertdialog'}: ModalProps) {
  const panel = useRef<HTMLDivElement>(null), close = useRef(onClose);
  const id = useId(); close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const controls = () => Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]') ?? []).filter(element => element.getClientRects().length);
    (controls()[0] ?? panel.current)?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); close.current();}
      if (event.key !== 'Tab') return;
      const items = controls(), first = items[0], last = items.at(-1);
      if (!first) {event.preventDefault(); panel.current?.focus(); return;}
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {event.preventDefault(); last?.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    };
    const keepFocus = (event: FocusEvent) => {if (event.target instanceof Node && !panel.current?.contains(event.target)) (controls()[0] ?? panel.current)?.focus();};
    document.addEventListener('keydown', keydown, true); document.addEventListener('focusin', keepFocus);
    return () => {document.removeEventListener('keydown', keydown, true); document.removeEventListener('focusin', keepFocus); document.body.style.overflow = previousOverflow; if (opener?.isConnected) opener.focus();};
  }, [open]);
  if (!open) return null;
  return createPortal(<div className="modal-backdrop mango-app"><div className="panel modal-panel" ref={panel} tabIndex={-1} role={role} aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-description` : undefined}><h2 id={`${id}-title`}>{title}</h2>{description ? <p id={`${id}-description`}>{description}</p> : null}{children}</div></div>, document.body);
}

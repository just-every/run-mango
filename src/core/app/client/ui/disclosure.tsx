import { useId, useState, type ReactNode } from 'react';
export function Disclosure({title, children, className = ''}: {title: ReactNode; children: ReactNode; className?: string}) {
  const [open, setOpen] = useState(false), id = useId();
  return <section className={className}><button type="button" className="disclosure-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>{title}</button><div id={id} hidden={!open}>{children}</div></section>;
}

import type { ReactNode } from 'react';

type EmptyStateProps = {
  /** The heading's id, which labels the state. */
  id: string;
  title: string;
  /** The heading level: 2 on a page of its own, 3 inside a panel that has its own heading, 1 for a missing page. */
  level?: 1 | 2 | 3;
  /** A small paper-and-post drawing: decorative (.empty-art, aria-hidden), or an Art with its own label. */
  art: ReactNode;
  /** The one line (and, where a state needs it, the short list it introduces). */
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Inside a panel: no sheet of its own, set under the panel's heading on a hairline. */
  inPanel?: boolean;
};

/** The one empty state (surfaces.css): the drawing beside a short heading, one line and an optional action. */
export function EmptyState({ id, title, level = 2, art, children, action, className, inPanel = false }: EmptyStateProps) {
  const Heading = `h${level}` as const;
  const classes = ['empty-state', inPanel ? 'empty-state--in-panel' : 'empty-panel', className].filter(Boolean).join(' ');
  const body = (
    <>
      {art}
      <div className="empty-state__text">
        <Heading id={id}>{title}</Heading>
        {children}
        {action ? <div className="empty-state__action">{action}</div> : null}
      </div>
    </>
  );
  return inPanel
    ? <div className={classes} role="group" aria-labelledby={id}>{body}</div>
    : <section className={classes} aria-labelledby={id}>{body}</section>;
}

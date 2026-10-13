import type { ReactNode } from 'react';

type ArtProps = {
  /** What the picture shows. */
  label: string;
  /** For a drawing that shows less on a phone: what that smaller layout shows. CSS exposes the label that matches. */
  phoneLabel?: string;
  className: string;
  children: ReactNode;
};

/**
 * A drawing with its accessible description. The drawing's own text is sample content, hidden from assistive technology;
 * the label says what the picture shows.
 */
export function Art({ label, phoneLabel, className, children }: ArtProps) {
  const inner = <div className="art-inner" aria-hidden="true">{children}</div>;
  if (!phoneLabel) return <div className={`art ${className}`} role="img" aria-label={label}>{inner}</div>;
  return (
    <div className={`art ${className}`}>
      <span className="art-label art-label--wide" role="img" aria-label={label} />
      <span className="art-label art-label--phone" role="img" aria-label={phoneLabel} />
      {inner}
    </div>
  );
}

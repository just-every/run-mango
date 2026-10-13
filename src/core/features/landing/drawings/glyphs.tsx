// Tiny pen glyphs used inside the drawings. All decorative, inside aria-hidden art.

export function Tick({ className = 'glyph-tick' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" focusable="false"><path d="M2.6 8.6 6.2 12 13.6 4.2" /></svg>;
}

/** A filled green disc with a white tick. */
export function CheckDot({ className = 'glyph-checkdot' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" focusable="false">
      <circle cx="10" cy="10" r="9.2" />
      <path d="M5.8 10.4 8.7 13.1 14.4 7.2" />
    </svg>
  );
}

/** An empty circle: not yet confirmed. */
export function OpenDot({ className = 'glyph-opendot' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 20 20" focusable="false"><circle cx="10" cy="10" r="8.4" /></svg>;
}

export function Padlock({ className = 'glyph-padlock' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 28" focusable="false">
      <path className="glyph-padlock-shackle" d="M6.6 12.6V8.4a5.4 5.4 0 0 1 10.8 0v4.2" />
      <rect className="glyph-padlock-body" x="2.6" y="11.6" width="18.8" height="14.4" rx="3" />
      <path className="glyph-padlock-hole" d="M12 16.6v4" />
    </svg>
  );
}

/** A sunny pencil lying on its side, point to the right. */
export function Pencil({ className }: { className: string }) {
  return (
    <svg className={`glyph-pencil ${className}`} viewBox="0 0 120 22" focusable="false">
      <path className="glyph-pencil-eraser" d="M5 4.5h9v13H5a3.4 3.4 0 0 1-3.4-3.4V7.9A3.4 3.4 0 0 1 5 4.5Z" />
      <path className="glyph-pencil-ferrule" d="M14 4.5h8v13h-8Z" />
      <path className="glyph-pencil-body" d="M22 4.5h71v13H22Z" />
      <path className="glyph-pencil-facet" d="M22.5 11h70" />
      <path className="glyph-pencil-wood" d="M93 4.5 115.6 11 93 17.5Z" />
      <path className="glyph-pencil-lead" d="M108.4 8.9 115.6 11l-7.2 2.1Z" />
    </svg>
  );
}

export function MailGlyph({ className = 'glyph-mail' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 24" focusable="false">
      <rect x="2" y="2.5" width="28" height="19" rx="2" />
      <path d="M2.8 3.6 16 13.6 29.2 3.6" />
    </svg>
  );
}

/** The editor's toolbar: bold, italic, link and image. */
export function Toolbar({ className }: { className: string }) {
  return (
    <span className={className}>
      <b>B</b>
      <i>I</i>
      <svg viewBox="0 0 20 20" focusable="false"><path d="M8.6 11.4 11.4 8.6M7.4 9.8l-1.6 1.6a2.6 2.6 0 0 0 3.7 3.7l1.6-1.6M12.6 10.2l1.6-1.6a2.6 2.6 0 0 0-3.7-3.7L8.9 6.5" /></svg>
      <svg viewBox="0 0 20 20" focusable="false"><rect x="3" y="4" width="14" height="12" rx="1.5" /><path d="M3.6 14.4 8 10l3 3 2-2 3.4 3.4" /><circle cx="12.8" cy="7.6" r="1.2" /></svg>
    </span>
  );
}

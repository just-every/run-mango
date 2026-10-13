import { createElement as h } from 'react';
import { markShapes, markViewBox } from './markArt.ts';

// Plain TypeScript with createElement rather than JSX: the docs build renders the stamp (and so this mark) into the
// Markdown pages, and Node runs that build directly, without a JSX transform.

/** Mango's mark, inline. Decorative: the lockup beside it carries the name. */
export function MangoMark({ className }: { className?: string }) {
  return h('svg', { className, viewBox: markViewBox, 'aria-hidden': 'true', focusable: 'false' },
    markShapes.map(({ d, fill }) => h('path', { key: d, d, fill })));
}

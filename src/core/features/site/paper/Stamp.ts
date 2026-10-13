import { createElement as h } from 'react';
import { MangoMark } from '../brand/MangoMark.ts';

// Plain TypeScript with createElement rather than JSX, because the docs build (which Node runs directly) stamps the tip
// notes in the Markdown pages with it; the landing's drawings use the same component.

/** A perforated postage stamp printed with the Mango fruit. Decorative. The perforations are a CSS mask (mail.css). */
export function Stamp({ className }: { className: string }) {
  return h('div', { className: `stamp ${className}`, 'aria-hidden': 'true' },
    h('div', { className: 'stamp-sheet' },
      h('div', { className: 'stamp-print' }, h(MangoMark, { className: 'stamp-fruit' }))));
}

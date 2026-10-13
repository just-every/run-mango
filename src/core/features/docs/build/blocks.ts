import { createElement } from 'react';
import type { ReactNode } from 'react';
import { Paper } from '../../site/paper/Paper.ts';
import { Stamp } from '../../site/paper/Stamp.ts';

// The two Markdown blocks the docs draw in the landing's materials, rendered once at build time: a code block is a sheet
// of warm paper with the pencil outline (its text scrolls inside the sheet on a narrow screen), and a `> **Tip:**` quote is
// a small paper note carrying the perforated mango stamp.

type HastNode = { type: string; value?: string; tagName?: string; children?: HastNode[] };

export const textOf = (node: HastNode): string => node.value ?? (node.children ?? []).map(textOf).join('');
const elements = (node?: HastNode) => (node?.children ?? []).filter(child => child.type === 'element');

/** The card's nominal width: the article measure, so the outline's wobble is about a pixel at full width. */
const sheetWidth = 680;

/** Code blocks, numbered in page order so each sheet's outline wobbles differently. */
export function codeBlocks() {
  let count = 0;
  return function pre({ node, children }: { node?: HastNode; children?: ReactNode }) {
    const lines = textOf(node ?? { type: 'root' }).replace(/\n$/, '').split('\n').length;
    count += 1;
    // Focusable, so a keyboard can scroll a long line that the sheet cannot fit.
    return createElement(Paper, { w: sheetWidth, h: 36 + lines * 24, seed: 40 + count * 7, tone: 'warm', className: 'docs-code' },
      createElement('pre', { tabIndex: 0 }, children));
  };
}

/** A quote whose first paragraph opens with a bold "Tip:" is a tip. */
function isTip(node?: HastNode) {
  const [first] = elements(node);
  const [lead] = elements(first);
  return first?.tagName === 'p' && lead?.tagName === 'strong' && first.children?.[0] === lead && /^Tip:?$/.test(textOf(lead).trim());
}

/** A tip becomes a stamped paper note; any other quote stays a quote. */
export function blockquote({ node, children }: { node?: HastNode; children?: ReactNode }) {
  if (!isTip(node)) return createElement('blockquote', null, children);
  return createElement(Paper, { w: sheetWidth, h: 120, seed: 5, tone: 'warm', className: 'docs-note' },
    createElement('div', { className: 'docs-note-body', role: 'note' }, children),
    createElement(Stamp, { className: 'docs-note-stamp' }));
}

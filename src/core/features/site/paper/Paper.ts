import { createElement as h } from 'react';
import type { ReactNode } from 'react';
import { pencilPath } from './pencilPath.ts';

// Plain TypeScript with createElement rather than JSX, because the docs build (which Node runs directly) renders paper
// cards round the code blocks in the Markdown pages; the landing's drawings use the same component.

export type PaperTone = 'paper' | 'warm' | 'leaf' | 'envelope';

type PaperProps = {
  /** The card's nominal width and height: they fix the outline's aspect and the size of its wobble. */
  w: number;
  h: number;
  /** Changes the wobble, so two cards of the same size do not repeat each other. */
  seed: number;
  tone?: PaperTone;
  className?: string;
  children?: ReactNode;
};

/**
 * The one card primitive: a sheet of paper with a soft pencil outline (a firm pass and a fainter second pass) and a
 * hatched pencil shadow. The outline is an SVG stretched over the card with a non-scaling stroke, so its weight stays the
 * same at any size. The outline is decoration (`aria-hidden`); the card's children are its content.
 */
export function Paper({ w, h: height, seed, tone = 'paper', className, children }: PaperProps) {
  return h('div', { className: `paper paper--${tone}${className ? ` ${className}` : ''}` },
    h('div', { className: 'paper-face' }, children),
    h('svg', { className: 'paper-pencil', viewBox: `0 0 ${w} ${height}`, preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' },
      h('path', { d: pencilPath(w, height, seed) }),
      h('path', { className: 'paper-pencil-ghost', d: pencilPath(w, height, seed + 17) })));
}

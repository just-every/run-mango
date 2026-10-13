import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { productConfig } from '@/ext/config';
import { MangoMark } from '@/core/features/site/brand/MangoMark';
import { Paper } from '@/core/features/site/paper/Paper';
import { Stamp } from '@/core/features/site/paper/Stamp';

/**
 * The frame of a sessionless page that stands on its own (sign-in, subscribe): the Mango lockup on the cream ground (a
 * link home when `home` is set), then one drawn paper card with the mango stamp on its corner, as a letter is stamped;
 * `after` sits under the card. Page styles: styles/pages/public.css. The drawings' styles (ui/materials.ts) are imported
 * by the routes, not here, so the page components stay free of stylesheet imports and render under plain esbuild.
 */
export function StandaloneFrame({ className, home, card, after }: {
  className: string;
  home?: boolean;
  card: { w: number; h: number; seed: number; children: ReactNode };
  after?: ReactNode;
}) {
  const lockup = <span className="app-brand"><MangoMark className="app-brand__mark" /><span className="app-brand__name">{productConfig.productName}</span></span>;
  return (
    <div className={`mango-app app-standalone ${className}`}>
      <header className="simple-page__header">
        {home ? <Link to="/" aria-label={`Back to ${productConfig.productName}`}>{lockup}</Link> : lockup}
      </header>
      <main className="simple-page">
        <Paper w={card.w} h={card.h} seed={card.seed} className="standalone-card">
          <Stamp className="standalone-stamp" />
          {card.children}
        </Paper>
        {after}
      </main>
    </div>
  );
}

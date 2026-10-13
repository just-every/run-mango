import { Paper } from '../site/paper/Paper';
import { PenArrow } from '../site/PenArrow';
import { docsCopy } from './copy';
import { DocsLink } from './DocsLink';
import type { DocsNavPage } from './types';

const { pager } = docsCopy;

/** Previous and next in manifest order, as two paper cards: the next one on the right, with the sunny arrow. */
export function DocsPager({ previous, next }: { previous?: DocsNavPage; next?: DocsNavPage }) {
  return (
    <nav className="docs-pager" aria-label={pager.label}>
      {previous ? (
        <DocsLink slug={previous.slug} className="docs-pager-link docs-pager-link--previous" rel="prev">
          <Paper w={340} h={96} seed={11} className="docs-pager-card">
            <span className="docs-pager-label"><PenArrow className="docs-pager-arrow" />{pager.previous}</span>
            <span className="docs-pager-title">{previous.label}</span>
          </Paper>
        </DocsLink>
      ) : null}
      {next ? (
        <DocsLink slug={next.slug} className="docs-pager-link docs-pager-link--next" rel="next">
          <Paper w={340} h={96} seed={29} tone="warm" className="docs-pager-card">
            <span className="docs-pager-label">{pager.next}<PenArrow className="docs-pager-arrow" /></span>
            <span className="docs-pager-title">{next.label}</span>
          </Paper>
        </DocsLink>
      ) : null}
    </nav>
  );
}

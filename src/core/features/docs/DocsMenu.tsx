import { Paper } from '../site/paper/Paper';
import { docsCopy } from './copy';
import { DocsNavList } from './DocsNavList';
import type { DocsSection } from './types';

/** The section navigation on phones and narrow windows: one "Contents" disclosure that opens the full list on a card. */
export function DocsMenu({ sections, current, label }: { sections: DocsSection[]; current: string; label: string }) {
  return (
    <nav className="docs-menu" aria-label={docsCopy.navLabel}>
      <details>
        <summary>{docsCopy.contents} <span className="docs-menu-current">· {label}</span></summary>
        <Paper w={360} h={460} seed={17} className="docs-menu-list">
          <DocsNavList sections={sections} current={current} idPrefix="docs-menu" />
        </Paper>
      </details>
    </nav>
  );
}

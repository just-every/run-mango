import { docsCopy } from './copy';
import { DocsNavList } from './DocsNavList';
import type { DocsSection } from './types';

/** The section navigation beside the page, from 861px: a full-height column whose list stays in view while the page scrolls. */
export function DocsSidebar({ sections, current }: { sections: DocsSection[]; current: string }) {
  return (
    <div className="docs-sidebar">
      <nav className="docs-sidebar-nav" aria-label={docsCopy.navLabel}>
        <DocsNavList sections={sections} current={current} idPrefix="docs-sidebar" />
      </nav>
    </div>
  );
}

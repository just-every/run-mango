import { DocsArticle } from './DocsArticle';
import { DocsMenu } from './DocsMenu';
import { DocsPager } from './DocsPager';
import { DocsSidebar } from './DocsSidebar';
import { DocsToc } from './DocsToc';
import type { DocsView } from './types';
import { useCurrentDocs } from './useCurrentDocs';
import './styles';

/**
 * A documentation page inside the shared public header and footer (src/routes/docs.tsx): the section sidebar, the
 * article with its previous and next cards, and the On this page rail. The docs home's head carries a short welcome.
 * `.mango-docs` roots every docs rule.
 */
export function DocsPage({ page, sections, version }: DocsView) {
  useCurrentDocs(version);
  const order = sections.flatMap(section => section.pages.map(entry => ({ ...entry, section: section.title })));
  const index = order.findIndex(entry => entry.slug === page.slug);
  const current = order[index];
  return (
    <div className="mango-docs">
      <DocsSidebar sections={sections} current={page.slug} />
      <DocsMenu sections={sections} current={page.slug} label={current.label} />
      <div className="docs-main">
        <DocsArticle page={page} section={current.section} welcome={!page.slug} />
        <DocsPager previous={order[index - 1]} next={order[index + 1]} />
      </div>
      <DocsToc toc={page.toc} />
    </div>
  );
}

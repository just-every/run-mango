import { DocsTitleStroke } from './DocsTitleStroke';
import { DocsTocCompact } from './DocsToc';
import { DocsWelcomeArt, DocsWelcomeLead } from './DocsWelcome';
import type { DocsPageData } from './types';

/**
 * The page's section, its title (the page's one h1) over a sunny pencil stroke, and its body, rendered from Markdown at
 * build time. On the docs home the head also carries the welcome: a greeting under the title and a drawing beside it.
 */
export function DocsArticle({ page, section, welcome }: { page: DocsPageData; section: string; welcome: boolean }) {
  return (
    <article className="docs-article" data-doc={page.slug} aria-labelledby={page.titleId}>
      <header className={welcome ? 'docs-page-head docs-page-head--welcome' : 'docs-page-head'}>
        <div className="docs-page-head-text">
          <p className="docs-eyebrow">{section}</p>
          <h1 id={page.titleId} className="docs-title">{page.title}</h1>
          <DocsTitleStroke />
          {welcome ? <DocsWelcomeLead /> : null}
        </div>
        {welcome ? <DocsWelcomeArt /> : null}
      </header>
      <DocsTocCompact toc={page.toc} />
      <div className="docs-prose" dangerouslySetInnerHTML={{ __html: page.html }} />
    </article>
  );
}

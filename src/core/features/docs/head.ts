import { docsCopy } from './copy';
import type { DocsPageData } from './types';

/** Title and description for a docs page. */
export function docsHead(page: DocsPageData | undefined) {
  if (!page) return {};
  return {
    meta: [
      { title: page.slug ? `${page.title} · ${docsCopy.titleSuffix}` : docsCopy.titleSuffix },
      { name: 'description', content: page.description },
      { name: 'theme-color', content: '#fbf7ee' },
    ],
  };
}

/** The docs layout's head: only when it shows the docs' 404 (in place of a page or inside the layout) does it name it. */
export function docsLayoutHead(match: { status: string; _notFound?: boolean }) {
  if (match.status !== 'notFound' && !match._notFound) return {};
  return { meta: [{ title: `${docsCopy.missing.title} · ${docsCopy.titleSuffix}` }, { name: 'theme-color', content: '#fbf7ee' }] };
}

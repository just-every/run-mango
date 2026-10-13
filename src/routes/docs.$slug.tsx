import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { DocsPage } from '@/core/features/docs/DocsPage';
import { docsHead } from '@/core/features/docs/head';
import { loadDocsPage } from '@/core/features/docs/load';

// DOCS-001. One documentation page, rendered at build time from the Markdown file docs/site.json lists for its slug.
// An unknown or miscased slug answers 404 with the docs' not-found page (the /docs layout's, src/routes/docs.tsx). This
// route has no not-found page of its own: the router would show this page's component for a nested address instead.
export const Route = createFileRoute('/docs/$slug')({
  loader: ({ params }) => loadDocsPage(params.slug),
  head: ({ loaderData }) => docsHead(loaderData?.page),
  component: editorLeaf(DocsArticlePage),
});

function DocsArticlePage() {
  return <DocsPage {...Route.useLoaderData()} />;
}

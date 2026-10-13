import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { DocsPage } from '@/core/features/docs/DocsPage';
import { docsHead } from '@/core/features/docs/head';
import { loadDocsPage } from '@/core/features/docs/load';

// DOCS-001. The docs home: the first page of docs/site.json, rendered at build time from Markdown. The route renders it per
// request like every other Start document; the page content is a build artifact, not a workspace read, and nothing here
// touches the session, a cookie or the database.
export const Route = createFileRoute('/docs/')({
  loader: () => loadDocsPage(''),
  head: ({ loaderData }) => docsHead(loaderData?.page),
  component: editorLeaf(DocsHome),
});

function DocsHome() {
  return <DocsPage {...Route.useLoaderData()} />;
}

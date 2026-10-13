import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute, Outlet } from '@tanstack/react-router';
import { DocsMissing } from '@/core/features/docs/DocsMissing';
import { docsLayoutHead } from '@/core/features/docs/head';
import { PublicPage } from '@/core/features/site/PublicPage';

// DOCS-001. Every /docs address renders inside the landing's shared header and footer, with Docs marked as the current
// section. This layout is the docs' one 404 boundary: the router shows its not-found page in place of the layout for an
// unknown slug (the page loader's notFound) and inside the layout for a nested address no route matches
// (`/docs/install/extra`); PublicPage draws the frame once in either case.
export const Route = createFileRoute('/docs')({
  head: ({ match }) => docsLayoutHead(match),
  component: DocsSite,
  notFoundComponent: editorLeaf(DocsNotFound),
});

function DocsSite() {
  return <PublicPage current="docs"><Outlet /></PublicPage>;
}

function DocsNotFound() {
  return <PublicPage current="docs"><DocsMissing /></PublicPage>;
}

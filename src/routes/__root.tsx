import { useEffect } from 'react';
import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import stylesheet from '../core/app/client/styles.css?url';
import {MangoEditor, editorLeaf} from '@/core/features/editor/client';
import { PublicNotFound } from '../core/app/client/not-found';
import { fontLinks } from '../core/features/site/font-head';
import { trackPointerFocus } from '../core/app/client/lib/pointer-focus';
function Document() {
 useEffect(() => {document.documentElement.dataset.mangoHydrated = 'true'; return trackPointerFocus();}, []);
 return <html lang="en"><head><HeadContent /></head><body><Outlet /><MangoEditor /><Scripts /></body></html>;
}
export const Route = createRootRoute({
 head: () => ({
  meta: [{charSet: 'utf-8'}, {name: 'viewport', content: 'width=device-width, initial-scale=1'}, {title: 'Mango'}],
  // Mango's mark, served from the deployment's own public/ directory (regenerate with scripts/generate-icons.mjs).
  links: [
   ...fontLinks,
   {rel: 'stylesheet', href: stylesheet},
   {rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'},
   {rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png'},
   {rel: 'shortcut icon', href: '/favicon.ico'},
   {rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png'},
  ],
 }),
 component: Document,
 notFoundComponent: editorLeaf(PublicNotFound),
});

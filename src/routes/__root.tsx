import { lazy, useEffect } from 'react';
import { createRootRoute, HeadContent, Outlet, Scripts, useRouterState } from '@tanstack/react-router';
import stylesheet from '../core/app/client/styles.css?url';
import {MangoEditor, editorLeaf} from '@/core/features/editor/client';
import { fontLinks } from '../core/features/site/font-head';
import { trackPointerFocus } from '../core/app/client/lib/pointer-focus';
import { TimeZoneProvider, useHydrated } from '../core/app/client/lib/time-zone';
function DocumentHydration() {
 const hydrated = useHydrated();
 const app = useRouterState({select: state => state.location.pathname === '/app' || state.location.pathname.startsWith('/app/')});
 // App documents publish readiness inside their streamed content, after its commit.
 useEffect(() => {if (hydrated && !app) document.documentElement.dataset.mangoHydrated = 'true';}, [hydrated, app]);
 return null;
}
function Document() {
 useEffect(() => trackPointerFocus(), []);
 return <html lang="en"><head><HeadContent /></head><body><TimeZoneProvider><Outlet /><MangoEditor /><DocumentHydration /></TimeZoneProvider><Scripts /></body></html>;
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
 notFoundComponent: lazy(() => import('../core/app/client/not-found').then(module => ({default: editorLeaf(module.PublicNotFound)}))),
});

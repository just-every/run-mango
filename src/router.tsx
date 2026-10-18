import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
export function getRouter() {
  // A shared signup device keeps no per-visitor navigation state in storage.
  const signup = typeof window !== 'undefined' && window.location.pathname === '/subscribe';
  return createRouter({routeTree, scrollRestoration: !signup});
}
declare module '@tanstack/react-router' { interface Register {router: ReturnType<typeof getRouter>} }

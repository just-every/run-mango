import { loadOperator } from '@/core/app/loaders';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { OperatorLayout } from '@/core/app/client/ui/layout';
import {lazy} from 'react';
import {editorLeaf} from '@/core/features/editor/client';
export const Route = createFileRoute('/app')({
  beforeLoad: async ({location}) => {
    try {
      const operator = await loadOperator({data: {pathname: location.pathname, search: location.searchStr}});
      // Client navigation commits the complete fresh snapshot together. Letting
      // the new route suspend a second time adds a fallback reveal delay after
      // the transport has already finished. Documents still stream their head.
      const snapshot = typeof window === 'undefined' ? undefined : await operator.resources;
      return {operator: {...operator, snapshot}};
    } catch (cause) {
      // Start preserves this explicit session denial as an Error on the client.
      // Route admission runs before child resources can handle their own 401s.
      if (cause instanceof Error && cause.message === 'unauthenticated') {
        throw redirect({href: '/signin?reason=session-ended', replace: true});
      }
      throw cause;
    }
  },
  loader: ({context}) => context.operator,
  shouldReload: true,
  staleTime: 0,
  gcTime: 0,
  component: OperatorLayout,
  notFoundComponent: lazy(() => import('@/core/app/client/not-found').then(module => ({default: editorLeaf(module.AppNotFound)}))),
});

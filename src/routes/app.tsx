import { loadOperator } from '@/core/app/loaders';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { OperatorLayout } from '@/core/app/client/ui/layout';
import { AppNotFound } from '@/core/app/client/not-found';
import {editorLeaf} from '@/core/features/editor/client';
export const Route = createFileRoute('/app')({
  beforeLoad: async () => {
    try {
      return {operator: await loadOperator()};
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
  component: OperatorLayout,
  notFoundComponent: editorLeaf(AppNotFound),
});

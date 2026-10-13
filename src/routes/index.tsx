import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';
import { Landing } from '@/core/features/landing/Landing';
import { copy } from '@/core/features/landing/copy';

/**
 * HOME-001. The public landing is rendered per request, never prerendered: its header and footer read the owner's
 * src/ext/config.ts, which belongs to each deployment rather than to the build.
 */
export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: copy.meta.title },
      { name: 'description', content: copy.meta.description },
      { name: 'theme-color', content: '#fbf7ee' },
    ],
  }),
  component: editorLeaf(Landing),
});

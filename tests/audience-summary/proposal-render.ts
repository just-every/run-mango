import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import type { ProposalEntry } from '../../src/core/app/client/lib/types';

/** Render the real component inside its real router without a browser or server. */
export async function proposalRenderer() {
  const require = createRequire(import.meta.url);
  const { build } = createRequire(require.resolve('wrangler'))('esbuild');
  const result = await build({
    stdin: { contents: `
      import {renderToStaticMarkup} from 'react-dom/server';
      import {createRootRoute, createRouter, createMemoryHistory, RouterProvider} from '@tanstack/react-router';
      import {ProposalDetail} from './src/core/features/campaigns/ui/proposal-detail';
      export async function render(entry) {
        const routeTree = createRootRoute({component: () => <ProposalDetail entry={entry}/>});
        const router = createRouter({routeTree, history: createMemoryHistory({initialEntries: ['/']})});
        await router.load();
        return renderToStaticMarkup(<RouterProvider router={router}/>);
      }`, resolveDir: process.cwd(), sourcefile: 'proposal-render.tsx', loader: 'tsx' },
    bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic', alias: { '@': resolve('src') },
  });
  const compiled = { exports: {} as { render: (entry: ProposalEntry) => Promise<string> } };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, compiled, compiled.exports);
  return compiled.exports.render;
}

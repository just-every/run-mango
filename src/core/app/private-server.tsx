import {createStartHandler, StartServer} from '@tanstack/react-start/server';
import {createSsrStreamResponse, transformReadableStreamWithRouter} from '@tanstack/react-router/ssr/server';
import {renderToReadableStream} from 'react-dom/server';
import {preloadModule} from 'react-dom';
import type {AnyRouter} from '@tanstack/react-router';
import staticImports from 'virtual:mango-private-preloads';

function PrivateDocument({router}: {router: AnyRouter}) {
  const roots = new Set(router.state.matches.flatMap(match => router.ssr?.manifest?.routes[match.routeId]?.preloads ?? [])
    .map(asset => typeof asset === 'string' ? asset : asset.href));
  const visited = new Set<string>();
  const visit = (href: string) => {
    if (visited.has(href)) return;
    visited.add(href);
    for (const dependency of staticImports[href] ?? []) {
      if (!roots.has(dependency)) preloadModule(dependency, {as: 'script', nonce: router.options.ssr?.nonce});
      visit(dependency);
    }
  };
  // Start's route hints include direct imports. Expand the build's static
  // graph here so nested chunks begin with the head, rather than after JS runs.
  for (const href of roots) {
    preloadModule(href, {as: 'script', nonce: router.options.ssr?.nonce});
    visit(href);
  }
  return <StartServer router={router} />;
}

// Private app documents have authenticated, interactive consumers. Stream the
// head for every user agent while fresh data finishes, including JS-capable
// headless browsers that the public renderer classifies as crawlers.
const fetch = createStartHandler(async ({request, router, responseHeaders}) => {
  const stream = await renderToReadableStream(<PrivateDocument router={router} />, {
    signal: request.signal,
    nonce: router.options.ssr?.nonce,
    progressiveChunkSize: Number.POSITIVE_INFINITY,
    onError() {
      if (!request.signal.aborted) console.error('Private document render failed.');
    },
  });
  // React, the SDK and Workers declare the same WHATWG stream in different namespaces.
  const body = transformReadableStreamWithRouter(router, stream as unknown as Parameters<typeof transformReadableStreamWithRouter>[1], {
    signal: request.signal,
    onAbort: () => stream.cancel().catch(() => {}),
  });
  return createSsrStreamResponse(router, new Response(body as unknown as BodyInit, {
    status: router._serverResult?.type === 'render' ? router._serverResult.status : 200,
    headers: responseHeaders,
  }));
});

export default {fetch};

import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';

import {PaidSubscribePage} from '@/core/features/audience/ui/paid-subscribe-page';
import { SubscribePage } from '@/core/features/audience/ui/subscribe-page';
import { loadSubscribeInfo, loadPaidSubscribeInfo } from '@/core/features/audience/ui/subscribe-loader';
import '@/core/app/client/ui/materials';

export const Route = createFileRoute('/subscribe')({
  validateSearch: (search: Record<string, unknown>) => ({paid: (search.paid === '1' || search.paid === 1), returned: (search.returned === '1' || search.returned === 1)}),
  loaderDeps: ({search}) => ({paid: search.paid}),
  loader: async ({deps}) => deps.paid ? {kind:'paid' as const, info: await loadPaidSubscribeInfo()} : {kind:'free' as const, info: await loadSubscribeInfo()},
  component: editorLeaf(SubscribeRoute),
});

function SubscribeRoute() {
  const data = Route.useLoaderData(), search = Route.useSearch();
  return data.kind === 'paid' ? <PaidSubscribePage info={data.info} returned={search.returned}/> : <SubscribePage info={data.info} />;
}

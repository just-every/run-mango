import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';

import {PaidSubscribePage} from '@/core/features/audience/ui/paid-subscribe-page';
import { SubscribePage } from '@/core/features/audience/ui/subscribe-page';
import { loadSubscribeInfo, loadPaidSubscribeInfo } from '@/core/features/audience/ui/subscribe-loader';
import '@/core/app/client/ui/materials';

// Only the paid page and its Checkout return carry search state. Absent keys
// stay absent, so router normalization keeps every other /subscribe query
// (the embed's ?from=embed, ?submitted=1, ?channel=sms) exactly as requested.
const flag = (value: unknown) => value === '1' || value === 1 || value === true;

export const Route = createFileRoute('/subscribe')({
  validateSearch: (search: Record<string, unknown>): {paid?: 1; returned?: 1} => ({...(flag(search.paid) ? {paid: 1 as const} : {}), ...(flag(search.returned) ? {returned: 1 as const} : {})}),
  loaderDeps: ({search}) => ({paid: search.paid === 1}),
  loader: async ({deps}) => deps.paid ? {kind:'paid' as const, info: await loadPaidSubscribeInfo()} : {kind:'free' as const, info: await loadSubscribeInfo()},
  component: editorLeaf(SubscribeRoute),
});

function SubscribeRoute() {
  const data = Route.useLoaderData(), search = Route.useSearch();
  return data.kind === 'paid' ? <PaidSubscribePage info={data.info} returned={search.returned === 1}/> : <SubscribePage info={data.info} />;
}

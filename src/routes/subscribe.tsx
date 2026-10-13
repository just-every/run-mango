import {editorLeaf} from '@/core/features/editor/client';
import { createFileRoute } from '@tanstack/react-router';

import { SubscribePage } from '@/core/features/audience/ui/subscribe-page';
import { loadSubscribeInfo } from '@/core/features/audience/ui/subscribe-loader';
import '@/core/app/client/ui/materials';

export const Route = createFileRoute('/subscribe')({
  loader: () => loadSubscribeInfo(),
  component: editorLeaf(SubscribeRoute),
});

function SubscribeRoute() {
  const info = Route.useLoaderData();
  return <SubscribePage info={info} />;
}

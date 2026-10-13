import { createFileRoute } from '@tanstack/react-router';
import { loadSetup } from '@/core/app/loaders';
import { SetupPage } from '@/core/app/client/setup-page';
import '@/core/app/client/ui/materials';

export const Route = createFileRoute('/setup')({
  beforeLoad: async () => ({setup: await loadSetup()}),
  loader: ({context}) => context.setup,
  component: SetupRoute,
});
function SetupRoute() {
  const {identity, ownerEmail} = Route.useLoaderData();
  return <SetupPage identity={identity} ownerEmail={ownerEmail} />;
}

import { createFileRoute } from '@tanstack/react-router';
import { loadSetup } from '@/core/app/loaders';
import { StandaloneFrame } from '@/core/app/client/ui/standalone-frame';
import { SettingsSenderForm } from '@/core/features/store/ui/settings-sender-form';
import '@/core/app/client/ui/materials';

export const Route = createFileRoute('/setup')({
  beforeLoad: async () => ({setup: await loadSetup()}),
  loader: ({context}) => context.setup,
  component: SetupPage,
});
function SetupPage() {
  const {identity} = Route.useLoaderData();
  return <StandaloneFrame className="setup-page" home card={{w: 672, h: 900, seed: 71, children: (
    <section className="message-card setup-card" aria-labelledby="setup-title">
      <p className="eyebrow">Welcome to Mango</p>
      <h1 id="setup-title" className="standalone-title">Set up your sender identity</h1>
      <p>Tell readers who you are. Save these details to open your newsletter desk; you can edit them later in Settings.</p>
      <SettingsSenderForm identity={identity} saved={async () => {window.location.assign('/app');}} />
      <p className="standalone-note">Saving your identity sends no email. Provider configuration and sender authentication are checked separately before sending.</p>
    </section>
  )}} />;
}

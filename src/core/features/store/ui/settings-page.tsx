import {SettingsStripe} from './settings-stripe';
import {Can} from '@/core/features/auth/ui/permissions';
import type { Provider } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState } from '@/core/app/client/ui/layout';
import { KeepTogether } from '@/core/features/site/BodyText';

import { ProviderStatus } from './store-page';
import type { SettingsOperator } from './settings-operator-actions';
import { SettingsOperators } from './settings-operators';
import { SettingsSender } from './settings-sender';
import { SettingsLinkHosts } from './settings-link-hosts';
import { SettingsIntegrations } from './settings-integrations';

type ProviderResponse = { providers: Provider[]; off: string[] };

export function SettingsPage() {
  const operator = useResource<{ operator: SettingsOperator }>('/api/operator');
  const providers = useResource<ProviderResponse>('/api/settings/providers');
  if (operator.loading) return <LoadState />;
  if (!operator.data) return <LoadState error={operator.error} />;
  return (
    <div className="page-flow settings-page">
      <header className="page-head">
        <div className="page-head__text">
          <h1>Settings</h1>
          <p className="page-head__lead">Operator identity and sending connections.</p>
        </div>
      </header>
      <Can permission="settings.manage"><SettingsSender operatorEmail={operator.data.operator.email} /></Can>
      <Can permission="settings.manage"><SettingsLinkHosts /></Can>
      <Can permission="integration.manage"><SettingsIntegrations /></Can>
      <Can permission="settings.manage"><SettingsStripe /></Can>
      <div className="settings-grid">
        <section className="panel settings-current" aria-labelledby="current-operator-title">
          <p className="eyebrow">Current operator</p>
          <h2 id="current-operator-title"><KeepTogether text={operator.data.operator.displayName} /></h2>
          <p>{operator.data.operator.email}</p><p>Role: {operator.data.operator.role}</p>
        </section>
        <Can permission="operators.manage"><SettingsOperators current={operator.data.operator} /></Can>
      </div>
      <Can permission="settings.manage">{providers.error ? <p className="inline-error settings-providers-error" role="alert">Unable to load delivery connections. <button className="secondary-action" onClick={() => void providers.reload()}>Try again</button></p> : null}
      {providers.data ? <ProviderStatus providers={providers.data.providers} /> : null}
      {providers.data?.off.length ? <p className="muted-copy settings-note">Off in this setup: {providers.data.off.join(', ')}. <a href="/docs/going-live">The going-live guide</a> explains the optional modules.</p> : null}</Can>
    </div>
  );
}

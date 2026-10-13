import type { Provider, SourceSync } from '@/core/app/client/lib/types';
import { useResource } from '@/core/app/client/lib/use-resource';
import { LoadState } from '@/core/app/client/ui/layout';
import { KeepTogether } from '@/core/features/site/BodyText';

import { ProviderStatus } from './store-page';
import type { SettingsOperator } from './settings-operator-actions';
import { SettingsOperators } from './settings-operators';
import { SettingsSender } from './settings-sender';

type ProviderResponse = { providers: Provider[]; sourceSyncs: SourceSync[] };

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
      <SettingsSender />
      <div className="settings-grid">
        <section className="panel settings-current" aria-labelledby="current-operator-title">
          <p className="eyebrow">Current operator</p>
          <h2 id="current-operator-title"><KeepTogether text={operator.data.operator.displayName} /></h2>
          <p>{operator.data.operator.email}</p>
        </section>
        <SettingsOperators current={operator.data.operator} />
      </div>
      {providers.error ? <p className="inline-error settings-providers-error" role="alert">Unable to load delivery connections. <button className="secondary-action" onClick={() => void providers.reload()}>Try again</button></p> : null}
      {providers.data ? <ProviderStatus providers={providers.data.providers} /> : null}
      {providers.data && !providers.data.sourceSyncs.length ? (
        <section className="notice-note settings-note" aria-labelledby="settings-sources-title">
          <p className="eyebrow">Commerce sources</p>
          <h2 id="settings-sources-title">No source connection is declared.</h2>
          <p>The server has not declared source types, so no source freshness or proposal-generation capability can be inferred.</p>
        </section>
      ) : null}
    </div>
  );
}

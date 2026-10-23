import { SignupSettingsForm } from './signup-settings-form';
import { useRef, useState } from 'react';

import { useResource } from '@/core/app/client/lib/use-resource';

type SignupToolsData = {
  url: string;
  embed: string;
  consentText: string;
  frequencyDisclosure: string;
  embedOrigins: string[];
  challengeEnabled:boolean;
  kioskEnabled:boolean;
  kioskDeviceLabel:string;
};

function publicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export function AudienceSignupTools() {
  const { data, error, loading, reload } = useResource<SignupToolsData>('/api/audience/signup');
  const snippet = useRef<HTMLTextAreaElement>(null);
  const [copyMessage, setCopyMessage] = useState<string>();

  if (loading && !data) return <section className="panel audience-signup-tools"><p className="eyebrow">Public sign-up</p><h2>Hosted form and embed</h2><p className="muted-copy">Loading the configured public form…</p></section>;
  if (!data) return <section className="panel audience-signup-tools" role="alert"><p className="eyebrow">Public sign-up</p><h2>Hosted form and embed</h2><p>{error ?? 'The configured public form could not be loaded.'}</p></section>;

  const url = publicHttpUrl(data.url);
  if (!url || !data.embed) return <section className="panel audience-signup-tools" role="alert"><p className="eyebrow">Public sign-up</p><h2>Hosted form and embed</h2><p>The server did not return a valid public form URL and embed snippet.</p></section>;

  const copySnippet = async () => {
    setCopyMessage(undefined);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(data.embed);
      setCopyMessage('Embed snippet copied.');
    } catch {
      snippet.current?.focus();
      snippet.current?.select();
      setCopyMessage('The snippet is selected. Copy it from the text field.');
    }
  };

  return (
    <section className="panel audience-signup-tools" aria-labelledby="signup-tools-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Public sign-up</p>
          <h2 id="signup-tools-title">Hosted form and embed</h2>
        </div>
        <a className="secondary-action" href={url} target="_blank" rel="noreferrer">Open hosted form</a>
      </div>
      <p className="muted-copy audience-signup-tools__note">The hosted form records affirmative consent. Its email opt-in mode controls whether confirmation is required; an unsubscribed address always requires confirmation.</p>
      <div className="audience-signup-grid">
        <dl className="audience-signup-details">
          <div><dt>Public form URL</dt><dd className="audience-signup-url"><a href={url} target="_blank" rel="noreferrer">{url}</a></dd></div>
          <div><dt>Consent text shown on the form</dt><dd><blockquote className="audience-signup-quote">{data.consentText}</blockquote></dd></div>
        </dl>
        <div className="audience-signup-embed">
          <label className="audience-signup-snippet">
            <span>Embed snippet</span>
            <textarea ref={snippet} readOnly rows={3} value={data.embed} aria-label="Hosted signup iframe embed snippet" onFocus={(event) => event.currentTarget.select()} />
          </label>
          <div className="audience-signup-actions">
            <button className="secondary-action" type="button" onClick={() => void copySnippet()}>Copy embed snippet</button>
            {copyMessage ? <p role="status" aria-live="polite">{copyMessage}</p> : null}
          </div>
        </div>
      </div>
      <SignupSettingsForm challengeEnabled={data.challengeEnabled} kioskEnabled={data.kioskEnabled} kioskDeviceLabel={data.kioskDeviceLabel} frequencyDisclosure={data.frequencyDisclosure} embedOrigins={data.embedOrigins} saved={reload} />
    </section>
  );
}

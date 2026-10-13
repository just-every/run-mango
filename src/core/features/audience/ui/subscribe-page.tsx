import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { mapFieldErrors, type FieldErrors } from '@/core/app/client/ui/field-errors';
import { useEffect, useState } from 'react';

import { requestJson } from '@/core/app/client/lib/api';
import { SignupChallenge } from './signup-challenge';
import { StandaloneFrame } from '@/core/app/client/ui/standalone-frame';
import { Art } from '@/core/features/site/drawings/Art';
import { Envelope } from '@/core/features/site/drawings/Envelope';

export type SubscribeInfo = {
  sender: string;
  consentText: string;
  frequencyDisclosure: string;
  disclosure: string;
  privacyNote: string;
  turnstileSiteKey?: string;
};

type ApiMessage = {
  status?: string;
  error?: string;
  detail?: string;
  fields?: unknown;
};

export function SubscribePage({ info }: { info: SubscribeInfo }) {
  const [challenge, setChallenge] = useState('');
  const [challengeAttempt, setChallengeAttempt] = useState(0);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => setReady(true), []);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(undefined);
    setError(undefined);
    try {
      const response = await requestJson<ApiMessage>('/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
          consent,
          website,
          disclosure: info.disclosure,
          ...(info.turnstileSiteKey ? {'cf-turnstile-response':challenge} : {}),
        }),
      });
      if (response.status === 202 && response.data.status === 'confirmation-required') {
        setMessage('Request received. If this address can receive email, open its confirmation link and press Confirm subscription.');
        return;
      }
      setErrors(mapFieldErrors(response.data.fields, ['email','displayName','consent']));
      setError(response.data.detail?.trim() || response.data.error?.replaceAll('_', ' ') || 'The request could not be completed. Review the form and try again.');
    } catch {
      setError('The request result could not be confirmed. Try again after checking your connection.');
    } finally {
      setBusy(false);
      setChallenge('');
      setChallengeAttempt(attempt=>attempt+1);
    }
  };

  const success = message ? (
    <div className="subscribe-success">
      <p className="subscribe-confirmation" role="status">{message}</p>
      <Art label="An envelope with a Mango stamp, postmarked yes" className="subscribe-success-art">
        <Envelope className="subscribe-success-envelope" seed={71} postmark={{ rim: 'YES' }} lines={false} />
      </Art>
    </div>
  ) : null;

  return (
    <StandaloneFrame className="subscribe-page" card={{ w: 576, h: 720, seed: 67, children: (
      <section className="message-card subscribe-card" aria-labelledby="subscribe-title">
        <p className="eyebrow">{info.sender}</p>
        <h1 id="subscribe-title" className="standalone-title">Get the newsletter</h1>
        <p>{info.frequencyDisclosure}</p>
        <p className="subscribe-privacy-note">{info.privacyNote}</p>
        <ValidationForm className="subscribe-form standalone-form" onValidSubmit={() => void submit()} serverErrors={errors}>
          <label>
            <span>Email address (required)</span>
            <Field name="email" label="Email address" required><input type="email" name="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} disabled={!ready || busy} /></Field>
          </label>
          <label>
            <span>Name <small>(optional)</small></span>
            <Field name="displayName" label="Name"><input type="text" name="displayName" autoComplete="name" maxLength={200} value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} disabled={!ready || busy} /></Field>
          </label>
          <label className="subscribe-consent">
            <Field name="consent" label="Consent" required validate={() => consent ? undefined : "Agree to receive the newsletter before requesting confirmation."}><input type="checkbox" name="consent" aria-label={`${info.consentText} (required)`} required checked={consent} onChange={(event) => setConsent(event.currentTarget.checked)} disabled={!ready || busy} /></Field>
            <span>{info.consentText} (required)</span>
          </label>
          <div className="subscribe-honeypot" aria-hidden="true">
            <label htmlFor="subscribe-website">Leave this field empty</label>
            <input id="subscribe-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.currentTarget.value)} />
          </div>
          {info.turnstileSiteKey ? <SignupChallenge key={challengeAttempt} siteKey={info.turnstileSiteKey} onToken={setChallenge} /> : null}
          {error ? <p className="inline-error" role="alert">{error}</p> : null}
          {success}
          <button className="primary-action" type="submit" disabled={!ready || busy || Boolean(info.turnstileSiteKey && !challenge)}>{busy ? 'Submitting…' : 'Request confirmation'}</button>
        </ValidationForm>
      </section>
    ) }} />
  );
}

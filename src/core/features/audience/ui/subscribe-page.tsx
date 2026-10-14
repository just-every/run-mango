import { Field, ValidationForm } from '@/core/app/client/ui/validation-form';
import { mapFieldErrors, type FieldErrors } from '@/core/app/client/ui/field-errors';
import { useEffect, useState } from 'react';

import { requestJson } from '@/core/app/client/lib/api';
import { SignupChallenge } from './signup-challenge';
import { StandaloneFrame } from '@/core/app/client/ui/standalone-frame';
import { Art } from '@/core/features/site/drawings/Art';
import { Envelope } from '@/core/features/site/drawings/Envelope';

export type SubscribeInfo = {
  sms?: {sender:string;brand:string;programme:string;frequency:string;jurisdiction:string;consentText:string;disclosure:string};
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
  const [channel,setChannel]=useState<'email'|'sms'>('email');
  const [phone,setPhone]=useState(''),[timeZone,setTimeZone]=useState('');
  const sms=channel==='sms'&&info.sms;
  const disclosure=sms?info.sms!.disclosure:info.disclosure, consentText=sms?info.sms!.consentText:info.consentText;
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

  useEffect(() => {setReady(true);if(info.sms&&new URLSearchParams(window.location.search).get('channel')==='sms')setChannel('sms');}, [info.sms]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(undefined);
    setError(undefined);
    try {
      const response = await requestJson<ApiMessage>(sms?'/subscribe/sms':'/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          ...(sms?{phone:phone.trim(),timeZone}:{email:email.trim()}),
          ...(displayName.trim() ? { displayName: displayName.trim() } : {}),
          consent,
          website,
          disclosure,
          ...(info.turnstileSiteKey ? {'cf-turnstile-response':challenge} : {}),
        }),
      });
      if (response.status === 202 && response.data.status === 'confirmation-required') {
        setMessage('Request received. Open the confirmation link sent to your selected channel and press Confirm subscription. SMS waits for the permitted recipient-local window.');
        return;
      }
      setErrors(mapFieldErrors(response.data.fields, ['email','phone','timeZone','displayName','consent']));
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
        <h1 id="subscribe-title" className="standalone-title">{sms?info.sms!.programme:'Get the newsletter'}</h1>
        <p>{sms?info.sms!.frequency:info.frequencyDisclosure}</p>
        <p className="subscribe-privacy-note">{sms?'Your phone number, recipient time zone and consent evidence are stored by this operator.':info.privacyNote}</p>
        <ValidationForm className="subscribe-form standalone-form" onValidSubmit={() => void submit()} serverErrors={errors}>
          {info.sms?<label>Channel<select value={channel} onChange={event=>{setChannel(event.target.value as 'email'|'sms');setConsent(false);}}><option value="email">Email</option><option value="sms">SMS · {info.sms.programme}</option></select></label>:null}
          {sms?<><label>Phone (required)<Field name="phone" label="Phone" required validate={()=>/^\+61\d{9}$/.test(phone.trim())?undefined:'Enter an Australian E.164 mobile number, such as +61412345678.'}><input type="tel" value={phone} onChange={event=>setPhone(event.target.value)} placeholder="+61412345678" required /></Field></label><label>Your current time zone (required)<Field name="timeZone" label="Time zone" required><input value={timeZone} onChange={event=>setTimeZone(event.target.value)} placeholder="Australia/Brisbane" required /></Field></label><p>Sender {info.sms!.sender} · {info.sms!.jurisdiction}</p></>:<label>
            <span>Email address (required)</span>
            <Field name="email" label="Email address" required><input type="email" name="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.currentTarget.value)} disabled={!ready || busy} /></Field>
          </label>}
          <label>
            <span>Name <small>(optional)</small></span>
            <Field name="displayName" label="Name"><input type="text" name="displayName" autoComplete="name" maxLength={200} value={displayName} onChange={(event) => setDisplayName(event.currentTarget.value)} disabled={!ready || busy} /></Field>
          </label>
          <label className="subscribe-consent">
            <Field name="consent" label="Consent" required validate={() => consent ? undefined : "Agree to receive the newsletter before requesting confirmation."}><input type="checkbox" name="consent" aria-label={`${consentText} (required)`} required checked={consent} onChange={(event) => setConsent(event.currentTarget.checked)} disabled={!ready || busy} /></Field>
            <span>{consentText} (required)</span>
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

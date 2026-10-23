import {useEffect,useState} from 'react';
import {StandaloneFrame} from '@/core/app/client/ui/standalone-frame';
import {Field,ValidationForm} from '@/core/app/client/ui/validation-form';
import {requestJson} from '@/core/app/client/lib/api';
import {SignupChallenge} from './signup-challenge';
import {Art} from '@/core/features/site/drawings/Art';
import {Envelope} from '@/core/features/site/drawings/Envelope';
import type {PaidSignupInfo} from '@/core/features/store/stripe/paid-signup';

export function PaidSubscribePage({info,returned=false}:{info:PaidSignupInfo;returned?:boolean}) {
  const [email,setEmail]=useState(''),[consent,setConsent]=useState(false),[website,setWebsite]=useState('');
  const [challenge,setChallenge]=useState(''),[attempt,setAttempt]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[requestId,setRequestId]=useState('');
  useEffect(()=>setRequestId(crypto.randomUUID()),[]);
  async function checkout() {
    if (busy) return;
    setBusy(true);setError('');
    try {
      const result=await requestJson<{url?:string;detail?:string}>('/paid/checkout',{method:'POST',body:JSON.stringify({email,consent,disclosure:info.disclosure,requestId,website,...(info.turnstileSiteKey?{'cf-turnstile-response':challenge}:{})})});
      if (result.status!==200 || !result.data.url) {setError(result.data.detail??'Checkout could not start. Review the form and try again.');return;}
      window.location.assign(result.data.url);
    }catch{setError('Checkout could not be confirmed. Check your connection before trying again.');}
    finally{setBusy(false);setChallenge('');setAttempt(value=>value+1);}
  }
  return <StandaloneFrame className="subscribe-page" card={{w:576,h:720,seed:67,children:<section className="message-card subscribe-card" aria-labelledby="paid-signup-title">
    <p className="eyebrow">{info.sender}</p>
    <h1 id="paid-signup-title" className="standalone-title">{returned?'What happens next':info.paidTopic}</h1>
    {returned?<>
      <p>Your paid subscription begins when Stripe confirms the checkout. Keep the payment receipt Stripe sends you.</p>
      <p>If your email consent is already confirmed, your paid subscription receives the next issue. Otherwise open the one confirmation email and press Confirm subscription. Until you confirm, we send no newsletter.</p>
      <p>An unsubscribe stays in place until your own confirmation. Suppressed addresses remain protected.</p>
      <Art label="An envelope with a Mango stamp" className="subscribe-success-art"><Envelope className="subscribe-success-envelope" seed={71} postmark={{rim:'YES'}} lines={false}/></Art>
    </>:<>
      <p><strong>{info.price}</strong></p>
      <p>Applicable sales tax is calculated by Stripe Tax at checkout. Stripe takes your card details on its own page.</p>
      <p>{info.frequencyDisclosure}</p><p className="subscribe-privacy-note">{info.privacyNote}</p>
      <ValidationForm className="subscribe-form standalone-form" onValidSubmit={()=>void checkout()}>
        <label><span>Email address (required)</span><Field name="email" label="Email address" required><input type="email" name="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.currentTarget.value)} disabled={!requestId||busy}/></Field></label>
        <label className="subscribe-consent"><Field name="consent" label="Consent" required validate={()=>consent?undefined:'Agree to receive the newsletter before continuing.'}><input type="checkbox" required aria-label={`${info.consentText} (required)`} checked={consent} onChange={event=>setConsent(event.currentTarget.checked)} disabled={!requestId||busy}/></Field><span>{info.consentText} (required)</span></label>
        <div className="subscribe-honeypot" aria-hidden="true"><label htmlFor="paid-website">Leave this field empty</label><input id="paid-website" tabIndex={-1} autoComplete="off" value={website} onChange={event=>setWebsite(event.currentTarget.value)}/></div>
        {info.turnstileSiteKey?<SignupChallenge key={attempt} siteKey={info.turnstileSiteKey} onToken={setChallenge}/>:null}
        <p>Paying does not confirm email consent. If it is missing, we send one confirmation email; no paid or free newsletter arrives until you confirm.</p>
        {error?<p className="inline-error" role="alert">{error}</p>:null}
        <button className="primary-action" type="submit" disabled={!requestId||busy||Boolean(info.turnstileSiteKey&&!challenge)}>{busy?'Opening checkout…':'Continue to Stripe Checkout'}</button>
      </ValidationForm>
    </>}
  </section>}}/>;
}

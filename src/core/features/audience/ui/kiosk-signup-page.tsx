import {useEffect,useState} from 'react';
import {Field,ValidationForm} from '@/core/app/client/ui/validation-form';
import {StandaloneFrame} from '@/core/app/client/ui/standalone-frame';
import {SignupChallenge} from './signup-challenge';
import type {SubscribeInfo} from './subscribe-page';

/** A shared device has no visitor identity. Each success unmounts the entire
 * form and challenge, and a new visitor starts with fresh component state. */
export function KioskSignupPage({info}:{info:SubscribeInfo}) {
  const [generation,setGeneration]=useState(0),[success,setSuccess]=useState(false);
  useEffect(()=>{
    const clear=()=>{setSuccess(false);setGeneration(value=>value+1);};
    window.addEventListener('pageshow',clear);
    return ()=>window.removeEventListener('pageshow',clear);
  },[]);
  useEffect(()=>{
    if(!success)return;
    const timer=window.setTimeout(()=>{setSuccess(false);setGeneration(value=>value+1);},2000);
    return ()=>window.clearTimeout(timer);
  },[success]);
  return <StandaloneFrame className="subscribe-page kiosk-page" card={{w:576,h:720,seed:67,children:
    <section className="message-card subscribe-card" aria-labelledby="subscribe-title">
      <p className="eyebrow">{info.sender}</p>
      <h1 id="subscribe-title" className="standalone-title">Get the newsletter</h1>
      <p>{info.frequencyDisclosure}</p>
      <p className="subscribe-privacy-note">{info.privacyNote}</p>
      {success?<p role="status">Request received. Open the confirmation email and press Confirm subscription. The next visitor can sign up in a moment.</p>
        :<KioskCapture key={generation} info={info} completed={()=>setSuccess(true)}/>}
    </section>
  }}/>;
}

function KioskCapture({info,completed}:{info:SubscribeInfo;completed:()=>void}) {
  const [email,setEmail]=useState(''),[name,setName]=useState(''),[consent,setConsent]=useState(false),[website,setWebsite]=useState('');
  const [token,setToken]=useState(''),[attempt,setAttempt]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [ready,setReady]=useState(false);
  useEffect(()=>{setReady(true);},[]);
  async function submit() {
    if(busy||!token||!info.turnstileSiteKey)return;
    setBusy(true);setError('');
    try {
      // Never attach an operator or a prior visitor's cookie to a kiosk capture.
      const response=await fetch('/subscribe',{method:'POST',credentials:'omit',cache:'no-store',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({email:email.trim(),displayName:name.trim(),consent,website,disclosure:info.disclosure,'cf-turnstile-response':token})});
      const body=await response.json() as {status?:string;detail?:string;error?:string};
      if(response.status===202&&body.status==='confirmation-required'){completed();return;}
      setError(response.status===429?'Too many signups right now. Please try again in a few minutes.':body.detail||'The request could not be completed. Please try again.');
    } catch {setError('The request result could not be confirmed. Please try again.');}
    finally {setBusy(false);setToken('');setAttempt(value=>value+1);}
  }
  if(!info.turnstileSiteKey)return <p role="alert">This kiosk needs verification configured before it can accept signups.</p>;
  return <ValidationForm className="subscribe-form standalone-form" autoComplete="off" onValidSubmit={()=>void submit()}>
    <label>Email address (required)<Field name="email" label="Email address" required validate={()=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?undefined:'Enter a valid email address.'}>
      <input type="text" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false} readOnly onFocus={event=>{event.currentTarget.readOnly=false;}} value={email} onChange={event=>setEmail(event.target.value)} disabled={!ready||busy}/>
    </Field></label>
    <label>Name (optional)<Field name="displayName" label="Name"><input type="text" autoComplete="off" readOnly onFocus={event=>{event.currentTarget.readOnly=false;}} value={name} maxLength={200} onChange={event=>setName(event.target.value)} disabled={!ready||busy}/></Field></label>
    <label className="subscribe-consent"><Field name="consent" label="Consent" required><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} disabled={!ready||busy}/></Field><span>{info.consentText} (required)</span></label>
    <div className="subscribe-honeypot" aria-hidden="true"><label>Leave this field empty<input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={event=>setWebsite(event.target.value)}/></label></div>
    <SignupChallenge key={attempt} siteKey={info.turnstileSiteKey} onToken={setToken}/>
    {error?<p role="alert" className="inline-error">{error}</p>:null}
    <button className="primary-action" type="submit" disabled={!ready||busy||!token}>{busy?'Submitting…':'Request confirmation'}</button>
  </ValidationForm>;
}

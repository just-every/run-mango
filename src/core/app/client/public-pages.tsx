import { safeReturnTo } from '@/vendor/base/operator-auth/policy.mjs';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { BodyText } from '@/core/features/site/BodyText';
import { StandaloneFrame } from './ui/standalone-frame';
export function SignInPage() {
  const search = new URLSearchParams(useLocation().searchStr);
  const returnTo = safeReturnTo(search.get('returnTo'), '/setup');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [local, setLocal] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setHydrated(true);
    const controller = new AbortController();
    fetch('/auth/environment', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Environment unavailable'); return response.json(); })
      .then(value => {
        if (value && typeof value === 'object' && 'local' in value && typeof value.local === 'boolean') setLocal(value.local);
      }).catch(() => {});
    return () => controller.abort();
  }, []);
  const guidance = local === null ? 'Determining the sign-in environment. Reload this page if it does not finish.' : local ? 'Open the development outbox to check your link.' : 'Check the mail settings in the operations guide.';
  async function submit(event: FormEvent<HTMLFormElement>) {
    if (!hydrated) return;
    event.preventDefault();
    if (busy) return;
    const email = new FormData(event.currentTarget).get('email');
    setBusy(true); setNotice(''); setFailed(false);
    try {
      const response = await fetch('/auth/magic-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, returnTo }) });
      setFailed(!response.ok);
      setNotice(response.ok ? 'If this address has access, a sign-in link is on its way. Open it and press Confirm.' : response.status === 429 ? 'Too many requests. Try again later.' : 'Sign-in mail is unavailable.');
    } catch { setFailed(true); setNotice('Could not request a sign-in link.'); } finally { setBusy(false); }
  }
  const reason = search.get('reason');
  const sessionEnded = reason === 'session-ended';
  return (
    <StandaloneFrame
      className="signin-page"
      home
      card={{ w: 480, h: 520, seed: 53, children: (
        <section className="message-card signin-card" aria-labelledby="signin-title">
          <p className="eyebrow">Operator access</p>
          <h1 id="signin-title" className="standalone-title">
            {sessionEnded ? 'Your session has ended.' : 'Sign in to Mango'}
          </h1>
          <p><BodyText text={sessionEnded ? 'Sign in again to continue.' : 'Use your operator email address to receive a one-time sign-in link.'} /></p>
          <form className="signin-form standalone-form" method="post" action="/auth/magic-link" onSubmit={submit}>
            <input type="hidden" name="returnTo" value={returnTo} />
            <label htmlFor="operator-email">Email address</label>
            <input id="operator-email" type="email" name="email" autoComplete="email" required disabled={busy} />
            <button className="primary-action" type="submit" disabled={busy}>{busy ? 'Requesting link…' : 'Email sign-in link'}</button>
          </form>
          {notice && <p className={failed ? 'signin-notice signin-error inline-error' : 'signin-notice action-notice'} role={failed ? 'alert' : 'status'}><BodyText text={failed ? `${notice} ${guidance}` : notice} /></p>}
          {local && <p className="standalone-note"><a href="/__dev/outbox">Open the development outbox</a>{' '}<BodyText text="to read your local sign-in mail." /></p>}
        </section>
      ) }}
      after={<Link className="secondary-link standalone-back" to="/">Back to the home page</Link>}
    />
  );
}

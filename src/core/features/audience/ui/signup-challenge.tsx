import { useEffect, useRef, useState } from 'react';

type Turnstile = { render(element: HTMLElement, options: Record<string, unknown>): string; remove(id: string): void };

export function SignupChallenge({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let widget: string | undefined;
    let disposed = false;
    const api = () => (window as Window & { turnstile?: Turnstile }).turnstile;
    const fail = () => { onToken(''); setFailed(true); };
    const render = () => {
      if (disposed || !container.current || widget !== undefined) return;
      try {
        widget = api()?.render(container.current, {sitekey:siteKey, action:'newsletter-signup', callback:onToken,
          'expired-callback':()=>onToken(''), 'error-callback':fail});
        if (widget === undefined) fail();
      } catch { fail(); }
    };
    let script = document.querySelector<HTMLScriptElement>('script[data-signup-turnstile]');
    if (!script) {
      script = document.createElement('script'); script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async=true; script.dataset.signupTurnstile='true';
      document.head.appendChild(script);
    }
    script.addEventListener('load', render); script.addEventListener('error', fail);
    if (api()) render();
    return () => {
      disposed=true;script.removeEventListener('load',render);script.removeEventListener('error',fail);
      if (widget !== undefined) api()?.remove(widget);
    };
  }, [siteKey, onToken]);
  return <><div ref={container} data-sitekey={siteKey} data-action="newsletter-signup" />{failed ? <p className="inline-error" role="alert">Verification is unavailable. Reload the form to try again.</p> : null}</>;
}

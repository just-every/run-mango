import { useEffect, useState } from 'react';
import { sitePaths } from './links';
import { SiteLink } from './SiteLink';

/** True once the browser reports an open operator session. The server renders the signed-out link; docs read no session. */
function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/auth/environment', { signal: controller.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error' })
      .then(response => response.ok ? response.json() : undefined)
      .then(value => { if (value && typeof value === 'object' && 'signedIn' in value && value.signedIn === true) setSignedIn(true); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return signedIn;
}

/** The public frame's one way into the operator side: Sign in, or the app itself while a session is open. */
export function OperatorLink({ signIn, openApp }: { signIn: string; openApp: string }) {
  return useSignedIn() ? <a href="/app">{openApp}</a> : <SiteLink to={sitePaths.signIn}>{signIn}</SiteLink>;
}
